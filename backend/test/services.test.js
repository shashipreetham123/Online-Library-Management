const test = require("node:test")
const assert = require("node:assert/strict")
const { ObjectId } = require("mongodb")

const { addBook, updateBook } = require("../services/book")
const { deleteReserve } = require("../services/borrow")
const { tracker } = require("../services/tracker")
const Request = require("../models/Request")
const libraryRouter = require("../routes/library.routes")

function equalValue(left, right) {
    if (left instanceof ObjectId && right instanceof ObjectId) {
        return left.equals(right)
    }
    return left === right
}

function matches(document, filter) {
    return Object.entries(filter).every(([key, expected]) => {
        const actual = document[key]
        if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !(expected instanceof Date)) {
            if (expected.$gt !== undefined) return actual > expected.$gt
            if (expected.$lt !== undefined) return actual < expected.$lt
            if (expected.$lte !== undefined) return actual <= expected.$lte
        }
        return equalValue(actual, expected)
    })
}

function cursor(records) {
    let values = [...records]
    return {
        sort(sortBy) {
            const [key, direction] = Object.entries(sortBy)[0]
            values.sort((a, b) => (a[key] > b[key] ? 1 : -1) * direction)
            return this
        },
        limit(count) {
            values = values.slice(0, count)
            return this
        },
        async toArray() {
            return [...values]
        }
    }
}

function memoryDb(seed = {}) {
    const data = Object.fromEntries(
        ["Books", "Borrows", "Reserves", "Requests", "History", "users"].map((name) => [name, [...(seed[name] || [])]])
    )

    return {
        data,
        collection(name) {
            const records = data[name]
            return {
                async findOne(filter) {
                    return records.find((record) => matches(record, filter)) || null
                },
                find(filter = {}) {
                    return cursor(records.filter((record) => matches(record, filter)))
                },
                async insertOne(record) {
                    const stored = { ...record, _id: record._id || new ObjectId() }
                    records.push(stored)
                    return { insertedId: stored._id }
                },
                async deleteOne(filter) {
                    const index = records.findIndex((record) => matches(record, filter))
                    if (index < 0) return { deletedCount: 0 }
                    records.splice(index, 1)
                    return { deletedCount: 1 }
                },
                async updateOne(filter, update) {
                    const record = records.find((item) => matches(item, filter))
                    if (!record) return { modifiedCount: 0 }
                    if (update.$inc) {
                        for (const [key, value] of Object.entries(update.$inc)) record[key] += value
                    }
                    if (update.$set) Object.assign(record, update.$set)
                    return { modifiedCount: 1 }
                }
            }
        }
    }
}

const validBook = {
    title: "A Book",
    author: "An Author",
    publishedYear: 2024,
    rating: 4,
    coverImage: "cover.png",
    category: "General",
    totalCopies: 2,
    availableCopies: 2
}

test("book creation rejects invalid inventory", async () => {
    const db = memoryDb()
    await assert.rejects(
        addBook(db, { ...validBook, totalCopies: 1, availableCopies: 2 }),
        { message: "Available copies cannot exceed total copies", status: 400 }
    )
    await assert.rejects(
        addBook(db, { ...validBook, totalCopies: -1 }),
        { message: "Total copies must be a non-negative integer", status: 400 }
    )
})

test("book updates preserve inventory invariants", async () => {
    const id = new ObjectId()
    const db = memoryDb({ Books: [{ _id: id, ...validBook, isbn: null }] })
    await assert.rejects(
        updateBook(db, id.toString(), { totalCopies: 1 }),
        { message: "Available copies cannot exceed total copies", status: 400 }
    )
    const book = await updateBook(db, id.toString(), { availableCopies: 1 })
    assert.equal(book.availableCopies, 1)
})

test("invalid request book IDs produce a validation response instead of throwing", async () => {
    const request = new Request("student", "not-an-object-id", 7)
    const result = await request.isValid(memoryDb())
    assert.equal(result.valid, false)
    assert.equal(result.response.message, "Invalid Book ID")
})

test("cancelling a reservation allocates the restored copy to the next request", async () => {
    const bookId = new ObjectId()
    const reserveId = new ObjectId()
    const db = memoryDb({
        Books: [{ _id: bookId, ...validBook, availableCopies: 0 }],
        Reserves: [{ _id: reserveId, username: "first", bookId: bookId.toString(), timePeriod: 7, requested: new Date("2026-01-01"), code: "OLD001" }],
        Requests: [{ _id: new ObjectId(), username: "next", bookId: bookId.toString(), timePeriod: 7, requested: new Date("2026-01-02") }]
    })

    assert.equal(await deleteReserve(db, reserveId), true)
    assert.equal(db.data.Requests.length, 0)
    assert.equal(db.data.Reserves.length, 1)
    assert.equal(db.data.Reserves[0].username, "next")
    assert.equal(db.data.Books[0].availableCopies, 0)
})

test("librarian borrowing rejects and releases an expired reservation", async () => {
    const bookId = new ObjectId()
    const reserveId = new ObjectId()
    const db = memoryDb({
        Books: [{ _id: bookId, ...validBook, availableCopies: 0 }],
        Reserves: [{ _id: reserveId, username: "first", bookId: bookId.toString(), timePeriod: 7, requested: new Date("2026-01-01"), toCollect: new Date(Date.now() - 1000), code: "EXPIRED" }],
        Requests: [{ _id: new ObjectId(), username: "next", bookId: bookId.toString(), timePeriod: 7, requested: new Date("2026-01-02") }]
    })
    const handler = libraryRouter.stack.find((layer) => layer.route?.path === "/borrow").route.stack[0].handle
    const response = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this },
        json(body) { this.body = body; return this }
    }

    await handler({ body: { code: "EXPIRED" }, app: { locals: { db } } }, response)

    assert.equal(response.statusCode, 410)
    assert.equal(response.body.message, "Reservation has expired")
    assert.equal(db.data.Borrows.length, 0)
    assert.equal(db.data.Reserves[0].username, "next")
})

test("tracker calculates overdue days and fines from the configured daily rate", async () => {
    const bookId = new ObjectId()
    const borrowId = new ObjectId()
    const db = memoryDb({
        Books: [{ _id: bookId, ...validBook }],
        Borrows: [{ _id: borrowId, username: "student", bookId: bookId.toString(), due: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: "borrow" }]
    })

    await tracker(db)
    const borrow = db.data.Borrows[0]
    assert.equal(borrow.status, "overdue")
    assert.ok(borrow.daysOverdue >= 2)
    assert.equal(borrow.fine, borrow.daysOverdue * 50)
})
