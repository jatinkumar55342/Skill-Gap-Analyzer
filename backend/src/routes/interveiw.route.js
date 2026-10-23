const express = require("express")
const { authUser } = require("../middleware/auth.middleware")
const interviewController = require("../controller/interview.controller")
const upload = require("../middleware/file.middleware")

const interviewRouter = express.Router()

/** POST /api/interview — Generate interview report */
interviewRouter.post(["/", ""], authUser, upload.single("resume"), interviewController.generateInterViewReportController)

/** GET /api/interview — Get all interview reports */
interviewRouter.get(["/", ""], authUser, interviewController.getAllInterviewReportsController)

/** GET /api/interview/report/:interviewId — Get single report */
interviewRouter.get("/report/:interviewId", authUser, interviewController.getInterviewReportByIdController)

/** POST /api/interview/resume/pdf/:interviewReportId — Generate resume PDF */
interviewRouter.post("/resume/pdf/:interviewReportId", authUser, interviewController.generateResumePdfController)

module.exports = interviewRouter
