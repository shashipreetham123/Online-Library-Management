const { ObjectId } = require("mongodb")
const { today, addDays } = require("../services/date")
const { isValidTimePeriod } = require("../services/time-period")

class Borrow {
    constructor(reserve) {
        this.username = reserve.username
        this.bookId = reserve.bookId
        this.timePeriod = reserve.timePeriod
        this.requested = reserve.requested
        this.accepted = reserve.accepted
        this.toCollect = reserve.toCollect
        this.status = "borrow"
        this.code = reserve.code
        this.borrowed = today()
        this.due = addDays(today(), this.timePeriod)
    }
    async isValid(db) {
        const Books = db.collection("Books")
        const users = db.collection("users")

        if (!ObjectId.isValid(this.bookId)) {
            return {
                valid: false,
                response: { message: "Invalid Book ID", data: { bookId: this.bookId } }
            }
        }

        const user = await users.findOne({username: this.username})
        
        if( !user ) {
            return {
                valid: false,
                response: { message: "User Not Found.", data: null }
            }
        }

        const book = await Books.findOne({_id: new ObjectId(this.bookId)})

        if (!book) {
            return {
                valid: false,
                response: { message: "Invalid Book ID", data: { bookId: this.bookId } }
            }
        }

        const validTimePeriod = isValidTimePeriod(this.timePeriod)

        if (!validTimePeriod) {
            return {
                valid: false,
                response: { message: "Invalid Time Period", data: null }
            }
        }

        return {
            valid: true
        }
    }

    async create(db) {
        const borrows = db.collection("Borrows")
        const inserted = await borrows.insertOne(this)
        const deleted = await db.collection("Reserves").deleteOne({
            username: this.username,
            bookId: this.bookId,
            code: this.code
        })

        if (deleted.deletedCount === 0) {
            await borrows.deleteOne({ _id: inserted.insertedId })
            return false
        }

        return true
    }
}

module.exports = Borrow
