const { randomInt } = require("crypto")

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function createCode() {
    let code = ""

    for (let index = 0; index < 6; index += 1) {
        code += CHARACTERS[randomInt(CHARACTERS.length)]
    }

    return code
}

async function generateCode(db) {
    const reserves = db.collection("Reserves")
    const borrows = db.collection("Borrows")

    while (true) {
        const code = createCode()
        const [reserve, borrow] = await Promise.all([
            reserves.findOne({ code }),
            borrows.findOne({ code })
        ])

        if (!reserve && !borrow) {
            return code
        }
    }
}

module.exports = { generateCode }
