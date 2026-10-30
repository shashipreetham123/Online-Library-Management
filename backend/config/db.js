const { MongoClient, ServerApiVersion } = require("mongodb")

const uri = process.env.MONGODB_URI

if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables")
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
})

const dbname = process.env.DB_NAME || "library-portal"

async function connectDB() {
    try {
        await client.connect()

        // Send a ping to confirm connection
        await client.db("admin").command({ ping: 1 })

        const db = client.db(dbname)

        await db
            .collection("users")
            .createIndex(
                { username: 1 },
                { unique: true }
            );

        return db

    } catch (error) {
        console.error("MongoDB Atlas connection error:", error.message)
        throw error
    }
}

module.exports = connectDB