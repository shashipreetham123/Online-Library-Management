require("dotenv").config();

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined")
}

if (!process.env.DB_NAME) {
    throw new Error("DB_NAME is not defined")
}

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not defined")
}

if (!process.env.PORT) {
    process.env.PORT = "10000";
}