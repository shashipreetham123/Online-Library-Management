const { ObjectId } = require("mongodb")

const EVENTS = [
    "request",
    "reserve",
    "borrow",
    "return",
    "overdue",
    "delete-request",
    "delete-reserve"
]

async function addRecord(db, event, date, username, bookId) {
    if (!EVENTS.includes(event)) {
        throw new Error("Invalid history event")
    }

    const book = await db.collection("Books").findOne({
        _id: new ObjectId(bookId)
    })
    const bookTitle = book ? book.title : "Unknown book"

    const summaries = {
        request: {
            short: `requested ${bookTitle}`,
            long: `${username} requested the book \"${bookTitle}\".`
        },
        reserve: {
            short: `reserved ${bookTitle}`,
            long: `${username} reserved the book \"${bookTitle}\".`
        },
        borrow: {
            short: `borrowed ${bookTitle}`,
            long: `${username} borrowed the book \"${bookTitle}\".`
        },
        return: {
            short: `returned ${bookTitle}`,
            long: `${username} returned the book \"${bookTitle}\".`
        },
        overdue: {
            short: `${bookTitle} is overdue`,
            long: `${username}'s borrow of the book \"${bookTitle}\" is overdue.`
        },
        "delete-request": {
            short: `cancelled request for ${bookTitle}`,
            long: `${username} cancelled their request for the book \"${bookTitle}\".`
        },
        "delete-reserve": {
            short: `cancelled reservation for ${bookTitle}`,
            long: `${username} cancelled the reservation for the book \"${bookTitle}\".`
        }
    }[event]

    const record = {
        event,
        date,
        username,
        bookId,
        bookTitle,
        summaryShort: summaries.short,
        summaryLong: summaries.long
    }

    await db.collection("History").insertOne(record)

    return record
}

module.exports = { addRecord }
