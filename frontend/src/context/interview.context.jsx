import React, { createContext, useContext, useState, useCallback } from 'react'
import {
  getAllInterviewReportsApi,
  getInterviewReportByIdApi,
  generateInterviewReportApi,
  downloadResumePdfApi,
} from '../api/interview.api'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [reports, setReports] = useState([])
  const [currentReport, setCurrentReport] = useState(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  /* Fetch all interview reports for the current user */
  const fetchReports = useCallback(async () => {
    setLoadingReports(true)
    setError(null)
    try {
      const data = await getAllInterviewReportsApi()
      setReports(data.interviewReports || [])
      return data.interviewReports
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoadingReports(false)
    }
  }, [])

  /* Fetch a single report by ID */
  const fetchReportById = useCallback(async (interviewId) => {
    setError(null)
    try {
      const data = await getInterviewReportByIdApi(interviewId)
      setCurrentReport(data.interviewReport)
      return data.interviewReport
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  /* Generate a new interview report using FormData (resume, jobDescription, selfDescription) */
  const generateReport = async ({ resumeFile, jobDescription, selfDescription }) => {
    setGenerating(true)
    setError(null)
    try {
      const formData = new FormData()
      if (resumeFile) {
        formData.append('resume', resumeFile)
      }
      formData.append('jobDescription', jobDescription || '')
      if (selfDescription) {
        formData.append('selfDescription', selfDescription)
      }

      const data = await generateInterviewReportApi(formData)
      const newReport = data.interviewReport

      // Add to recent reports at the top
      setReports((prev) => [newReport, ...prev])
      setCurrentReport(newReport)

      return newReport
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setGenerating(false)
    }
  }

  /* Download ATS-optimized resume PDF */
  const downloadPdf = async (interviewReportId) => {
    setDownloading(true)
    setError(null)
    try {
      await downloadResumePdfApi(interviewReportId)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setDownloading(false)
    }
  }

  const value = {
    reports,
    currentReport,
    setCurrentReport,
    loadingReports,
    generating,
    downloading,
    error,
    setError,
    fetchReports,
    fetchReportById,
    generateReport,
    downloadPdf,
  }

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  )
}

export function useInterview() {
  const context = useContext(InterviewContext)
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider')
  }
  return context
}

export default InterviewContext
