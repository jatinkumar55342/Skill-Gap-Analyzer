// Base API URL from environment variables with fallback
const rawUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
const API_BASE = rawUrl.endsWith('/api') ? rawUrl.slice(0, -4) : rawUrl
const BASE_URL = API_BASE ? `${API_BASE}/api/interview` : '/api/interview'

function extractErrorMessage(data, status) {
  if (!data) return `Request failed (${status})`
  let msg = data.message || data.error || `Request failed (${status})`

  if (typeof msg === 'object') {
    msg = msg.message || JSON.stringify(msg)
  }

  // If the message is a stringified JSON error object from Google Gemini API
  if (typeof msg === 'string' && msg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(msg)
      if (parsed.error && parsed.error.message) {
        msg = parsed.error.message
      }
    } catch (_) {}
  }

  return msg
}

/** POST /api/interview — Generate a new interview report (FormData with resume file) */
export const generateInterviewReportApi = async (formData) => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status))
  }
  return data
}

/** GET /api/interview — Fetch all interview reports for the current user */
export const getAllInterviewReportsApi = async () => {
  const res = await fetch(BASE_URL, {
    method: 'GET',
    credentials: 'include',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status))
  }
  return data
}

/** GET /api/interview/report/:interviewId — Fetch a single report by ID */
export const getInterviewReportByIdApi = async (interviewId) => {
  const res = await fetch(`${BASE_URL}/report/${interviewId}`, {
    method: 'GET',
    credentials: 'include',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status))
  }
  return data
}

/** POST /api/interview/resume/pdf/:interviewReportId — Download ATS-optimized resume PDF */
export const downloadResumePdfApi = async (interviewReportId) => {
  const res = await fetch(`${BASE_URL}/resume/pdf/${interviewReportId}`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(errorData, res.status))
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `resume_${interviewReportId}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
