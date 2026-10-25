const { ObjectId } = require("mongodb")
const { AllowedRoles } = require("../config/constants")

function checkAuth(roles) {
    if (!Array.isArray(roles) || roles.some((role) => !AllowedRoles.includes(role))) {
        throw new Error("Invalid role configuration")
    }

    return async (req, res, next) => {
        try {
            if (!req.session.userId) {
                return res.status(401).json({ message: "You are Unauthorized" })
            }
            const user = await req.app.locals.db.collection("users").findOne({ _id: new ObjectId(req.session.userId) })
            if (!user) {
                return res.status(401).json({ message: "You are Unauthenticated" })
            }
            if (!roles.includes(user.role)) {
                return res.status(403).json({ message: "You are Unauthorized" })
            }
            req.user = user
            next()
        } catch {
            res.status(500).json({ message: "Internal Server Occured. Authentication Failed" })
        }
    }
}

module.exports = checkAuth
