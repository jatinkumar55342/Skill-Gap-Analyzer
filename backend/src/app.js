require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })
const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()

app.use(express.json())
app.use(cookieParser())

module.exports = app
