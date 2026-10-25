const express = require("express")
const argon2 = require("argon2")
const router = express.Router()
const { validation, requestValidation } = require("../middleware/validation")

router.post("/login", validation, requestValidation, async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await req.app.locals.db.collection("users").findOne({ username: username.toLowerCase().trim() })
        if (!user) {
            return res.status(404).json({ message: "User not Found. Authentication Failed", data: null })
        }
        const isValid = await argon2.verify(user.password, password)
        if (isValid) {
            req.session.userId = user._id.toString()
            return res.status(200).json({
                message: "Login Successful",
                data: { username: user.username, role: user.role }
            })
        }
        return res.status(401).json({
            message: "Username or Password is Incorrect. Authentication Failed",
            data: null
        })
    } catch {
        return res.status(500).json({
            message: "Internal Server Error. Authentication Failed",
            data: null
        })
    }
})

router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ message: "Logout failed" })
        }
        res.clearCookie("connect.sid", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        })
        res.json({ message: "Logged out successfully" })
    })
})

module.exports = router
