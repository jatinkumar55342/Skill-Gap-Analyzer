# 🎯 Skill Gap Analyser

[Live Demo](https://skill-gap-analyzer-syht.vercel.app/)

> An end-to-end, full-stack Generative AI job preparation platform. Upload your resume and target job description to get an automated skill-gap analysis, candidate match score, tailored technical and behavioral interview questions, a day-by-day preparation roadmap, and downloadable ATS-optimized resumes.

---

## 🌟 Key Features

* **🔐 Secure Authentication & Session Management**:
  * Registration and login with password hashing (`bcrypt`).
  * JWT stored in secure `httpOnly` cookies with `SameSite: lax`.
  * Token blacklisting on logout to prevent replay attacks.
  * Persistent user session recovery on refresh via `/api/auth/get-me`.

* **📄 PDF Resume Parsing & Ingestion** – Supports PDFKit standard fonts, fast generation, and caching of ATS‑optimized resumes.
  * Upload resume PDFs (up to 10MB) handled via `multer` in-memory storage.
  * Direct text extraction with `pdf-parse`.

* **🤖 AI Skill Gap & Interview Evaluation (Google Gemini)**:
  * Calculates candidate-to-job **Match Score (0–100%)**.
  * Identifies critical **Skill Gaps** categorized by severity (`High`, `Medium`, `Low`).
  * Generates targeted **Technical Questions** with interviewer intention and model answers.
  * Generates structured **Behavioral Questions** with STAR-method recommendations.
  * Outlines a step-by-step **Day-by-Day Preparation Plan** with interactive task checklists.
  * Resilient multi-model fallback (`gemini-3.8-flash` ➔ `gemini-2.5-flash-lite` ➔ `gemini-2.0-flash`) and exponential backoff retry for 100% uptime.

* **📑 ATS-Optimized Resume Export (PDF)**:
  * Generates clean, semantic ATS-friendly resume layouts.
  * Converts HTML dynamically to downloadable PDF using headless browser automation (`puppeteer`).

* **📊 Dashboard & History**:
  * Instant view of previous reports and candidate match scores.
  * Deep-linked report view with interactive tabs and checklist state tracking.

---

## 🛠️ Tech Stack

* **🖨️ PDFKit Font Support** – Directly require standard fonts to ensure bundling on Vercel and fast PDF generation.


### **Frontend**
* **Framework**: React 19 (Vite)
* **Routing**: React Router DOM v7
* **Styling**: Tailwind CSS v4
* **State Management**: React Context API (`AuthContext`, `InterviewContext`)

### **Backend**
* **Runtime**: Node.js & Express.js
* **Database**: MongoDB Atlas with Mongoose ODM
* **Security & Auth**: JSON Web Tokens (`jsonwebtoken`), `bcrypt`, `cookie-parser`
* **File Processing**: `multer`, `pdf-parse`
* **AI Engine**: Google Gemini API (`@google/genai`)
* **PDF Rendering**: `puppeteer`

---

## 📂 Project Structure

```text
skill-gap-analyser/
├── backend/
│   ├── src/
│   │   ├── controller/
│   │   │   ├── auth.controller.js          # Register, Login, Logout, GetMe
│   │   │   └── interview.controller.js     # Generate, Fetch, & Download reports
│   │   ├── db/
│   │   │   └── db.js                       # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js          # JWT & Blacklist validation
│   │   │   └── file.middleware.js          # Multer memory storage & size limit
│   │   ├── models/
│   │   │   ├── User.js                     # User schema
│   │   │   ├── blacklist.model.js          # Token blacklist schema with TTL
│   │   │   └── interveiwreport.model.js    # Interview report schema
│   │   ├── routes/
│   │   │   ├── auth.route.js               # /api/auth routes
│   │   │   └── interveiw.route.js          # /api/interview routes
│   │   ├── services/
│   │   │   └── ai.service.js               # Gemini AI prompt & Puppeteer pipeline
│   │   └── app.js                          # Express app configuration & CORS
│   ├── server.js                           # Server entrypoint
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── favicon.svg                     # Custom Skill Gap Analyser logo
    ├── src/
    │   ├── api/
    │   │   ├── auth.api.js                 # Auth endpoints fetch wrapper
    │   │   └── interview.api.js            # Interview endpoints & PDF downloader
    │   ├── context/
    │   │   ├── auth.context.jsx            # User authentication state & form bindings
    │   │   └── interview.context.jsx        # Reports state, generation, & hooks
    │   ├── pages/
    │   │   ├── home.jsx                    # Dashboard, resume upload & recent reports
    │   │   ├── interview.jsx               # Detailed report, questions, plan & PDF download
    │   │   ├── login.jsx                   # Login page
    │   │   └── register.jsx                # Registration page
    │   ├── App.jsx                         # App routes & Protected Route guards
    │   └── main.jsx                        # Root React mounting with Context Providers
    ├── index.html
    └── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
OPENAI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
dbkey=mongodb+srv://<username>:<password>@cluster0.mongodb.net/skill_gap_db
jwtkey=your_super_secret_jwt_key_here
frontendurl=http://localhost:5173
```

> [!NOTE]
> The Gemini API key can be placed in `GEMINI_API_KEY` or `OPENAI_API_KEY`. Obtain your key from [Google AI Studio](https://aistudio.google.com/).

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/skill-gap-analyser.git
cd skill-gap-analyser
```

### 2. Backend Setup
```bash
cd backend
npm install

# Install Chrome browser binary for Puppeteer PDF generation
npx puppeteer browsers install chrome

# Start backend server
node server.js
# or for live reloading:
npm run dev
```
Backend runs on `http://localhost:3000`.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Start Vite dev server
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register new user with username, email, password | ❌ |
| `POST` | `/api/auth/login` | Login with email and password (sets cookie) | ❌ |
| `GET` | `/api/auth/logout` | Clears cookie and blacklists JWT | ❌ |
| `GET` | `/api/auth/get-me` | Get current logged-in user profile | ✅ |

### Interview & Analysis (`/api/interview`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/interview/` | Upload resume & generate AI interview report | ✅ |
| `GET` | `/api/interview/` | Get list of user's past generated reports | ✅ |
| `GET` | `/api/interview/report/:interviewId` | Get detailed report by ID | ✅ |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Generate & download ATS-optimized PDF resume | ✅ |

---

## 🚀 Deployment

[Live Demo](https://skill-gap-analyzer-syht.vercel.app/)

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).

---
![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-18+-green) ![React](https://img.shields.io/badge/react-19-blue)
