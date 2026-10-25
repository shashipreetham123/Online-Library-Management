const { ObjectId } = require("mongodb")
const { processRequests } = require("./request-processor")

async function deleteRecord(db, collectionName, id, restoreCopy) {
    const collection = db.collection(collectionName)
    const record = await collection.findOne({ _id: new ObjectId(id) })

    if (!record) {
        return false
    }

    const result = await collection.deleteOne({ _id: record._id })

    if (result.deletedCount === 0) {
        return false
    }

    if (restoreCopy) {
        await db.collection("Books").updateOne(
            { _id: new ObjectId(record.bookId) },
            { $inc: { availableCopies: 1 } }
        )

        // A returned or cancelled copy may satisfy the oldest pending request.
        await processRequests(db, record.bookId)
    }

    return true
}

async function deleteBorrow(db, id) {
    return deleteRecord(db, "Borrows", id, true)
}

async function deleteReserve(db, id) {
    return deleteRecord(db, "Reserves", id, true)
}

async function deleteRequest(db, id) {
    return deleteRecord(db, "Requests", id, false)
}

module.exports = { deleteBorrow, deleteReserve, deleteRequest }
