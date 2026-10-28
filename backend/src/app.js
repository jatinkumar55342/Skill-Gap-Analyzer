require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })
const express = require("express")
const cookieParser = require("cookie-parser")
const connectDB = require("./db/db")
const app = express()

app.use(express.json())
app.use(cookieParser())

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin
  const envFrontend = (process.env.frontendurl || process.env.FRONTEND_URL || "").trim().replace(/\/$/, "")

  if (origin) {
    const cleanOrigin = origin.replace(/\/$/, "")
    // Allow if matches configured frontendurl, localhost, or any vercel.app preview domain
    if (
      !envFrontend ||
      cleanOrigin === envFrontend ||
      cleanOrigin.includes("localhost") ||
      cleanOrigin.endsWith(".vercel.app")
    ) {
      res.header("Access-Control-Allow-Origin", origin)
    } else {
      res.header("Access-Control-Allow-Origin", envFrontend)
    }
  }

  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }))

// Routes
app.use(["/api/auth", "/auth"], require("./routes/auth.route"))
app.use(["/api/interview", "/interview"], require("./routes/interveiw.route"))

// Global error handling middleware
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "The uploaded resume PDF is too large. Maximum size allowed is 10MB."
    })
  }

  const status = err.status || err.statusCode || 500
  return res.status(status).json({
    message: err.message || "An unexpected error occurred on the server."
  })
})

module.exports = app
