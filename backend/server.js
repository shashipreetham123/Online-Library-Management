require("./config/env")
const express = require("express")
const cors = require("cors")
const session = require("express-session")
const { MongoStore } = require("connect-mongo")
const connectDB = require("./config/db")
const checkAuth = require("./middleware/auth")
const { TRACKER_TIME_INTERVAL } = require("./config/constants")
const { tracker } = require("./services/tracker")
const authRoutes = require("./routes/auth.routes")
const adminRoutes = require("./routes/admin.routes")
const studentRoutes = require("./routes/student.routes")
const libraryRoutes = require("./routes/library.routes")

const app = express()
const PORT = process.env.PORT || 10000
const isProduction = process.env.NODE_ENV === "production"

if (isProduction) {
    app.set("trust proxy", 1)
}

const ClientUrls = (process.env.CLIENT_URLS || "http://localhost:5173,http://localhost:5174").split(",").map(url => url.trim())

app.use(cors({ origin: ClientUrls, credentials: true }))
app.use(express.json())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: "connect.sid",
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.DB_NAME,
        ttl: 60 * 60
    }),
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 1000 * 60 * 60
    }
}))

app.use("/api/auth", authRoutes)
app.use("/api/admin", checkAuth(["admin"]), adminRoutes)
app.use("/api/student", checkAuth(["student"]), studentRoutes)
app.use("/api/library", checkAuth(["library"]), libraryRoutes)

app.get("/api/books/metadata", async (req, res) => {
    try {
        const metadata = await req.app.locals.db.collection("Books").aggregate([
            { $group: { _id: { $toLower: { $ifNull: ["$category", "uncategorized"] } }, count: { $sum: 1 } } }
        ]).toArray()
        const categories = metadata.reduce((result, { _id, count }) => {
            result[_id] = count
            return result
        }, {})
        return res.status(200).json({
            totalBooks: metadata.reduce((total, { count }) => total + count, 0),
            categories
        })
    } catch {
        return res.status(500).json({ message: "Internal Server Error. Unable to Retrieve Book Metadata", data: null })
    }
})

app.get("/", (req, res) => res.send("Authentication Server is Running"))

async function startServer() {
    try {
        const db = await connectDB()
        console.log("MongoDB Connected Successfully")
        app.locals.db = db
        app.listen(PORT, () => {
            console.log(`Server Started at http://localhost:${PORT}/`)
            tracker(db).catch((error) => console.error("Tracker failed", error))
            setInterval(() => {
                tracker(db).catch((error) => console.error("Tracker failed", error))
            }, TRACKER_TIME_INTERVAL)
        })
    } catch (error) {
        console.error(error)
        console.log("Failed to Start Server")
        process.exit(1)
    }
}

startServer()
