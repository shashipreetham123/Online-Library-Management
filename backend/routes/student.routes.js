const express = require("express")
const { ObjectId } = require("mongodb")
const Request = require("../models/Request")
const { processRequests } = require("../services/request-processor")
const { deleteReserve } = require("../services/borrow")
const { addRecord } = require("../services/history")
const { searchBooks } = require("../services/search")
const {
    meHandler,
    getBookQueryHandler,
    getBookByIdHandler,
    changePasswordHandler,
    populateBook,
    calculateOverdue
} = require("../middleware/shared-handlers")

const router = express.Router()

router.get("/me", meHandler("student"))
router.get("/book", getBookQueryHandler)
router.get("/book/:id", getBookByIdHandler)

router.post("/book/:id/rate", async (req, res) => {
    try {
        const { id } = req.params
        const { rating } = req.body
        const numRating = Number(rating)

        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ message: "Rating must be a number between 1 and 5", data: null })
        }

        const db = req.app.locals.db
        let filter
        if (ObjectId.isValid(id)) {
            filter = { _id: new ObjectId(id) }
        } else {
            filter = { isbn: String(id) }
        }

        const book = await db.collection("Books").findOne(filter)
        if (!book) {
            return res.status(404).json({ message: "Book not found", data: null })
        }

        const currentRating = typeof book.rating === "number" ? book.rating : 0
        const currentCount = typeof book.ratingsCount === "number" ? book.ratingsCount : 0
        const newCount = currentCount + 1
        const newRating = Number(((currentRating * currentCount + numRating) / newCount).toFixed(1))

        await db.collection("Books").updateOne(
            { _id: book._id },
            { $set: { rating: newRating, ratingsCount: newCount } }
        )

        const updatedBook = await db.collection("Books").findOne({ _id: book._id })
        return res.status(200).json({
            message: "Rating submitted successfully",
            data: updatedBook,
            book: updatedBook
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Rate Book", data: null })
    }
})

router.get("/book/:bookId/status", async (req, res) => {
    try {
        const { bookId } = req.params
        const username = req.user.username
        const db = req.app.locals.db

        let resolvedBookId = String(bookId).trim()
        if (!ObjectId.isValid(resolvedBookId)) {
            const bookDoc = await db.collection("Books").findOne({ isbn: resolvedBookId })
            if (bookDoc) resolvedBookId = bookDoc._id.toString()
        }

        const [request, reserve, borrow] = await Promise.all([
            db.collection("Requests").findOne({ username, bookId: resolvedBookId }),
            db.collection("Reserves").findOne({ username, bookId: resolvedBookId }),
            db.collection("Borrows").findOne({ username, bookId: resolvedBookId })
        ])

        let estimatedDays = null
        if (request) {
            const activeBorrows = await db.collection("Borrows")
                .find({ bookId: resolvedBookId })
                .sort({ due: 1 })
                .toArray()

            const queuePosition = await db.collection("Requests").countDocuments({
                bookId: resolvedBookId,
                requested: { $lt: request.requested }
            })

            if (activeBorrows.length > 0) {
                const targetBorrow = activeBorrows[queuePosition % activeBorrows.length]
                const diffTime = new Date(targetBorrow.due).getTime() - Date.now()
                estimatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
            } else {
                estimatedDays = 2
            }
        }

        return res.status(200).json({
            message: "Book status retrieved successfully",
            data: {
                bookId: resolvedBookId,
                isRequested: Boolean(request),
                isOnReserve: Boolean(reserve),
                isBorrowed: Boolean(borrow),
                estimatedDays,
                request: request || null,
                reserve: reserve || null,
                borrow: borrow || null
            }
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to check book status", data: null })
    }
})

router.post("/request", async (req, res) => {
    try {
        const { bookId } = req.body
        const timeperiod = req.body.timePeriod !== undefined ? req.body.timePeriod : req.body.timeperiod
        const request = new Request(req.user.username, bookId, timeperiod)
        const db = req.app.locals.db
        const validity = await request.isValid(db)

        if (!validity.valid) return res.status(400).json(validity.response)

        const requests = db.collection("Requests")
        const existingRequest = await requests.findOne({ username: request.username, bookId: request.bookId })
        if (existingRequest) {
            return res.status(409).json({ message: "A request for this book already exists", data: null })
        }

        await requests.insertOne(request)
        await addRecord(db, "request", request.requested, request.username, request.bookId)
        const createdReserves = await processRequests(db, request.bookId)
        const reserve = createdReserves.find((r) => r.username === request.username && r.bookId === request.bookId)

        if (reserve) {
            return res.status(201).json({ message: "Book reserved successfully", data: reserve })
        }
        return res.status(201).json({
            message: "Book request created successfully and is awaiting availability",
            data: request
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Create Request", data: null })
    }
})

router.delete("/request", async (req, res) => {
    try {
        const { bookId } = req.body
        const result = await req.app.locals.db.collection("Requests").deleteOne({
            username: req.user.username,
            bookId
        })
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Request not found", data: null })
        }
        await addRecord(req.app.locals.db, "delete-request", new Date(), req.user.username, bookId)
        return res.status(200).json({ message: "Request deleted successfully", data: null })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Delete Request", data: null })
    }
})

router.delete("/reserve", async (req, res) => {
    try {
        const { bookId } = req.body
        const db = req.app.locals.db
        const reserve = await db.collection("Reserves").findOne({ username: req.user.username, bookId })
        if (!reserve) {
            return res.status(404).json({ message: "Reservation not found", data: null })
        }
        const deleted = await deleteReserve(db, reserve._id)
        if (!deleted) {
            return res.status(409).json({ message: "Reservation could not be deleted", data: null })
        }
        await addRecord(db, "delete-reserve", new Date(), reserve.username, reserve.bookId)
        return res.status(200).json({ message: "Reservation deleted successfully", data: null })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Delete Reservation", data: null })
    }
})

router.get("/history", async (req, res) => {
    try {
        const data = await req.app.locals.db.collection("History")
            .find({ username: req.user.username })
            .sort({ date: -1 })
            .toArray()
        return res.status(200).json({ message: "History retrieved successfully", data })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Retrieve History", data: null })
    }
})

router.get("/overdue/total", async (req, res) => {
    try {
        const [result] = await req.app.locals.db.collection("Borrows").aggregate([
            { $match: { username: req.user.username } },
            { $group: { _id: null, totalFine: { $sum: { $ifNull: ["$fine", 0] } } } }
        ]).toArray()
        return res.status(200).json({
            message: "Total overdue amount retrieved successfully",
            data: { totalFine: result ? result.totalFine : 0 }
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Retrieve Total Overdue Amount", data: null })
    }
})

router.get("/borrowed", async (req, res) => {
    try {
        const db = req.app.locals.db
        const borrows = await db.collection("Borrows").find({ username: req.user.username }).toArray()
        const data = await Promise.all(borrows.map((borrow) => populateBook(db, borrow)))
        return res.status(200).json({ message: "Borrowed books retrieved successfully", data })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Retrieve Borrowed Books", data: null })
    }
})

router.get("/search", async (req, res) => {
    try {
        const result = await searchBooks(req.app.locals.db, req.query, { includeOnHold: false })
        const books = result && result.books !== undefined ? result.books : result
        const total = result && result.total !== undefined ? result.total : (Array.isArray(books) ? books.length : 0)
        return res.status(200).json({
            message: "Books retrieved successfully",
            data: books,
            total,
            limit: req.query.limit ? Number(req.query.limit) : books.length,
            offset: req.query.offset ? Number(req.query.offset) : 0
        })
    } catch (error) {
        if (error.status === 400) return res.status(400).json({ message: error.message, data: null })
        return res.status(500).json({ message: "Internal Server Error. Unable to Search Books", data: null })
    }
})

router.get("/library", async (req, res) => {
    try {
        const db = req.app.locals.db
        const username = req.user.username
        const [borrowList, reserveList, requestList] = await Promise.all([
            db.collection("Borrows").find({ username }).toArray(),
            db.collection("Reserves").find({ username }).toArray(),
            db.collection("Requests").find({ username }).toArray()
        ])
        const [borrowed, reserves, requests] = await Promise.all([
            Promise.all(borrowList.map((b) => populateBook(db, b))),
            Promise.all(reserveList.map((r) => populateBook(db, r))),
            Promise.all(requestList.map((rq) => populateBook(db, rq)))
        ])
        return res.status(200).json({
            message: "Student library retrieved successfully",
            data: { borrowed, reserves, requests }
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to retrieve student library", data: null })
    }
})

router.get("/overdues", async (req, res) => {
    try {
        const db = req.app.locals.db
        const now = new Date()
        const borrows = await db.collection("Borrows").find({
            username: req.user.username,
            $or: [{ status: "overdue" }, { fine: { $gt: 0 } }, { due: { $lt: now } }]
        }).toArray()

        const data = await Promise.all(borrows.map(async (borrow) => {
            const { daysOverdue, fine } = calculateOverdue(borrow, now)
            const populated = await populateBook(db, borrow)
            return { ...populated, daysOverdue, fine }
        }))
        return res.status(200).json({ message: "Overdue books retrieved successfully", data })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to retrieve overdues", data: null })
    }
})

router.put("/change-password", changePasswordHandler)

module.exports = router
