const { ObjectId } = require("mongodb")
const { today, addDays } = require("../services/date")
const { isValidTimePeriod } = require("../services/time-period")

class Reserve {
    constructor(request, code) {
        this.username = request.username
        this.bookId = request.bookId
        this.timePeriod = request.timePeriod
        this.requested = request.requested
        this.accepted = today()
        this.toCollect = addDays(this.accepted, 1)
        this.status = "reserved"
        this.code = code
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
        const result = await db.collection("Books").updateOne(
            {
                _id: new ObjectId(this.bookId),
                availableCopies: { $gt: 0 }
            },
            {
                $inc: { availableCopies: -1 }
            }
        )


        if (result.modifiedCount === 0) return false

        const deleted = await db.collection("Requests").deleteOne({
            username: this.username,
            bookId: this.bookId
        })

        if (deleted.deletedCount === 1) {
            return true
        }

        await db.collection("Books").updateOne(
            { _id: new ObjectId(this.bookId) },
            { $inc: { availableCopies: 1 } }
        )

        return false
    }

}

module.exports = Reserve
