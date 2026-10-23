require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })
const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(["/api/auth", "/auth"], require("./routes/auth.route"))
app.use(["/api/interview", "/interview"], require("./routes/interveiw.route"))

module.exports = app
