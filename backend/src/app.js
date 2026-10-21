require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })
const express = require("express")
const app = express()

app.use(express.json())

module.exports = app
