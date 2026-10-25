const AllowedRoles = ["admin", "student", "library"]

const MIN_TIME_PERIOD = 2

const MAX_TIME_PERIOD = 14

const TRACKER_TIME_INTERVAL = 24 * 60 * 60 * 1000

const FINE_PER_DAY = 50

const VALID_BOOK_ENTRIES = [
    "title",
    "author",
    "isbn",
    "publishedYear",
    "rating",
    "ratingsCount",
    "coverImage",
    "category",
    "totalCopies",
    "availableCopies"
]

module.exports = { AllowedRoles, MIN_TIME_PERIOD, MAX_TIME_PERIOD, TRACKER_TIME_INTERVAL, FINE_PER_DAY, VALID_BOOK_ENTRIES }