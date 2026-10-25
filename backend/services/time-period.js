const { MIN_TIME_PERIOD, MAX_TIME_PERIOD } = require("../config/constants");

function isValidTimePeriod(timePeriod) {
    return (timePeriod >= MIN_TIME_PERIOD && timePeriod <= MAX_TIME_PERIOD)
}

module.exports = { isValidTimePeriod }