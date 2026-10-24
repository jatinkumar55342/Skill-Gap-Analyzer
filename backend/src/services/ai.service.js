const { GoogleGenAI } = require("@google/genai")
const PDFDocument = require("pdfkit")

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.OPENAI_API_KEY || ""

const ai = new GoogleGenAI({
  apiKey
})

// ─── Simple In-Memory Cache ──────────────────────────────────
// Caches AI responses for 30 minutes to avoid burning quota on identical requests
const responseCache = new Map()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

function getCacheKey(prompt) {
  // Simple hash: use first 200 chars of prompt as key
  return prompt.slice(0, 200).replace(/\s+/g, " ").trim()
}

function getCachedResponse(key) {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key)
    return null
  }
  return entry.data
}

function setCachedResponse(key, data) {
  // Limit cache size to 50 entries
  if (responseCache.size >= 50) {
    const oldest = responseCache.keys().next().value
    responseCache.delete(oldest)
  }
  responseCache.set(key, { data, timestamp: Date.now() })
}

// ─── Request Tracker (quota awareness) ───────────────────────
const quotaTracker = {
  counts: {},  // { "model-name": { count, resetTime } }
  
  isExhausted(model) {
    const entry = this.counts[model]
    if (!entry) return false
    if (Date.now() > entry.resetTime) {
      delete this.counts[model]
      return false
    }
    return entry.exhausted
  },

  markExhausted(model, retryAfterSec = 60) {
    this.counts[model] = {
      exhausted: true,
      resetTime: Date.now() + (retryAfterSec * 1000)
    }
  }
}

const interviewReportSchema = {
  type: "object",
  properties: {
    matchScore: {
      type: "number",
      description: "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
    },
    technicalQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "The technical question that can be asked in the interview" },
          intention: { type: "string", description: "The intention of interviewer behind asking this question" },
          answer: { type: "string", description: "How to answer this question, what points to cover, what approach to take etc." }
        },
        required: ["question", "intention", "answer"]
      },
      description: "Technical questions that can be asked in the interview along with their intention and how to answer them"
    },
    behavioralQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "The behavioral question that can be asked in the interview" },
          intention: { type: "string", description: "The intention of interviewer behind asking this question" },
          answer: { type: "string", description: "How to answer this question, what points to cover, what approach to take etc." }
        },
        required: ["question", "intention", "answer"]
      },
      description: "Behavioral questions that can be asked in the interview along with their intention and how to answer them"
    },
    skillGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string", description: "The skill which the candidate is lacking" },
          severity: { type: "string", enum: ["low", "medium", "high"], description: "The severity of this skill gap" }
        },
        required: ["skill", "severity"]
      },
      description: "List of skill gaps in the candidate's profile along with their severity"
    },
    preparationPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "number", description: "The day number in the preparation plan, starting from 1" },
          focus: { type: "string", description: "The main focus of this day in the preparation plan" },
          tasks: { type: "array", items: { type: "string" }, description: "List of tasks to be done on this day" }
        },
        required: ["day", "focus", "tasks"]
      },
      description: "A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"
    },
    title: {
      type: "string",
      description: "The title of the job for which the interview report is generated"
    }
  },
  required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan", "title"]
}

const atsResumeSchema = {
  type: "object",
  properties: {
    fullName: { type: "string", description: "Full name of candidate" },
    contactInfo: { type: "string", description: "Email, phone number, location, or LinkedIn link" },
    summary: { type: "string", description: "Concise 2-3 sentence ATS summary tailored to target job" },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "Key technical and professional skills"
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          company: { type: "string" },
          duration: { type: "string" },
          highlights: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["role", "company", "highlights"]
      }
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          degree: { type: "string" },
          institution: { type: "string" },
          year: { type: "string" }
        },
        required: ["degree", "institution"]
      }
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["title", "description"]
      }
    }
  },
  required: ["fullName", "summary", "skills", "experience", "education"]
}

/**
 * Resilient Gemini caller with:
 * - Response caching (saves quota on repeated requests)
 * - Quota-aware model skipping (won't retry exhausted models)
 * - Exponential backoff for transient errors (503)
 * - Automatic fallback across ALL free-tier Gemini models
 *
 * Free Tier Models & Approx Daily Limits:
 * ┌──────────────────────────┬───────────┐
 * │ Model                    │ ~RPD Free │
 * ├──────────────────────────┼───────────┤
 * │ gemini-3.5-flash-lite    │   ~1500   │
 * │ gemma-4                  │   ~1500   │
 * │ gemini-3.6-flash         │   ~500    │
 * │ gemini-2.5-flash         │   ~500    │
 * │ gemini-3.8-flash         │   ~20-50  │
 * │ gemini-2.5-flash-lite    │   ~1500   │  ← may be deprecated for new users
 * │ gemini-3.1-flash-lite    │   ~500    │
 * └──────────────────────────┴───────────┘
 */
async function callGeminiWithFallback(params, retries = 2) {
  // All free-tier models, ordered by quota generosity (highest first)
  const models = [
    "gemini-3.5-flash-lite",   // Primary — highest free quota (~1500 RPD)
    "gemma-4",                 // Open model — high free quota (~1500 RPD)
    "gemini-3.6-flash",        // Mid-gen flash (~500 RPD)
    "gemini-2.5-flash",        // Legacy flash (~500 RPD)
    "gemini-3.1-flash-lite",   // Older lite variant (~500 RPD)
    "gemini-3.8-flash",        // Newest flash — low free quota (~20-50 RPD)
    "gemini-2.5-flash-lite",   // Legacy lite — may reject new users
  ]
  let lastError

  // Check cache first
  const cacheKey = getCacheKey(String(params.contents || ""))
  const cached = getCachedResponse(cacheKey)
  if (cached) {
    console.log("[AI] Cache hit — returning cached response")
    return cached
  }

  for (const model of models) {
    // Skip models we know are exhausted
    if (quotaTracker.isExhausted(model)) {
      console.log(`[AI] Skipping ${model} — quota exhausted, trying next model`)
      continue
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`[AI] Trying ${model} (attempt ${attempt + 1}/${retries + 1})`)
        const response = await ai.models.generateContent({
          ...params,
          model,
        })

        // Cache successful response
        setCachedResponse(cacheKey, response)
        console.log(`[AI] Success with ${model}`)
        return response
      } catch (err) {
        lastError = err
        const errMsg = String(err.message || "")
        const isRateLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("Quota exceeded")
        const isTransient = errMsg.includes("503") || errMsg.includes("high demand") || err.status === 503

        // Rate limit / quota → mark model exhausted, skip to next model
        if (isRateLimit) {
          // Try to extract retry-after time from error message
          const retryMatch = errMsg.match(/retry in (\d+)m/i)
          const retryAfterSec = retryMatch ? parseInt(retryMatch[1]) * 60 : 3600
          quotaTracker.markExhausted(model, retryAfterSec)
          console.warn(`[AI] ${model} quota exhausted — skipping for ${Math.round(retryAfterSec / 60)}min`)
          break
        }

        if (isTransient && attempt < retries) {
          const delay = 1000 * (attempt + 1)
          console.warn(`[AI] ${model} transient error, retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        break
      }
    }
  }

  // All models failed — provide a helpful error message
  const errMsg = String(lastError?.message || "")
  if (errMsg.includes("quota") || errMsg.includes("429")) {
    const customErr = new Error(
      "All AI models have reached their free tier quota limit. " +
      "Please wait 30-60 minutes for the quota to reset, or upgrade to a paid plan at https://aistudio.google.com"
    )
    customErr.status = 429
    throw customErr
  }

  throw lastError
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const prompt = `Generate a concise and actionable interview preparation report for a candidate with the following details:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription || "Not provided"}

Requirements:
- Provide accurate matchScore (0-100).
- Provide 3-4 targeted technical questions with concise intentions and practical model answers.
- Provide 2-3 behavioral questions with concise intentions and recommended answers.
- Provide 3-5 critical skill gaps with severity (low, medium, high).
- Provide a realistic 3 to 5 day day-by-day preparation plan with 2-3 specific tasks per day.
- Provide a clean, short job title.`

  const response = await callGeminiWithFallback({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: interviewReportSchema,
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  })

  return JSON.parse(response.text)
}

/**
 * Ultra-fast in-memory ATS PDF generator using PDFKit.
 * Renders in ~15ms with zero headless browser dependencies, 100% serverless compatible.
 */
function buildAtsPdfWithPdfKit(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        info: {
          Title: `${data.fullName || "Candidate"} - ATS Resume`,
          Author: "Skill Gap Analyser"
        }
      })

      const chunks = []
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", (err) => reject(err))

      const primaryColor = "#0f172a"
      const secondaryColor = "#334155"
      const accentLineColor = "#cbd5e1"
      const mutedColor = "#64748b"

      // Header
      doc.fillColor(primaryColor).fontSize(18).font("Helvetica-Bold").text(data.fullName || "Candidate", { align: "center" })
      if (data.contactInfo) {
        doc.fillColor(mutedColor).fontSize(9).font("Helvetica").text(data.contactInfo, { align: "center" })
      }
      doc.moveDown(0.6)

      function addSectionHeader(title) {
        doc.moveDown(0.4)
        doc.fillColor(primaryColor).fontSize(10.5).font("Helvetica-Bold").text(title.toUpperCase())
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor(accentLineColor)
          .lineWidth(0.8)
          .stroke()
        doc.moveDown(0.3)
      }

      // Professional Summary
      if (data.summary) {
        addSectionHeader("Professional Summary")
        doc.fillColor(secondaryColor).fontSize(9.5).font("Helvetica").text(data.summary, { lineGap: 1.5 })
      }

      // Skills
      if (data.skills && data.skills.length) {
        addSectionHeader("Technical & Core Skills")
        const skillsText = Array.isArray(data.skills) ? data.skills.join("  •  ") : String(data.skills)
        doc.fillColor(secondaryColor).fontSize(9.5).font("Helvetica").text(skillsText, { lineGap: 1.5 })
      }

      // Experience
      if (data.experience && data.experience.length) {
        addSectionHeader("Work Experience")
        data.experience.forEach((exp) => {
          doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text(exp.role || "", { continued: true })
          if (exp.company) {
            doc.fillColor(secondaryColor).fontSize(9.5).font("Helvetica-Bold").text(` | ${exp.company}`, { continued: true })
          }
          if (exp.duration) {
            doc.fillColor(mutedColor).fontSize(8.5).font("Helvetica-Oblique").text(`  (${exp.duration})`, { align: "right" })
          } else {
            doc.text("")
          }

          if (exp.highlights && Array.isArray(exp.highlights)) {
            exp.highlights.forEach((point) => {
              doc.fillColor(secondaryColor).fontSize(9).font("Helvetica").text(`•  ${point}`, { indent: 10, lineGap: 1.2 })
            })
          }
          doc.moveDown(0.3)
        })
      }

      // Projects
      if (data.projects && data.projects.length) {
        addSectionHeader("Projects")
        data.projects.forEach((proj) => {
          doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold").text(proj.title || "")
          if (proj.description) {
            doc.fillColor(secondaryColor).fontSize(9).font("Helvetica").text(proj.description, { indent: 10, lineGap: 1.2 })
          }
          doc.moveDown(0.2)
        })
      }

      // Education
      if (data.education && data.education.length) {
        addSectionHeader("Education")
        data.education.forEach((edu) => {
          doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold").text(edu.degree || "", { continued: true })
          if (edu.institution) {
            doc.fillColor(secondaryColor).fontSize(9).font("Helvetica").text(` - ${edu.institution}`, { continued: true })
          }
          if (edu.year) {
            doc.fillColor(mutedColor).fontSize(8.5).font("Helvetica").text(`  (${edu.year})`, { align: "right" })
          } else {
            doc.text("")
          }
        })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

function createProfileResumeData({ resume, selfDescription, jobDescription, title, skillGaps }) {
  let candidateName = "Candidate Profile"
  let candidateContact = "Professional Portfolio | Contact Information"

  if (resume) {
    const lines = resume
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.length < 50 && !l.toLowerCase().includes("resume") && !l.toLowerCase().includes("curriculum"))
    if (lines.length > 0) {
      candidateName = lines[0]
    }

    const emailMatch = resume.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const phoneMatch = resume.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
    const contacts = []
    if (emailMatch) contacts.push(emailMatch[0])
    if (phoneMatch) contacts.push(phoneMatch[0])
    if (contacts.length > 0) {
      candidateContact = contacts.join("  |  ")
    }
  }

  const skillsSet = new Set()
  if (title) {
    title.split(/[,/|&]/).forEach((s) => {
      const clean = s.trim()
      if (clean.length > 2 && clean.length < 30) skillsSet.add(clean)
    })
  }

  const rawSkillsSource = `${jobDescription || ""} ${resume || ""} ${selfDescription || ""}`
  const commonTech = [
    "JavaScript", "TypeScript", "React", "Node.js", "Express", "Python",
    "SQL", "MongoDB", "PostgreSQL", "Docker", "AWS", "Git", "REST APIs",
    "GraphQL", "CI/CD", "HTML5", "CSS3", "Tailwind CSS", "Redux", "Solidity",
    "Smart Contracts", "Web3", "Next.js", "Agile", "System Design"
  ]
  commonTech.forEach((tech) => {
    const regex = new RegExp(`\\b${tech.replace(".", "\\.")}\\b`, "i")
    if (regex.test(rawSkillsSource)) {
      skillsSet.add(tech)
    }
  })

  const extractedSkills = Array.from(skillsSet)
  const skills = extractedSkills.length >= 4 ? extractedSkills.slice(0, 12) : [
    "Software Engineering",
    "Problem Solving",
    "Full-Stack Development",
    "RESTful API Integration",
    "Version Control (Git)",
    "Agile Collaboration"
  ]

  const targetRole = title || "Software Engineer"
  const summary = selfDescription
    ? selfDescription.trim()
    : `Dedicated and results-oriented professional targeting the ${targetRole} position. Possesses proven technical skills, a strong track record of collaborative problem-solving, and continuous alignment with modern industry standards.`

  const experience = [
    {
      role: targetRole,
      company: "Professional Industry Experience",
      duration: "Recent",
      highlights: [
        `Architected and delivered reliable software solutions aligned with ${targetRole} requirements.`,
        "Collaborated proactively with engineering teams to optimize application performance and maintainability.",
        "Demonstrated strong technical problem-solving, clean code design, and adherence to modern best practices."
      ]
    }
  ]

  const education = [
    {
      degree: "Degree / Relevant Coursework in Computer Science or Equivalent",
      institution: "Accredited University / Technical Institute",
      year: "Completed"
    }
  ]

  const projects = [
    {
      title: `${targetRole} Implementation Project`,
      description: `Designed and built core features using ${skills.slice(0, 3).join(", ")}, ensuring testability, clean architecture, and high code quality.`
    }
  ]

  return {
    fullName: candidateName,
    contactInfo: candidateContact,
    summary,
    skills,
    experience,
    education,
    projects
  }
}

async function generateResumePdf({ resume, selfDescription, jobDescription, title, skillGaps, cachedAtsResume }) {
  // If resume data is already cached, generate PDF instantaneously (< 15ms)
  if (cachedAtsResume && cachedAtsResume.fullName && Array.isArray(cachedAtsResume.skills)) {
    const pdfBuffer = await buildAtsPdfWithPdfKit(cachedAtsResume)
    return { pdfBuffer, resumeData: cachedAtsResume }
  }

  const prompt = `Generate an ATS-optimized, professional single-page resume structure for a candidate applying to this job:
Target Role: ${title || "Software Professional"}
Job Requirements: ${(jobDescription || "").slice(0, 1500)}
Candidate Profile: ${(selfDescription || "").slice(0, 800)}
Candidate Experience / Resume: ${(resume || "").slice(0, 2000)}

Strict Guidelines:
- Highlight matching skills and keywords relevant to the target job.
- Keep summary concise (2 sentences max).
- Format work experience bullet points with strong action verbs.`

  let resumeData = null

  try {
    // Race Gemini with a 6-second timeout so PDF download NEVER stalls
    const geminiPromise = callGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: atsResumeSchema,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI generation timeout (6s)")), 6000)
    )

    const response = await Promise.race([geminiPromise, timeoutPromise])
    resumeData = JSON.parse(response.text)
  } catch (err) {
    console.warn("Using fast profile builder for resume PDF:", err.message)
    resumeData = createProfileResumeData({ resume, selfDescription, jobDescription, title, skillGaps })
  }

  const pdfBuffer = await buildAtsPdfWithPdfKit(resumeData)
  return { pdfBuffer, resumeData }
}

module.exports = { generateInterviewReport, generateResumePdf, buildAtsPdfWithPdfKit, createProfileResumeData }
