require("./config/env")

const argon2 = require("argon2")
const { MongoClient } = require("mongodb")

const { AllowedRoles } = require("./config/constants")
const User = require("./models/User")

const [usernameArg, passwordArg, roleArg] = process.argv.slice(2)

const username = (usernameArg || process.env.SEED_USERNAME || "admin").trim().toLowerCase()
const password = passwordArg || process.env.SEED_PASSWORD || "admin123"
const role = (roleArg || process.env.SEED_ROLE || "admin").trim().toLowerCase()

async function seedUser() {
    if (!username || !password) {
        throw new Error("Username and password are required")
    }

    if (!AllowedRoles.includes(role)) {
        throw new Error(`Invalid role. Allowed roles: ${AllowedRoles.join(", ")}`)
    }

    const client = new MongoClient(process.env.MONGODB_URI)

    try {
        await client.connect()

        const users = client.db(process.env.DB_NAME).collection("users")
        await users.createIndex({ username: 1 }, { unique: true })

        const existingUser = await users.findOne({ username })

        if (existingUser) {
            console.log(`User \"${username}\" already exists; no changes made.`)
            return
        }

        const hashedPassword = await argon2.hash(password)
        const user = new User(username, hashedPassword, role)

        await users.insertOne(user)
        console.log(`Created ${role} user \"${username}\".`)
    } finally {
        await client.close()
    }
}

seedUser().catch((error) => {
    console.error(`Failed to seed user: ${error.message}`)
    process.exitCode = 1
})
