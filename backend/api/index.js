require("dotenv").config()
const app = require("../src/app")
const connectDB = require("../src/db/db")

connectDB()

module.exports = app
