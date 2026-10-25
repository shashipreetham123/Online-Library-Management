const { ObjectId } = require("mongodb")
const { VALID_BOOK_ENTRIES } = require("../config/constants")

const CREATE_BOOK_ENTRIES = VALID_BOOK_ENTRIES.filter(
    (entry) => entry !== "ratingsCount"
)

const REQUIRED_BOOK_ENTRIES = CREATE_BOOK_ENTRIES.filter(
    (entry) => entry !== "isbn"
)

function badRequest(message) {
    const error = new Error(message)
    error.status = 400
    return error
}

function validateInventory(entries) {
    const { totalCopies, availableCopies } = entries

    if (!Number.isInteger(totalCopies) || totalCopies < 0) {
        throw badRequest("Total copies must be a non-negative integer")
    }

    if (!Number.isInteger(availableCopies) || availableCopies < 0) {
        throw badRequest("Available copies must be a non-negative integer")
    }

    if (availableCopies > totalCopies) {
        throw badRequest("Available copies cannot exceed total copies")
    }
}

async function getBook(db, filters) {
    const { isbn, _id } = filters

    if (
        (isbn === undefined && _id === undefined) ||
        (isbn !== undefined && _id !== undefined) ||
        isbn === null ||
        _id === null
    ) {
        throw badRequest("Provide exactly one non-null filter: isbn or _id")
    }

    let filter

    if (_id !== undefined) {
        if (!ObjectId.isValid(_id)) {
            throw badRequest("Invalid Book ID")
        }

        filter = { _id: new ObjectId(_id) }
    } else {
        if (isbn === "" || String(isbn).toLowerCase() === "null") {
            throw badRequest("A null ISBN cannot be used to get a book")
        }

        filter = { isbn: String(isbn) }
    }

    return db.collection("Books").findOne(filter)
}

async function updateBook(db, id, entries) {
    if (!ObjectId.isValid(id)) {
        throw badRequest("Invalid Book ID")
    }

    if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
        throw badRequest("Entries must be a book properties object")
    }

    const unknownEntries = Object.keys(entries).filter(
        (entry) => !VALID_BOOK_ENTRIES.includes(entry)
    )

    if (unknownEntries.length > 0) {
        throw badRequest(`Unknown book entries: ${unknownEntries.join(", ")}`)
    }

    if (Object.keys(entries).length === 0) {
        throw badRequest("Provide at least one book entry to update")
    }

    const books = db.collection("Books")
    const _id = new ObjectId(id)
    const book = await books.findOne({ _id })

    if (!book) {
        return null
    }

    if (entries.isbn !== undefined && book.isbn !== null) {
        throw badRequest("ISBN can only be updated when the current ISBN is null")
    }

    const updatedEntries = { ...entries }

    if (updatedEntries.isbn !== undefined && updatedEntries.isbn !== null) {
        updatedEntries.isbn = String(updatedEntries.isbn)
    }

    validateInventory({ ...book, ...updatedEntries })

    await books.updateOne({ _id }, { $set: updatedEntries })

    return books.findOne({ _id })
}

async function addBook(db, entries) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
        throw badRequest("Entries must be a book properties object")
    }

    const unknownEntries = Object.keys(entries).filter(
        (entry) => !CREATE_BOOK_ENTRIES.includes(entry)
    )

    if (unknownEntries.length > 0) {
        throw badRequest(`Unknown book entries: ${unknownEntries.join(", ")}`)
    }

    const missingEntries = REQUIRED_BOOK_ENTRIES.filter(
        (entry) => entries[entry] === undefined || entries[entry] === null
    )

    if (missingEntries.length > 0) {
        throw badRequest(`Missing required book entries: ${missingEntries.join(", ")}`)
    }

    const book = {
        ...entries,
        isbn: entries.isbn === undefined || entries.isbn === null ? null : String(entries.isbn),
        ratingsCount: 1
    }
    validateInventory(book)
    const result = await db.collection("Books").insertOne(book)

    return { _id: result.insertedId, ...book }
}

module.exports = { getBook, updateBook, addBook }
