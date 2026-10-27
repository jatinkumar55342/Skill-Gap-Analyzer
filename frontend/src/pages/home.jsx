import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth.context'
import { useInterview } from '../context/interview.context'

const Home = () => {
  const { user, logout } = useAuth()
  const { reports, fetchReports, generateReport, loadingReports, generating } = useInterview()
  const navigate = useNavigate()

  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [selfDescription, setSelfDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [loadingPhase, setLoadingPhase] = useState('Analyzing skills and profile...')

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useEffect(() => {
    if (!generating) {
      setLoadingPhase('Analyzing skills and profile...')
      return
    }

    const phases = [
      'Reading and parsing profile details...',
      'Comparing skills with target job requirements...',
      'Crafting targeted technical & behavioral questions...',
      'Building personalized day-by-day study roadmap...',
      'Finalizing report, almost ready...'
    ]

    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % phases.length
      setLoadingPhase(phases[idx])
    }, 3000)

    return () => clearInterval(interval)
  }, [generating])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setFormError('Please upload a valid PDF resume.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setFormError('Resume PDF is too large (maximum allowed size is 10MB).')
        return
      }
      setFormError('')
      setResumeFile(file)
    }
  }

  const handleRemoveFile = () => {
    setResumeFile(null)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) {
      setFormError('Please enter the target Job Description.')
      return
    }
    if (!resumeFile && !selfDescription.trim()) {
      setFormError('Please upload your resume PDF or provide a candidate self-description.')
      return
    }

    setFormError('')
    try {
      const newReport = await generateReport({
        resumeFile,
        jobDescription,
        selfDescription,
      })
      if (newReport?._id) {
        navigate(`/interview/${newReport._id}`)
      }
    } catch (err) {
      setFormError(err.message || 'Failed to generate interview report. Please try again.')
    }
  }

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
    if (score >= 50) return 'text-amber-400 bg-amber-950/60 border-amber-800'
    return 'text-rose-400 bg-rose-950/60 border-rose-800'
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" strokeDasharray="3 2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 7l4 8H8l4-8z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-zinc-100 text-lg">Skill Gap Analyser</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-zinc-200">
                {user?.name || user?.username || 'User'}
              </p>
              <p className="text-xs text-zinc-400">{user?.email || ''}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form to Generate Analysis (7 cols) */}
          <section className="lg:col-span-7">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-100">Generate Interview Preparation</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Upload your resume and the target job description to get a comprehensive skill-gap report, tailored interview questions, and a customized study plan.
                </p>
              </div>

              {formError && (
                <div className="mb-6 rounded-lg border border-rose-800/80 bg-rose-950/40 p-4 text-sm text-rose-300 flex items-start justify-between">
                  <span>{formError}</span>
                  <button onClick={() => setFormError('')} className="text-rose-400 hover:text-rose-200 font-bold ml-2">×</button>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Resume Upload */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Resume <span className="text-zinc-500 font-normal">(PDF format)</span>
                  </label>

                  {!resumeFile ? (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-xl cursor-pointer bg-zinc-800/40 hover:bg-zinc-800/70 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-zinc-300">
                          <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">PDF file up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-blue-600/20 p-2 text-blue-400">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200 truncate max-w-xs sm:max-w-md">{resumeFile.name}</p>
                          <p className="text-xs text-zinc-400">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-950/40 transition"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <label htmlFor="jd" className="block text-sm font-medium text-zinc-300 mb-2">
                    Job Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="jd"
                    rows="5"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description, requirements, tech stack, and responsibilities here..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm leading-relaxed"
                  />
                </div>

                {/* Candidate Self Description */}
                <div>
                  <label htmlFor="self" className="block text-sm font-medium text-zinc-300 mb-2">
                    Candidate Profile / Self Description <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="self"
                    rows="3"
                    value={selfDescription}
                    onChange={(e) => setSelfDescription(e.target.value)}
                    placeholder="Briefly highlight your years of experience, current projects, core strengths, or anything not on your resume..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 px-6 py-3 font-semibold text-white transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>{loadingPhase}</span>
                    </>
                  ) : (
                    <span>Generate Interview Report</span>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Right Column: Recent Reports (Video Chapter 05:11:01) (5 cols) */}
          <section className="lg:col-span-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl sticky top-24">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Recent Reports</h2>
                  <p className="text-xs text-zinc-400">Your past interview preparation roadmaps</p>
                </div>
                <button
                  onClick={fetchReports}
                  disabled={loadingReports}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                  title="Refresh reports"
                >
                  {loadingReports ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {loadingReports && reports.length === 0 ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg bg-zinc-800/60 p-4 h-20" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40">
                  <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-300">No reports generated yet</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Fill out the form on the left to generate your first AI skill analysis and interview guide!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                  {reports.map((report) => (
                    <Link
                      key={report._id}
                      to={`/interview/${report._id}`}
                      className="group block rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 p-4 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition truncate">
                            {report.title || 'Interview Preparation Report'}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-1">
                            {report.createdAt
                              ? new Date(report.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recent'}
                          </p>
                        </div>

                        {typeof report.matchScore === 'number' && (
                          <div
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${getScoreColor(
                              report.matchScore
                            )}`}
                          >
                            {report.matchScore}% match
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Home
