const { ObjectId } = require("mongodb")
const { today } = require("../services/date")
const { isValidTimePeriod } = require("../services/time-period")

class Request {
    constructor(username, bookId, timePeriod) {
        this.username = username
        this.bookId = bookId
        this.timePeriod = timePeriod
        this.requested = today()
        this.status = "request"
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

        if (book.onHold === true) {
            return {
                valid: false,
                response: { message: "Book is currently on hold", data: null }
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
}

module.exports = Request
