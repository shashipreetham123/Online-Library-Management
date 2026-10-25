const { FINE_PER_DAY } = require("../config/constants")
const { deleteReserve } = require("./borrow")
const { addRecord } = require("./history")

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

async function tracker(db) {
    const now = new Date()
    const expiredReserves = await db.collection("Reserves").find({
        toCollect: { $lte: now }
    }).toArray()

    for (const reserve of expiredReserves) {
        const deleted = await deleteReserve(db, reserve._id)

        if (deleted) {
            await addRecord(db, "delete-reserve", now, reserve.username, reserve.bookId)
        }
    }

    const overdueBorrows = await db.collection("Borrows").find({
        due: { $lt: now }
    }).toArray()

    for (const borrow of overdueBorrows) {
        const daysOverdue = Math.max(
            1,
            Math.ceil((now.getTime() - new Date(borrow.due).getTime()) / MILLISECONDS_PER_DAY)
        )
        const isNewlyOverdue = borrow.status !== "overdue"
        const update = await db.collection("Borrows").updateOne(
            { _id: borrow._id },
            {
                $set: {
                    status: "overdue",
                    daysOverdue,
                    fine: FINE_PER_DAY * daysOverdue
                }
            }
        )

        if (isNewlyOverdue && update.modifiedCount === 1) {
            await addRecord(db, "overdue", now, borrow.username, borrow.bookId)
        }
    }
}

module.exports = { tracker }
