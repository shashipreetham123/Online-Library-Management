const argon2 = require("argon2")
const { ObjectId } = require("mongodb")
const { getBook } = require("../services/book")
const { FINE_PER_DAY } = require("../config/constants")

// Shared /me handler for all roles
const meHandler = (roleLabel) => (req, res) => {
    return res.status(200).json({
        message: `Authenticated ${roleLabel} retrieved successfully`,
        data: {
            userId: req.user._id,
            username: req.user.username,
            role: req.user.role
        }
    })
}

// Shared /book (query) handler for admin and student
const getBookQueryHandler = async (req, res) => {
    try {
        let filters = { ...req.query }
        if (filters.bookId) {
            filters._id = filters.bookId
            delete filters.bookId
        }
        if (filters.id) {
            filters._id = filters.id
            delete filters.id
        }
        if (filters.query) {
            const q = String(filters.query).trim()
            filters = (ObjectId.isValid(q) && q.length === 24) ? { _id: q } : { isbn: q }
        }
        const book = await getBook(req.app.locals.db, filters)
        if (!book) {
            return res.status(404).json({ message: "Book not found", data: null })
        }
        return res.status(200).json({ message: "Book retrieved successfully", data: book })
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({ message: error.message, data: null })
        }
        return res.status(500).json({
            message: "Internal Server Error. Unable to Retrieve Book",
            data: null
        })
    }
}

// Shared /book/:id handler for admin, student, and library
const getBookByIdHandler = async (req, res) => {
    try {
        const { id } = req.params
        const filters = (ObjectId.isValid(id) && id.length === 24) ? { _id: id } : { isbn: id }
        const book = await getBook(req.app.locals.db, filters)
        console.log(book)
        if (!book) {
            return res.status(404).json({ message: "Book not found", data: null })
        }
        return res.status(200).json({ message: "Book retrieved successfully", data: book })
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({ message: error.message, data: null })
        }
        return res.status(500).json({
            message: "Internal Server Error. Unable to Retrieve Book",
            data: null
        })
    }
}

// Shared /users handler for admin and library
const getUsersHandler = async (req, res) => {
    try {
        const users = await req.app.locals.db.collection("users")
            .find({}, { projection: { password: 0 } })
            .sort({ username: 1 })
            .toArray()
        return res.status(200).json({
            message: "Users retrieved successfully",
            data: users
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error. Unable to retrieve users",
            data: null
        })
    }
}

// Shared /history paginated handler for admin and library
const getPaginatedHistoryHandler = async (req, res) => {
    try {
        const db = req.app.locals.db
        const filter = {}
        if (req.query.username && req.query.username !== "all") {
            filter.username = { $regex: req.query.username.trim(), $options: "i" }
        }
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10)
        const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)
        const totalCount = await db.collection("History").countDocuments(filter)
        const history = await db.collection("History")
            .find(filter)
            .sort({ date: -1 })
            .skip(offset)
            .limit(limit)
            .toArray()

        return res.status(200).json({
            message: "History retrieved successfully",
            data: history,
            pagination: {
                totalCount,
                limit,
                offset,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(totalCount / limit) || 1
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error. Unable to retrieve history",
            data: null
        })
    }
}

// Shared /change-password handler for all roles
const changePasswordHandler = async (req, res) => {
    try {
        const oldPassword = req.body.oldPassword || req.body.oldPass || req.body.currentPassword
        const { newPassword } = req.body

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                message: "Old password and new password are required",
                data: null
            })
        }
        if (String(newPassword).length < 4) {
            return res.status(400).json({
                message: "New password must be at least 4 characters long",
                data: null
            })
        }

        const db = req.app.locals.db
        const users = db.collection("users")
        const user = await users.findOne({ _id: new ObjectId(req.user._id) })
        if (!user) {
            return res.status(404).json({ message: "User not found", data: null })
        }

        const isValid = await argon2.verify(user.password, oldPassword)
        if (!isValid) {
            return res.status(400).json({ message: "Old password does not match", data: null })
        }

        const hashedPassword = await argon2.hash(newPassword)
        await users.updateOne({ _id: user._id }, { $set: { password: hashedPassword } })

        return res.status(200).json({
            message: "Password changed successfully",
            data: null
        })
    } catch (err) {
        return res.status(500).json({
            message: "Internal Server Error. Failed to change password",
            data: null
        })
    }
}

// Helper to populate book data onto an item
const populateBook = async (db, item) => {
    let book = null
    if (ObjectId.isValid(item.bookId)) {
        book = await db.collection("Books").findOne({ _id: new ObjectId(item.bookId) })
    }
    return { ...item, book }
}

// Helper to calculate overdue days and fine
const calculateOverdue = (borrow, now = new Date()) => {
    const daysOverdue = borrow.daysOverdue || Math.max(1, Math.ceil((now.getTime() - new Date(borrow.due).getTime()) / (24 * 60 * 60 * 1000)))
    const fine = borrow.fine || (daysOverdue * FINE_PER_DAY)
    return { daysOverdue, fine }
}

module.exports = {
    meHandler,
    getBookQueryHandler,
    getBookByIdHandler,
    getUsersHandler,
    getPaginatedHistoryHandler,
    changePasswordHandler,
    populateBook,
    calculateOverdue
}
