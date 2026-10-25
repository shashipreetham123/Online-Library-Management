const express = require("express")
const Borrow = require("../models/Borrow")
const { deleteBorrow, deleteReserve } = require("../services/borrow")
const { addRecord } = require("../services/history")
const { searchBooks } = require("../services/search")
const {
    meHandler,
    getBookByIdHandler,
    getUsersHandler,
    getPaginatedHistoryHandler,
    changePasswordHandler,
    populateBook,
    calculateOverdue
} = require("../middleware/shared-handlers")

const router = express.Router()

router.get("/me", meHandler("library user"))
router.get("/book/:id", getBookByIdHandler)

router.get("/search", async (req, res) => {
    try {
        const result = await searchBooks(req.app.locals.db, req.query, { includeOnHold: true })
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

router.post("/borrow", async (req, res) => {
    try {
        const { code } = req.body
        const db = req.app.locals.db
        const reserve = await db.collection("Reserves").findOne({ code })
        if (!reserve) {
            return res.status(404).json({ message: "Reservation not found", data: null })
        }

        if (new Date(reserve.toCollect) <= new Date()) {
            const deleted = await deleteReserve(db, reserve._id)
            if (deleted) {
                await addRecord(db, "delete-reserve", new Date(), reserve.username, reserve.bookId)
            }
            return res.status(deleted ? 410 : 409).json({
                message: deleted ? "Reservation has expired" : "Reservation could not be cancelled",
                data: null
            })
        }

        const borrow = new Borrow(reserve)
        const created = await borrow.create(db)
        if (!created) {
            return res.status(409).json({ message: "Reservation could not be converted to a borrow", data: null })
        }

        await addRecord(db, "borrow", borrow.borrowed, borrow.username, borrow.bookId)
        await addRecord(db, "borrow", borrow.borrowed, req.user.username, borrow.bookId)

        return res.status(201).json({ message: "Book borrowed successfully", data: borrow })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Borrow Book", data: null })
    }
})

router.delete("/borrow", async (req, res) => {
    try {
        const { code } = req.body
        const db = req.app.locals.db
        const borrow = await db.collection("Borrows").findOne({ code })
        if (!borrow) {
            return res.status(404).json({ message: "Borrow not found", data: null })
        }
        const deleted = await deleteBorrow(db, borrow._id)
        if (!deleted) {
            return res.status(409).json({ message: "Borrow could not be deleted", data: null })
        }
        const returnedAt = new Date()
        await addRecord(db, "return", returnedAt, borrow.username, borrow.bookId)
        await addRecord(db, "return", returnedAt, req.user.username, borrow.bookId)
        return res.status(200).json({ message: "Borrow deleted successfully", data: null })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Delete Borrow", data: null })
    }
})

router.delete("/reserve", async (req, res) => {
    try {
        const { code } = req.body
        const db = req.app.locals.db
        const reserve = await db.collection("Reserves").findOne({ code })
        if (!reserve) {
            return res.status(404).json({ message: "Reservation not found", data: null })
        }
        const deleted = await deleteReserve(db, reserve._id)
        if (!deleted) {
            return res.status(409).json({ message: "Reservation could not be deleted", data: null })
        }
        const cancelledAt = new Date()
        await addRecord(db, "delete-reserve", cancelledAt, reserve.username, reserve.bookId)
        await addRecord(db, "delete-reserve", cancelledAt, req.user.username, reserve.bookId)
        return res.status(200).json({ message: "Reservation deleted successfully", data: null })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Delete Reservation", data: null })
    }
})

router.get("/users", getUsersHandler)

router.get("/borrows", async (req, res) => {
    try {
        const db = req.app.locals.db
        const borrows = await db.collection("Borrows")
            .find({}, { projection: { code: 0 } })
            .sort({ borrowed: -1 })
            .toArray()
        const data = await Promise.all(borrows.map((b) => populateBook(db, b)))
        return res.status(200).json({ message: "Borrows retrieved successfully", data })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to retrieve borrows", data: null })
    }
})

router.get("/reserves", async (req, res) => {
    try {
        const db = req.app.locals.db
        const reserves = await db.collection("Reserves")
            .find({}, { projection: { code: 0 } })
            .sort({ accepted: -1 })
            .toArray()
        const data = await Promise.all(reserves.map((r) => populateBook(db, r)))
        return res.status(200).json({ message: "Reserves retrieved successfully", data })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to retrieve reserves", data: null })
    }
})

router.get("/overdues", async (req, res) => {
    try {
        const db = req.app.locals.db
        const now = new Date()
        const filter = {
            $or: [{ status: "overdue" }, { fine: { $gt: 0 } }, { due: { $lt: now } }]
        }
        if (req.query.username && req.query.username.trim()) {
            filter.username = { $regex: req.query.username.trim(), $options: "i" }
        }

        const borrows = await db.collection("Borrows")
            .find(filter, { projection: { code: 0 } })
            .sort({ due: 1 })
            .toArray()

        let overallTotalFine = 0
        const userTotals = {}
        const data = await Promise.all(borrows.map(async (borrow) => {
            const { daysOverdue, fine } = calculateOverdue(borrow, now)
            overallTotalFine += fine
            userTotals[borrow.username] = (userTotals[borrow.username] || 0) + fine
            const populated = await populateBook(db, borrow)
            return { ...populated, daysOverdue, fine }
        }))

        let systemGrandTotal = overallTotalFine
        if (req.query.username && req.query.username.trim()) {
            const allOverdues = await db.collection("Borrows").find({
                $or: [{ status: "overdue" }, { fine: { $gt: 0 } }, { due: { $lt: now } }]
            }).toArray()
            systemGrandTotal = allOverdues.reduce((acc, b) => acc + calculateOverdue(b, now).fine, 0)
        }

        return res.status(200).json({
            message: "Overdue borrows retrieved successfully",
            data,
            totalFine: overallTotalFine,
            systemGrandTotal,
            userTotals
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to retrieve overdues", data: null })
    }
})

router.get("/verify", async (req, res) => {
    try {
        const { code } = req.query
        if (!code) return res.status(400).json({ message: "PIN / Code is required", data: null })
        const db = req.app.locals.db
        const borrow = await db.collection("Borrows").findOne({ code: String(code).trim() })
        const reserve = await db.collection("Reserves").findOne({ code: String(code).trim() })
        if (!borrow && !reserve) {
            return res.status(404).json({ message: "No borrow or reservation found with this PIN", data: null })
        }
        const target = borrow ? { ...borrow, type: "borrow" } : { ...reserve, type: "reserve" }
        const populated = await populateBook(db, target)
        const user = await db.collection("users").findOne({ username: target.username }, { projection: { password: 0 } })
        return res.status(200).json({ message: "PIN verified successfully", data: { ...populated, user } })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to verify PIN", data: null })
    }
})

router.put("/change-password", changePasswordHandler)
router.get("/history", getPaginatedHistoryHandler)

module.exports = router
