const jwt = require("jsonwebtoken")
const Blacklist = require("../models/blacklist.model")

async function authUser(req, res, next) {
  try {
    const token = req.cookies?.token
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    const blacklisted = await Blacklist.findOne({ token })
    if (blacklisted) {
      return res.status(401).json({ message: "Token has been revoked" })
    }

    const jwtSecret = process.env.JWT_SECRET || process.env.jwtkey || "default_jwt_secret"
    const decoded = jwt.verify(token, jwtSecret)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

module.exports = { authUser }
