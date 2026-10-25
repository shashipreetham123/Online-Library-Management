class User {
    constructor(username, password, role) {
        this.username = username.toLowerCase()
        this.password = password
        this.role = role.toLowerCase()
    }
}

module.exports = User