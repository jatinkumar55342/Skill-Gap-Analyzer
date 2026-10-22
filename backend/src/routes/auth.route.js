const { Router } = require("express")
const authController = require("../controller/auth.controller")
const { authUser } = require("../middleware/auth.middleware")

const authRouter = Router()

/** POST /api/auth/register — Register a new user */
authRouter.post("/register", authController.register)

/** POST /api/auth/login — Login with email & password */
authRouter.post("/login", authController.login)

/** GET /api/auth/logout — Clear token & blacklist it */
authRouter.get("/logout", authController.logout)

/** GET /api/auth/get-me — Get current logged-in user (protected) */
authRouter.get("/get-me", authUser, authController.getme)

module.exports = authRouter
