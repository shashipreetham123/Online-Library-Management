const express = require("express")
const argon2 = require("argon2")
const { ObjectId } = require("mongodb")
const { validation, requestValidation } = require("../middleware/validation")
const { AllowedRoles } = require("../config/constants")
const User = require("../models/User")
const { searchBooks } = require("../services/search")
const { deleteRequest, deleteReserve } = require("../services/borrow")
const { addRecord } = require("../services/history")
const { updateBook, addBook } = require("../services/book")
const {
    meHandler,
    getBookQueryHandler,
    getBookByIdHandler,
    getUsersHandler,
    getPaginatedHistoryHandler,
    changePasswordHandler
} = require("../middleware/shared-handlers")

const router = express.Router()

router.get("/me", meHandler("admin"))
router.get("/book", getBookQueryHandler)
router.get("/book/:id", getBookByIdHandler)

router.post("/book", async (req, res) => {
    try {
        if (req.body._id !== undefined) {
            return res.status(400).json({ message: "Do not provide _id when creating a book", data: null })
        }
        const book = await addBook(req.app.locals.db, req.body)
        return res.status(201).json({ message: "Book created successfully", data: book })
    } catch (error) {
        if (error.status === 400) return res.status(400).json({ message: error.message, data: null })
        return res.status(500).json({ message: "Internal Server Error. Unable to Save Book", data: null })
    }
})

router.put("/book/:id", async (req, res) => {
    try {
        if (req.body._id !== undefined) {
            return res.status(400).json({ message: "Use the book ID in the URL, not the request body", data: null })
        }
        const book = await updateBook(req.app.locals.db, req.params.id, req.body)
        if (!book) return res.status(404).json({ message: "Book not found", data: null })
        return res.status(200).json({ message: "Book updated successfully", data: book })
    } catch (error) {
        if (error.status === 400) return res.status(400).json({ message: error.message, data: null })
        return res.status(500).json({ message: "Internal Server Error. Unable to Update Book", data: null })
    }
})

async function deleteBook(req, res, force) {
    try {
        const { _id } = req.body
        if (!ObjectId.isValid(_id)) {
            return res.status(400).json({ message: "Invalid Book ID", data: null })
        }
        const db = req.app.locals.db
        const books = db.collection("Books")
        const book = await books.findOne({ _id: new ObjectId(_id) })
        if (!book) {
            return res.status(404).json({ message: "Book not found", data: null })
        }

        if (!force) {
            const [activeBorrow, pendingRequest, activeReserve] = await Promise.all([
                db.collection("Borrows").findOne({ bookId: book._id.toString() }),
                db.collection("Requests").findOne({ bookId: book._id.toString() }),
                db.collection("Reserves").findOne({ bookId: book._id.toString() })
            ])
            if (activeBorrow) {
                return res.status(409).json({ message: "Book cannot be deleted while it has active borrows", data: null })
            }
            if (pendingRequest || activeReserve) {
                return res.status(409).json({ message: "Book cannot be deleted while it has active requests or reservations", data: null })
            }
        }

        const deleted = { borrows: 0, reserves: 0, requests: 0 }
        if (force) {
            const bookId = book._id.toString()
            const [borrowResult, reserveResult, requestResult] = await Promise.all([
                db.collection("Borrows").deleteMany({ bookId }),
                db.collection("Reserves").deleteMany({ bookId }),
                db.collection("Requests").deleteMany({ bookId })
            ])
            deleted.borrows = borrowResult.deletedCount
            deleted.reserves = reserveResult.deletedCount
            deleted.requests = requestResult.deletedCount
        }

        await books.deleteOne({ _id: book._id })
        return res.status(200).json({
            message: force ? "Book force deleted successfully" : "Book deleted successfully",
            data: { deleted }
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Delete Book", data: null })
    }
}

router.delete("/book", (req, res) => deleteBook(req, res, false))
router.delete("/book/force", (req, res) => deleteBook(req, res, true))

router.put("/book/o/hold", async (req, res) => {
    try {
        const { _id, release, onHold } = req.body
        if (!ObjectId.isValid(_id)) {
            return res.status(400).json({ message: "Invalid Book ID", data: null })
        }
        const db = req.app.locals.db
        const books = db.collection("Books")
        const book = await books.findOne({ _id: new ObjectId(_id) })
        if (!book) {
            return res.status(404).json({ message: "Book not found", data: null })
        }

        if (release === true || onHold === false) {
            await books.updateOne({ _id: book._id }, { $set: { onHold: false } })
            return res.status(200).json({ message: "Book hold released successfully", data: { _id: book._id, onHold: false } })
        }

        const bookId = book._id.toString()
        await books.updateOne({ _id: book._id }, { $set: { onHold: true } })

        const requests = await db.collection("Requests").find({ bookId }).toArray()
        for (const request of requests) {
            const deleted = await deleteRequest(db, request._id)
            if (deleted) await addRecord(db, "delete-request", new Date(), request.username, bookId)
        }

        const reserves = await db.collection("Reserves").find({ bookId }).toArray()
        for (const reserve of reserves) {
            const deleted = await deleteReserve(db, reserve._id)
            if (deleted) await addRecord(db, "delete-reserve", new Date(), reserve.username, bookId)
        }

        return res.status(200).json({
            message: "Book placed on hold and pending requests and reservations cancelled",
            data: { _id: book._id, onHold: true }
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Place Book on Hold", data: null })
    }
})

const releaseBookHold = async (req, res) => {
    try {
        const _id = req.body?._id || req.body?.bookId || req.query?._id || req.query?.bookId
        if (!_id || !ObjectId.isValid(_id)) {
            return res.status(400).json({ message: "Invalid Book ID", data: null })
        }
        const db = req.app.locals.db
        const books = db.collection("Books")
        const book = await books.findOne({ _id: new ObjectId(_id) })
        if (!book) {
            return res.status(404).json({ message: "Book not found", data: null })
        }
        await books.updateOne({ _id: book._id }, { $set: { onHold: false } })
        return res.status(200).json({ message: "Book hold released successfully", data: { _id: book._id, onHold: false } })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Release Book Hold", data: null })
    }
}

router.put("/book/o/release", releaseBookHold)
router.delete("/book/o/hold", releaseBookHold)

router.get("/books/o/hold", async (req, res) => {
    try {
        const data = await req.app.locals.db.collection("Books").find({ onHold: true }).toArray()
        return res.status(200).json({ message: "Books on hold retrieved successfully", data })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Retrieve Books on Hold", data: null })
    }
})

router.get("/search", async (req, res) => {
    try {
        const result = await searchBooks(req.app.locals.db, req.query)
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

router.post("/register", validation, requestValidation, async (req, res) => {
    try {
        const { username, password, role } = req.body
        if (!AllowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid Role" })
        }
        const db = req.app.locals.db
        const users = db.collection("users")
        const normalizedUsername = username.toLowerCase().trim()
        const exists = await users.findOne({ username: normalizedUsername })
        if (exists) {
            return res.status(400).json({ message: `User with Username ${normalizedUsername} Already Exists.`, data: null })
        }
        const hashedPassword = await argon2.hash(password)
        const user = new User(username, hashedPassword, role)
        await users.insertOne(user)
        return res.status(201).json({ message: "User Created Successfully", data: { id: user._id.toString(), username } })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Create User", data: null })
    }
})

router.get("/users", getUsersHandler)

async function deleteUser(req, res, force = false) {
    try {
        const { id } = req.params
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid User ID", data: null })
        }
        const db = req.app.locals.db
        const user = await db.collection("users").findOne({ _id: new ObjectId(id) })
        if (!user) {
            return res.status(404).json({ message: "User not found", data: null })
        }
        if (user.username === req.user.username) {
            return res.status(400).json({ message: "Cannot delete your own admin account", data: null })
        }

        const isForce = force || req.query.force === "true" || req.body?.force === true
        const activeBorrowCount = await db.collection("Borrows").countDocuments({ username: user.username })
        if (!isForce && activeBorrowCount > 0) {
            return res.status(409).json({
                message: `Cannot delete user "${user.username}" because they have ${activeBorrowCount} active borrow(s). Use Force Delete to remove them.`,
                data: { hasBorrows: true, borrowCount: activeBorrowCount }
            })
        }

        const deleted = { borrows: 0, reserves: 0, requests: 0 }
        if (isForce && activeBorrowCount > 0) {
            const userBorrows = await db.collection("Borrows").find({ username: user.username }).toArray()
            for (const b of userBorrows) {
                if (ObjectId.isValid(b.bookId)) {
                    await db.collection("Books").updateOne({ _id: new ObjectId(b.bookId) }, { $inc: { availableCopies: 1 } })
                }
            }
            const borrowResult = await db.collection("Borrows").deleteMany({ username: user.username })
            deleted.borrows = borrowResult.deletedCount
        }

        const userReserves = await db.collection("Reserves").find({ username: user.username }).toArray()
        for (const r of userReserves) {
            if (ObjectId.isValid(r.bookId)) {
                await db.collection("Books").updateOne({ _id: new ObjectId(r.bookId) }, { $inc: { availableCopies: 1 } })
            }
        }

        const [reserveResult, requestResult] = await Promise.all([
            db.collection("Reserves").deleteMany({ username: user.username }),
            db.collection("Requests").deleteMany({ username: user.username })
        ])
        deleted.reserves = reserveResult.deletedCount
        deleted.requests = requestResult.deletedCount

        await db.collection("users").deleteOne({ _id: user._id })
        return res.status(200).json({
            message: isForce
                ? `User "${user.username}" force deleted successfully along with all borrows, reserves, and requests`
                : `User "${user.username}" deleted successfully`,
            data: { id: user._id, username: user.username, deleted }
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to delete user", data: null })
    }
}

router.delete("/users/:id/force", (req, res) => deleteUser(req, res, true))
router.delete("/users/:id", (req, res) => deleteUser(req, res, false))
router.get("/history", getPaginatedHistoryHandler)
router.put("/change-password", changePasswordHandler)

module.exports = router
