const { ObjectId } = require("mongodb");

function badRequest(message) {
    const error = new Error(message)
    error.status = 400
    return error
}

async function searchBooks(db, filters, options = {}) {
    const { includeOnHold = true } = options
    const {
        _id,
        title,
        author,
        category,
        isbn,
        minpublishyear,
        maxpublishyear,
        minrating,
        ratingsCount,
        available,
        sort,
        offset,
        limit
    } = filters
    const filter = {}

    if (_id != undefined && _id != null) {
        filter._id = new ObjectId(_id)
    }

    if (title) {
        filter.title = { $regex: title, $options: "i" }
    }

    if (author) {
        filter.author = { $regex: author, $options: "i" }
    }

    if (category) {
        const categories = String(category)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)

        if (categories.length === 0) {
            throw badRequest("Category must contain at least one value")
        }

        filter.$expr = {
            $in: [
                { $toLower: { $ifNull: ["$category", ""] } },
                categories.map((value) => value.toLowerCase())
            ]
        }
    }

    if (isbn !== undefined) {
        filter.isbn = String(isbn)
    }

    const publishYear = {}

    if (minpublishyear !== undefined) {
        publishYear.$gte = Number(minpublishyear)
    }

    if (maxpublishyear !== undefined) {
        publishYear.$lte = Number(maxpublishyear)
    }

    if (Object.keys(publishYear).length > 0) {
        filter.publishedYear = publishYear
    }

    if (minrating !== undefined) {
        filter.rating = { $gte: Number(minrating) }
    }

    if (ratingsCount !== undefined) {
        filter.ratingsCount = { $gte: Number(ratingsCount) }
    }

    if (available !== undefined) {
        if (String(available) === "1") {
            filter.availableCopies = { $gt: 0 }
        } else if (String(available) === "0") {
            filter.availableCopies = 0
        } else {
            throw badRequest("Available must be 0 or 1")
        }
    }

    if (!includeOnHold) {
        filter.onHold = { $ne: true }
    }

    const total = await db.collection("Books").countDocuments(filter)

    const cursor = db.collection("Books").find(filter)

    if (sort) {
        const [column, direction] = String(sort).split(",")
        const sortDirection = Number(direction)

        if (!column || ![1, -1].includes(sortDirection)) {
            throw badRequest("Sort must use the format column,1 or column,-1")
        }

        cursor.sort({ [column]: sortDirection })
    }

    if (offset !== undefined) {
        const offsetNum = Number(offset)
        if (isNaN(offsetNum) || offsetNum < 0) {
            throw badRequest("Offset must be a non-negative number")
        }
        cursor.skip(offsetNum)
    }

    if (limit !== undefined) {
        const limitNum = Number(limit)
        if (isNaN(limitNum) || limitNum < 1) {
            throw badRequest("Limit must be a positive number")
        }
        cursor.limit(limitNum)
    }

    const books = await cursor.toArray()
    return { books, total }
}

module.exports = { searchBooks }
