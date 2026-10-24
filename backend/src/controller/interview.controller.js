const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interveiwreport.model")

async function generateInterViewReportController(req, res) {
  try {
    let resumeText = ""
    if (req.file && req.file.buffer) {
      const parsed = await pdfParse(req.file.buffer)
      resumeText = parsed.text || ""
    }
    const { selfDescription, jobDescription } = req.body

    const interViewReportByAi = await generateInterviewReport({
      resume: resumeText,
      selfDescription,
      jobDescription
    })

    const interviewReport = await interviewReportModel.create({
      user: req.user.id,
      resume: resumeText,
      selfDescription,
      jobDescription,
      ...interViewReportByAi
    })

    res.status(201).json({
      message: "Interview report generated successfully.",
      interviewReport
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

async function getInterviewReportByIdController(req, res) {
  try {
    const { interviewId } = req.params
    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
    if (!interviewReport) {
      return res.status(404).json({ message: "Interview report not found." })
    }
    res.status(200).json({ message: "Interview report fetched successfully.", interviewReport })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

async function getAllInterviewReportsController(req, res) {
  try {
    const interviewReports = await interviewReportModel
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({ message: "Interview reports fetched successfully.", interviewReports })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

async function generateResumePdfController(req, res) {
  try {
    const { interviewReportId } = req.params
    const interviewReport = await interviewReportModel.findById(interviewReportId)
    if (!interviewReport) {
      return res.status(404).json({ message: "Interview report not found." })
    }
    const { resume, jobDescription, selfDescription, title, skillGaps, atsResume } = interviewReport

    const { pdfBuffer, resumeData } = await generateResumePdf({
      resume,
      jobDescription,
      selfDescription,
      title,
      skillGaps,
      cachedAtsResume: atsResume
    })

    // Save generated resumeData to MongoDB cache so future downloads are instant (<15ms)
    if (!interviewReport.atsResume && resumeData) {
      interviewReport.atsResume = resumeData
      await interviewReport.save().catch((e) => console.error("Failed to cache atsResume:", e.message))
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })
    return res.send(pdfBuffer)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

module.exports = {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController
}
