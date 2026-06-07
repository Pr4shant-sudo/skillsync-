# SkillSync  🚀

**Your personalized AI-powered career coach — skill assessment, roadmap generation, job matching, mock interviews, and spaced-repetition learning in one mobile-first web app.**

🔗 **Live Demo:** [skillsync-mentor.netlify.app](https://skillsync-mentor.netlify.app)

---

## What Is SkillSync AI?

SkillSync AI is a career development platform built for students and early-career developers who want a clear, structured path from where they are now to where they want to be. Instead of generic job boards or scattered tutorials, SkillSync connects your current skills to real job opportunities, generates a personalized week-by-week learning roadmap, quizzes you on your weak spots, and coaches you through AI-powered chat and mock interviews — all inside a single mobile-first interface.

The project ships in two forms: a **prototype** (one HTML file, no server needed) that runs entirely in the browser using Puter.js for free AI and Supabase for persistence, and a **full backend** (Express + MongoDB) that handles auth, data storage, and AI routing for a production deployment.

---

## Features

### 🏠 Home Dashboard
The central hub after login. Shows your learning streak, a radar chart of your skill levels across domains, personalized weakness notifications pulled from your quiz history, a flashcard review prompt when cards are due, today's task list, and a leaderboard to compare progress with peers. Everything on this screen is derived from your actual quiz and test data — nothing is hardcoded.

### 🧪 Skill Assessment (Quiz Engine)
A category-based quiz system that tests you across skills you've declared (JavaScript, Python, DSA, System Design, etc.). Each question is multiple-choice. On completion, the engine scores you, identifies weak areas, and saves them to your profile so the flashcard and roadmap systems can prioritize them. The quiz selector lets you pick any skill category and retake tests to track improvement over time.

### 🗺️ Roadmap Generator
Paste a career goal (e.g. "Frontend Engineer at a product company") and the AI generates a week-by-week learning plan tailored to your current skill level and declared domain. Each week lists specific resources with estimated durations. You can check off nodes as you complete them — progress is saved and shown as a completion percentage on the dashboard. The roadmap screen also has a built-in AI panel where you can ask follow-up questions about any step.

### 💼 Job Matching
Matches open job listings to your skill profile and experience level, showing a compatibility ring for each role. After parsing your resume, the job cards update to reflect how well you match each posting. You can save jobs to your tracker and apply directly. The resume match banner appears automatically after a resume upload, so you always see the most relevant roles first.

### 🤖 AI Career Chat
A full conversational AI coach powered by Puter.js (prototype) or Gemini/OpenAI (backend). It greets you by name, remembers your skill profile within the session, and can answer questions about career paths, skill gaps, interview prep, salary negotiation, or anything else career-related. Chat history is saved per user.

### 📄 Resume Parser
Upload a PDF resume or paste plain text. The AI extracts your skills, detects gaps relative to your target roles, and saves the parsed result to Supabase. The detected skills can be merged back into your profile, and the gap analysis feeds directly into your roadmap and job match scores.

### 📚 Leitner Flashcard System (Spaced Repetition)
A four-box Leitner spaced-repetition engine for drilling weak topics identified by your quizzes. Cards in Box 1 appear daily, Box 2 every other day, Box 3 weekly, Box 4 fortnightly. Marking a card correct promotes it to the next box; wrong demotes it to Box 1. The tray slides up from any screen when cards are due, so review fits into natural breaks rather than requiring a dedicated session.

### 🎤 Mock Interview Simulator
Select a role and the AI generates a realistic interview session: behavioral questions, technical questions, and follow-ups based on your answers. You type your answers and receive immediate AI feedback on clarity, completeness, and what a strong answer would include. At the end you get an overall score and a summary of where you performed well vs. where you need more depth.

### 🏆 Achievements
Unlockable badges tied to real in-app milestones — completing your first roadmap node, maintaining a 7-day streak, finishing a quiz with a perfect score, saving your first job, and more. Badges display on a dedicated achievements screen and on your dashboard card.

### ⚡ Daily Coding Challenge
A fresh coding problem each day drawn from a rotating pool of DSA and programming challenges. You read the problem, write your solution in the text area, and submit for AI evaluation. The AI checks correctness, points out edge cases you missed, and suggests a cleaner approach if one exists. Completing the daily challenge counts toward streak and achievement unlocks.

### 📋 Job Application Tracker (Kanban)
A three-column Kanban board (Applied → Interviewing → Offer/Rejected) to track every application. Cards show company, role, match score, and salary. Drag cards between columns as your application status changes. Data persists locally so your pipeline is always visible without needing a separate spreadsheet.

### 📊 Progress Analytics
Charts and stats showing your quiz score history per skill, roadmap completion over time, daily active days heatmap, and job match score trend as your skills improve. Gives you a data-driven view of whether your learning is actually moving the needle on employability.

### 🖼️ Projects Feature (Preview)
A portfolio-style projects tracker where you log projects you've built, tag them with skills, and attach links. Visible as a preview UI in `projects_feature.html`. Planned for full integration in the next milestone.

---

## 📁 Repository Structure

```
skillsync/
├── frontend/
│   ├── index.html              # Full working prototype — open in browser, no server needed
│   └── projects_feature.html  # Projects feature UI preview (standalone)
│
├── backend/
│   ├── server.js              # Express + MongoDB + JWT + AI routing (full production backend)
│   ├── package.json           # Node.js dependencies
│   ├── supabase_setup.sql     # SQL to run in Supabase SQL Editor (prototype persistence)
│   └── .env.example           # Environment variable template — copy to .env
│
├── .gitignore
└── README.md
```

---

## 🧩 Prototype vs Full Backend

| | Prototype (`frontend/index.html`) | Full Backend (`backend/`) |
|---|---|---|
| **Run** | Open file in browser | `node server.js` |
| **AI** | Puter.js (free, no key) | Gemini or OpenAI (your key) |
| **Auth** | Puter auth + local hashed passwords | JWT + bcrypt |
| **Database** | Supabase (Postgres) + localStorage | MongoDB + Mongoose |
| **Install** | Nothing | `npm install` |
| **Best for** | Demo, hackathon, sharing | Production deployment |

The prototype is fully functional for demonstration. The backend exists for when you want real user accounts, persistent server-side data, and your own AI keys.

---

## ⚙️ Running the Prototype

1. Clone or download this repo.
2. Open `frontend/index.html` in any modern browser.
3. That's it. Puter.js handles AI calls; Supabase handles resume and application data.

Or just visit the live demo: [skillsync-mentor.netlify.app](https://skillsync-mentor.netlify.app)

> **Note:** The file has Supabase credentials hardcoded. The anon key is low-risk by design, but rotate it in your Supabase dashboard before sharing publicly.

---

## ⚙️ Running the Full Backend

### Prerequisites
- Node.js 18+
- MongoDB running locally or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- A [Gemini API key](https://aistudio.google.com/) or [OpenAI API key](https://platform.openai.com/)

### Setup

```bash
cd backend
npm install
cp .env.example .env
# Open .env and fill in your MONGODB_URI, JWT_SECRET, and AI key
npm run dev        # development (nodemon, auto-restart)
npm start          # production
```

### Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs — make this long and random |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `GEMINI_API_KEY` | Google Gemini key (if using Gemini) |
| `OPENAI_API_KEY` | OpenAI key (if using OpenAI) |
| `AI_PROVIDER` | `"gemini"` or `"openai"` |

### API Reference

| Method | Route | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create account (name, username, email, password) |
| `POST` | `/api/auth/login` | No | Login, returns JWT token |
| `GET` | `/api/user/profile` | ✅ | Get full user profile and stats |
| `PUT` | `/api/user/skills` | ✅ | Update skills, domains, experience |
| `PUT` | `/api/user/roadmap-node` | ✅ | Mark a roadmap node complete/incomplete |
| `PUT` | `/api/user/flashcard` | ✅ | Advance or demote a Leitner flashcard |
| `DELETE` | `/api/user/weakness` | ✅ | Remove a weakness from profile |
| `POST` | `/api/quiz/submit` | ✅ | Submit quiz results, updates score history |
| `POST` | `/api/roadmap/generate` | ✅ | AI-generates a roadmap for a career goal |
| `GET` | `/api/roadmap` | ✅ | Retrieve saved roadmap |
| `GET` | `/api/jobs/matches` | Optional | Get job matches for a skill set |
| `POST` | `/api/jobs/save` | ✅ | Save a job to profile |
| `POST` | `/api/chat` | Optional | Send a message to AI career coach |
| `GET` | `/api/chat/history` | ✅ | Retrieve chat history for user |

---

## 🗄️ Supabase Setup (Prototype)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the full contents of `backend/supabase_setup.sql`.
3. Go to **Project Settings → API**, copy your Project URL and anon key.
4. Replace the constants at the top of `frontend/index.html`:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key-here';
```

---

## 🛠️ Tech Stack

**Frontend**
- Vanilla HTML, CSS, JavaScript (zero frameworks, single file)
- [Puter.js](https://js.puter.com/v2/) — free AI and auth layer for prototype
- [Supabase JS](https://supabase.com/docs/reference/javascript) — Postgres persistence
- Syne + DM Sans (Google Fonts)

**Backend**
- [Express.js](https://expressjs.com/) — HTTP server and routing
- [Mongoose](https://mongoosejs.com/) — MongoDB ODM
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) — password hashing
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) — JWT auth
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) — Gemini SDK
- [openai](https://www.npmjs.com/package/openai) — OpenAI SDK

---

## 🔒 Security Notes

- **Never commit `.env`** — it's in `.gitignore`. Use `.env.example` as the template.
- All backend passwords are hashed with bcrypt — plaintext passwords are never saved.
- JWT tokens expire after 7 days by default.
- Row Level Security is enabled on Supabase tables.

---

## 🗺️ Planned

- [ ] Full Projects feature integration
- [ ] GitHub OAuth login
- [ ] Real job API integration (LinkedIn, Adzuna, or Jsearch)
- [ ] Mobile app wrapper (Capacitor or React Native)

---

## 👤 Author

Built as a prototype for demonstrating AI-powered career tooling. Contributions and feedback welcome.
