import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useInterview } from '../context/interview.context'

const Interview = () => {
  const { interviewId } = useParams()
  const { fetchReportById, currentReport, downloadPdf, downloading } = useInterview()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('skills') // 'skills' | 'technical' | 'behavioral' | 'plan'
  const [expandedQuestions, setExpandedQuestions] = useState({})
  const [completedTasks, setCompletedTasks] = useState({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchReportById(interviewId)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load interview report.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [interviewId, fetchReportById])

  const toggleQuestion = (idx, type) => {
    const key = `${type}-${idx}`
    setExpandedQuestions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleTask = (taskKey) => {
    setCompletedTasks((prev) => ({ ...prev, [taskKey]: !prev[taskKey] }))
  }

  const handleDownloadResume = async () => {
    try {
      await downloadPdf(interviewId)
    } catch (err) {
      alert(`Download failed: ${err.message}`)
    }
  }

  const getSeverityBadge = (severity) => {
    const sev = (severity || '').toLowerCase()
    if (sev === 'high') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
          High Severity
        </span>
      )
    }
    if (sev === 'medium') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
          Medium Severity
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
        Low Severity
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <p className="text-zinc-400 font-medium">Loading your AI interview report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mb-4">
            !
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Report Not Found</h2>
          <p className="text-sm text-zinc-400 mb-6">{error || 'Unable to retrieve this interview report.'}</p>
          <Link
            to="/home"
            className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const {
    title,
    matchScore = 0,
    skillGaps = [],
    technicalQuestions = [],
    behavioralQuestions = [],
    preparationPlan = [],
  } = report

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/home"
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>

          <button
            onClick={handleDownloadResume}
            disabled={downloading}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/60 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download ATS Resume (PDF)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Report Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Hero Section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800 mb-3">
              <span>AI Evaluation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100">{title}</h1>
            <p className="text-sm text-zinc-400 mt-2">
              Generated on {new Date(report.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Match Score Badge */}
          <div className="flex items-center gap-4 bg-zinc-800/50 border border-zinc-700/60 rounded-xl p-4 sm:p-5 shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-zinc-800"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  className={
                    matchScore >= 75
                      ? 'text-emerald-500'
                      : matchScore >= 50
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * matchScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-zinc-100">{matchScore}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Match Score</p>
              <p className="text-sm font-medium text-zinc-200 mt-0.5">
                {matchScore >= 75 ? 'Strong Candidate Fit' : matchScore >= 50 ? 'Moderate Alignment' : 'Skill Gap Focus Needed'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-zinc-800 mb-6 flex overflow-x-auto gap-2">
          {[
            { id: 'skills', label: `Skill Gaps (${skillGaps.length})` },
            { id: 'technical', label: `Technical Questions (${technicalQuestions.length})` },
            { id: 'behavioral', label: `Behavioral Questions (${behavioralQuestions.length})` },
            { id: 'plan', label: `Preparation Plan (${preparationPlan.length} Days)` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Skill Gaps */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-zinc-100">Identified Skill Gaps</h2>
              <span className="text-xs text-zinc-400">Focus on high severity areas first</span>
            </div>

            {skillGaps.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-400">
                🎉 No critical skill gaps identified! Your profile strongly matches the requirements.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skillGaps.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 transition flex items-start justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold text-zinc-200 text-base">{item.skill}</h3>
                      <p className="text-xs text-zinc-400 mt-1">Recommended to prepare before interview.</p>
                    </div>
                    {getSeverityBadge(item.severity)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Technical Questions */}
        {activeTab === 'technical' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-zinc-100">Technical Questions</h2>
              <span className="text-xs text-zinc-400">Click any question to view expected answer</span>
            </div>

            {technicalQuestions.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-400">
                No technical questions generated for this report.
              </div>
            ) : (
              technicalQuestions.map((q, idx) => {
                const isExpanded = expandedQuestions[`tech-${idx}`] !== false
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition"
                  >
                    <button
                      onClick={() => toggleQuestion(idx, 'tech')}
                      className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-zinc-800/40 transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-blue-400 border border-zinc-700">
                          Q{idx + 1}
                        </span>
                        <span className="font-semibold text-zinc-100 text-base">{q.question}</span>
                      </div>
                      <span className="text-zinc-400 text-lg">{isExpanded ? '−' : '+'}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-zinc-800/60 bg-zinc-950/40 space-y-4">
                        {q.intention && (
                          <div>
                            <p className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-1">
                              Interviewer's Intention
                            </p>
                            <p className="text-sm text-zinc-300 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg leading-relaxed">
                              {q.intention}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase tracking-wider font-bold text-emerald-400 mb-1">
                            Model Answer & Key Points
                          </p>
                          <p className="text-sm text-zinc-200 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg leading-relaxed whitespace-pre-line">
                            {q.answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 3: Behavioral Questions */}
        {activeTab === 'behavioral' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-zinc-100">Behavioral Questions</h2>
              <span className="text-xs text-zinc-400">Use the STAR method (Situation, Task, Action, Result)</span>
            </div>

            {behavioralQuestions.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-400">
                No behavioral questions generated for this report.
              </div>
            ) : (
              behavioralQuestions.map((q, idx) => {
                const isExpanded = expandedQuestions[`beh-${idx}`] !== false
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition"
                  >
                    <button
                      onClick={() => toggleQuestion(idx, 'beh')}
                      className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-zinc-800/40 transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-purple-400 border border-zinc-700">
                          Q{idx + 1}
                        </span>
                        <span className="font-semibold text-zinc-100 text-base">{q.question}</span>
                      </div>
                      <span className="text-zinc-400 text-lg">{isExpanded ? '−' : '+'}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-zinc-800/60 bg-zinc-950/40 space-y-4">
                        {q.intention && (
                          <div>
                            <p className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-1">
                              Interviewer's Intention
                            </p>
                            <p className="text-sm text-zinc-300 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg leading-relaxed">
                              {q.intention}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase tracking-wider font-bold text-purple-400 mb-1">
                            Recommended Answering Strategy
                          </p>
                          <p className="text-sm text-zinc-200 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg leading-relaxed whitespace-pre-line">
                            {q.answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 4: Preparation Plan */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-zinc-100">Day-by-Day Preparation Plan</h2>
              <span className="text-xs text-zinc-400">Track your daily readiness milestones</span>
            </div>

            {preparationPlan.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-400">
                No preparation plan available for this report.
              </div>
            ) : (
              <div className="space-y-4">
                {preparationPlan.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        Day {step.day || idx + 1}
                      </span>
                      <h3 className="font-bold text-zinc-100 text-base">{step.focus}</h3>
                    </div>

                    <ul className="space-y-2.5">
                      {(step.tasks || []).map((task, tIdx) => {
                        const taskKey = `plan-${step.day || idx}-${tIdx}`
                        const isDone = !!completedTasks[taskKey]
                        return (
                          <li
                            key={tIdx}
                            onClick={() => toggleTask(taskKey)}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer select-none ${
                              isDone
                                ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 line-through'
                                : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => {}}
                              className="mt-1 h-4 w-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm leading-relaxed">{task}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Interview
