const { ObjectId } = require("mongodb")
const Reserve = require("../models/Reserve")
const { generateCode } = require("./code")
const { addRecord } = require("./history")

async function processRequests(db, bookId) {
    const books = db.collection("Books")
    const book = await books.findOne({ _id: new ObjectId(bookId) })

    if (!book || book.onHold === true || book.availableCopies <= 0) {
        return []
    }

    const requests = await db.collection("Requests")
        .find({ bookId })
        .sort({ requested: 1 })
        .limit(book.availableCopies)
        .toArray()

    const createdReserves = []
    const reserves = db.collection("Reserves")

    for (const request of requests) {
        const code = await generateCode(db)
        const reserve = new Reserve(request, code)
        const created = await reserve.create(db)

        if (!created) {
            continue
        }

        try {
            await reserves.insertOne(reserve)
        } catch (error) {
            await db.collection("Books").updateOne(
                { _id: new ObjectId(reserve.bookId) },
                { $inc: { availableCopies: 1 } }
            )
            await db.collection("Requests").insertOne(request)
            throw error
        }
        await addRecord(
            db,
            "reserve",
            reserve.accepted,
            reserve.username,
            reserve.bookId
        )
        createdReserves.push(reserve)
    }

    return createdReserves
}

module.exports = { processRequests }
