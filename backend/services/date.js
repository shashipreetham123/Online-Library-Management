function today() {
    return new Date()
}

function addDays(date, days) {
    const d = new Date(date)

    d.setDate(d.getDate() + days)

    return d
}

module.exports = { today, addDays }