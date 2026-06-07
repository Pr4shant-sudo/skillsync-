// ══════════════════════════════════════════════════════════════
//  SkillSync AI — server.js
//  Full-Stack Express + MongoDB + AI backend
// ══════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Connection ───────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsync')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ══════════════════════════════════════════════════════════════
//  SCHEMAS & MODELS
// ══════════════════════════════════════════════════════════════

// ─── User Schema ──────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    username:   { type: String, required: true, unique: true, trim: true, lowercase: true },
    email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:   { type: String, required: true },
    skills:     { type: [String], default: [] },
    domains:    { type: [String], default: [] },
    experience: { type: String, default: 'Beginner' },
    savedJobs:  { type: [mongoose.Schema.Types.ObjectId], default: [] },
    streak:     { type: Number, default: 1 },
    lastActiveDate: { type: String, default: '' },
    quizScores: [
      {
        category:  String,
        score:     Number,
        takenAt:   { type: Date, default: Date.now },
      },
    ],
    testResults: [
      {
        skill:  String,
        score:  Number,
        date:   { type: Date, default: Date.now },
      },
    ],
    completedRoadmapNodes: { type: [String], default: [] },
    weaknesses:            { type: [String], default: [] },
    spacedRepetitionQueue: { type: [mongoose.Schema.Types.Mixed], default: [] },
    leitnerMeta:           { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// ─── Chat History Schema ──────────────────────────────────────
const chatSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sessionId: { type: String, default: '' },
  message:   { type: String, required: true },
  sender:    { type: String, enum: ['user', 'bot'], required: true },
  timestamp: { type: Date, default: Date.now },
});
const Chat = mongoose.model('Chat', chatSchema);

// ─── Roadmap Schema ───────────────────────────────────────────
const roadmapStepSchema = new mongoose.Schema({
  weekNum:   Number,
  title:     String,
  resources: [
    {
      icon:     String,
      name:     String,
      duration: String,
      nodeId:   String,
    },
  ],
});
const roadmapSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    careerGoal: { type: String, required: true },
    steps:      [roadmapStepSchema],
  },
  { timestamps: true }
);
const Roadmap = mongoose.model('Roadmap', roadmapSchema);

// ══════════════════════════════════════════════════════════════
//  AI CLIENT SETUP
// ══════════════════════════════════════════════════════════════
let geminiModel = null;
let openaiClient = null;

if (process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
  const { OpenAI } = require('openai');
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('🤖 OpenAI client ready');
} else if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  console.log('🤖 Gemini client ready');
} else {
  console.warn('⚠️  No AI API key found — AI endpoints will return simulated responses.');
}

async function callAI(systemPrompt, userMessage) {
  if (openaiClient) {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 1024,
    });
    return completion.choices[0].message.content;
  } else if (geminiModel) {
    const prompt = `${systemPrompt}\n\nUser: ${userMessage}`;
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } else {
    // Fallback simulation
    return simulateFallbackResponse(userMessage);
  }
}

function simulateFallbackResponse(text) {
  const t = text.toLowerCase();
  if (t.includes('interview'))
    return '🎤 For interviews, focus on data structures, system design, and behavioral questions using the STAR method. Practice on LeetCode daily!';
  if (t.includes('salary') || t.includes('pay'))
    return '💰 Salaries vary by role and region. Focus on building strong skills and a portfolio — that drives compensation more than anything.';
  if (t.includes('roadmap') || t.includes('learn'))
    return '📚 A solid learning path: master your core language → data structures → frameworks → system design → interview prep. Check your Roadmap tab!';
  return '🧠 Great question! Focus on consistent practice, building real projects, and applying to roles that match your growing skill set. You\'re on the right track! 💪';
}

// ══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════════
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authOptional(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    } catch { /* ignore */ }
  }
  next();
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function sanitizeUser(user) {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.password;
  return u;
}

function updateStreak(user) {
  const today = new Date().toDateString();
  if (user.lastActiveDate === today) return; // already updated today
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (user.lastActiveDate === yesterday) {
    user.streak = (user.streak || 1) + 1;
  } else if (user.lastActiveDate !== today) {
    user.streak = 1;
  }
  user.lastActiveDate = today;
}

// ══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
    if (exists) {
      if (exists.email === email.toLowerCase())
        return res.status(409).json({ error: 'Email already registered' });
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      lastActiveDate: new Date().toDateString(),
    });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
    });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    updateStreak(user);
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// ══════════════════════════════════════════════════════════════
//  USER ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/user/profile
app.get('/api/user/profile', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// PUT /api/user/skills  — update skills/domains/experience after setup screen
app.put('/api/user/skills', authRequired, async (req, res) => {
  try {
    const { skills, domains, experience } = req.body;
    const update = {};
    if (Array.isArray(skills))  update.skills  = skills;
    if (Array.isArray(domains)) update.domains = domains;
    if (experience)             update.experience = experience;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    return res.json({ user });
  } catch (err) {
    console.error('Skills update error:', err);
    return res.status(500).json({ error: 'Server error updating skills' });
  }
});

// PUT /api/user/roadmap-node — toggle a roadmap node completion
app.put('/api/user/roadmap-node', authRequired, async (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'nodeId required' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const idx = user.completedRoadmapNodes.indexOf(nodeId);
    if (idx >= 0) {
      user.completedRoadmapNodes.splice(idx, 1);
    } else {
      user.completedRoadmapNodes.push(nodeId);
    }
    await user.save();
    return res.json({ completedRoadmapNodes: user.completedRoadmapNodes });
  } catch (err) {
    console.error('Roadmap node error:', err);
    return res.status(500).json({ error: 'Server error toggling roadmap node' });
  }
});

// PUT /api/user/flashcard  — save spaced-repetition card
app.put('/api/user/flashcard', authRequired, async (req, res) => {
  try {
    const { card, action, leitnerMeta } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'add' && card) {
      const already = user.spacedRepetitionQueue.some((c) => c.question === card.question);
      if (!already) user.spacedRepetitionQueue.push(card);
    } else if (action === 'remove' && card) {
      user.spacedRepetitionQueue = user.spacedRepetitionQueue.filter((c) => c.id !== card.id);
    }
    if (leitnerMeta) user.leitnerMeta = { ...user.leitnerMeta, ...leitnerMeta };

    user.markModified('spacedRepetitionQueue');
    user.markModified('leitnerMeta');
    await user.save();
    return res.json({ spacedRepetitionQueue: user.spacedRepetitionQueue, leitnerMeta: user.leitnerMeta });
  } catch (err) {
    console.error('Flashcard error:', err);
    return res.status(500).json({ error: 'Server error updating flashcard' });
  }
});

// DELETE /api/user/weakness  — dismiss a weakness banner
app.delete('/api/user/weakness', authRequired, async (req, res) => {
  try {
    const { weakness } = req.body;
    await User.findByIdAndUpdate(req.user.id, { $pull: { weaknesses: weakness } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Weakness delete error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  QUIZ ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/quiz/submit
app.post('/api/quiz/submit', authRequired, async (req, res) => {
  try {
    const { skill, answers, questions } = req.body;
    // answers = [selectedIndex, ...], questions = [{q, opts, correct, hint}, ...]
    if (!skill || !Array.isArray(answers) || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'skill, answers, and questions are required' });
    }

    let correct = 0;
    const breakdown = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct;
      if (isCorrect) correct++;
      return { question: q.q, selected: q.opts[answers[i]], correctAnswer: q.opts[q.correct], isCorrect, hint: q.hint };
    });

    const score = Math.round((correct / questions.length) * 100);
    const level = score >= 75 ? 'Advanced' : score >= 45 ? 'Intermediate' : 'Beginner';

    // Persist to DB
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.testResults.push({ skill, score, date: new Date() });
    user.quizScores.push({ category: skill, score });

    // Track weaknesses — missed questions
    const missedTopics = breakdown.filter((b) => !b.isCorrect).map((b) => `${skill}: ${b.hint}`);
    for (const w of missedTopics) {
      if (!user.weaknesses.includes(w)) user.weaknesses.push(w);
    }
    // Cap weaknesses at 5
    if (user.weaknesses.length > 5) user.weaknesses = user.weaknesses.slice(-5);

    // Spaced repetition — add missed cards
    for (const b of breakdown) {
      if (!b.isCorrect) {
        const already = user.spacedRepetitionQueue.some((c) => c.question === b.question);
        if (!already) {
          user.spacedRepetitionQueue.push({
            id: Date.now() + Math.random(),
            question: b.question,
            answer: b.correctAnswer,
            hint: b.hint,
            skill,
            addedAt: Date.now(),
          });
        }
      }
    }
    user.markModified('spacedRepetitionQueue');

    updateStreak(user);
    await user.save();

    // AI-powered skill recommendations
    let recommendations = [];
    try {
      const aiPrompt = `You are a career coach. A user just scored ${score}% on a ${skill} quiz at the ${level} level. Their missed topics were: ${missedTopics.join(', ') || 'none'}. Suggest 3 specific skills or resources they should study next. Respond as a JSON array of strings, e.g. ["Learn X", "Practice Y", "Study Z"]. Return ONLY the JSON array.`;
      const aiResp = await callAI('You are a concise career skills advisor.', aiPrompt);
      const clean = aiResp.replace(/```json|```/g, '').trim();
      recommendations = JSON.parse(clean);
    } catch {
      recommendations = [
        `Review ${skill} fundamentals`,
        `Practice ${skill} on LeetCode`,
        `Build a mini-project using ${skill}`,
      ];
    }

    return res.json({
      score,
      correct,
      total: questions.length,
      level,
      breakdown,
      recommendations,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Quiz submit error:', err);
    return res.status(500).json({ error: 'Server error submitting quiz' });
  }
});

// ══════════════════════════════════════════════════════════════
//  ROADMAP ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/roadmap/generate
app.post('/api/roadmap/generate', authRequired, async (req, res) => {
  try {
    const { careerGoal } = req.body;
    if (!careerGoal) return res.status(400).json({ error: 'careerGoal is required' });

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const systemPrompt = `You are an expert career roadmap generator. Return ONLY a valid JSON array. No markdown, no explanation.`;
    const userPrompt = `Create a 4-week learning roadmap for someone wanting to become a ${careerGoal}.
Their current skills: ${(user.skills || []).join(', ') || 'none listed'}.
Experience level: ${user.experience || 'Beginner'}.

Return a JSON array of exactly 4 week objects. Each object must have:
- "weekNum": number (1-4)
- "title": string (week title)
- "resources": array of 3 objects each with "icon" (single emoji), "name" (resource name), "duration" (e.g. "2h"), "nodeId" (unique string like "w0r0")

Example format:
[{"weekNum":1,"title":"Foundations","resources":[{"icon":"📖","name":"Core Concepts","duration":"3h","nodeId":"w0r0"}]}]`;

    let steps = [];
    try {
      const aiResponse = await callAI(systemPrompt, userPrompt);
      const clean = aiResponse.replace(/```json|```/g, '').trim();
      steps = JSON.parse(clean);
      if (!Array.isArray(steps)) throw new Error('Not an array');
    } catch {
      // Fallback static roadmap
      const mainSkill = (user.skills || [])[0] || careerGoal;
      steps = [
        { weekNum: 1, title: `${mainSkill} Fundamentals`, resources: [
          { icon: '📖', name: `${mainSkill} Core Concepts`, duration: '3h', nodeId: 'w0r0' },
          { icon: '🎥', name: `${mainSkill} Crash Course`, duration: '2h', nodeId: 'w0r1' },
          { icon: '💻', name: 'Build a Mini Project', duration: '4h', nodeId: 'w0r2' },
        ]},
        { weekNum: 2, title: 'Data Structures & Algorithms', resources: [
          { icon: '📖', name: 'Arrays & Linked Lists', duration: '2h', nodeId: 'w1r0' },
          { icon: '🧩', name: 'Trees & Graphs', duration: '3h', nodeId: 'w1r1' },
          { icon: '📝', name: 'DSA Practice Problems', duration: '5h', nodeId: 'w1r2' },
        ]},
        { weekNum: 3, title: `${careerGoal} Project`, resources: [
          { icon: '🏗️', name: 'System Design Basics', duration: '2h', nodeId: 'w2r0' },
          { icon: '💡', name: 'Project Architecture', duration: '2h', nodeId: 'w2r1' },
          { icon: '⚡', name: 'Build & Deploy', duration: '5h', nodeId: 'w2r2' },
        ]},
        { weekNum: 4, title: 'Interview Preparation', resources: [
          { icon: '🎤', name: 'Mock Interview Practice', duration: '2h', nodeId: 'w3r0' },
          { icon: '📋', name: 'Resume Optimization', duration: '1h', nodeId: 'w3r1' },
          { icon: '🤝', name: 'LinkedIn Profile Setup', duration: '1h', nodeId: 'w3r2' },
          { icon: '🏆', name: 'Job Applications', duration: '3h', nodeId: 'w3r3' },
        ]},
      ];
    }

    // Save to DB (upsert latest roadmap for this user)
    await Roadmap.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, careerGoal, steps },
      { upsert: true, new: true }
    );

    return res.json({ careerGoal, steps });
  } catch (err) {
    console.error('Roadmap generate error:', err);
    return res.status(500).json({ error: 'Server error generating roadmap' });
  }
});

// GET /api/roadmap  — fetch latest saved roadmap
app.get('/api/roadmap', authRequired, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    if (!roadmap) return res.json({ roadmap: null });
    return res.json({ roadmap });
  } catch (err) {
    console.error('Roadmap fetch error:', err);
    return res.status(500).json({ error: 'Server error fetching roadmap' });
  }
});

// ══════════════════════════════════════════════════════════════
//  JOBS ROUTES
// ══════════════════════════════════════════════════════════════
const JOB_POOL = [
  { id: 'j1', company: 'Razorpay',   logo: '💳', title: 'Frontend Engineer',      match: 92, skills: ['React', 'JavaScript', 'TypeScript'], type: 'top', salary: '₹12-18 LPA' },
  { id: 'j2', company: 'Swiggy',     logo: '🍔', title: 'Full Stack Dev',          match: 87, skills: ['React', 'Node.js', 'MongoDB'],        type: 'top', salary: '₹10-15 LPA' },
  { id: 'j3', company: 'CRED',       logo: '💎', title: 'React Native Dev',        match: 81, skills: ['React', 'JavaScript', 'Flutter'],      type: 'mid', salary: '₹9-14 LPA'  },
  { id: 'j4', company: 'Zomato',     logo: '🍕', title: 'Backend Engineer',        match: 76, skills: ['Node.js', 'Python', 'SQL'],            type: 'mid', salary: '₹8-12 LPA'  },
  { id: 'j5', company: 'Zepto',      logo: '⚡', title: 'Data Scientist',          match: 72, skills: ['Python', 'Machine Learning', 'Data Science'], type: 'mid', salary: '₹10-18 LPA' },
  { id: 'j6', company: 'Meesho',     logo: '🛍️', title: 'Machine Learning Eng.',  match: 68, skills: ['Python', 'Machine Learning', 'SQL'],   type: 'mid', salary: '₹12-20 LPA' },
  { id: 'j7', company: 'PhonePe',    logo: '📱', title: 'Android Developer',       match: 65, skills: ['Java', 'Flutter', 'SQL'],              type: 'mid', salary: '₹8-14 LPA'  },
  { id: 'j8', company: 'Freshworks', logo: '🌿', title: 'DevOps Engineer',         match: 60, skills: ['DevOps', 'Python', 'SQL'],             type: 'mid', salary: '₹10-16 LPA' },
];

// GET /api/jobs/matches
app.get('/api/jobs/matches', authOptional, async (req, res) => {
  try {
    let userSkills = [];
    let roadmapBonus = 0;

    if (req.user) {
      const user = await User.findById(req.user.id).select('skills completedRoadmapNodes');
      if (user) {
        userSkills = user.skills || [];
        const totalPossibleNodes = 12; // 4 weeks × 3 resources
        roadmapBonus = Math.min(10, Math.round((user.completedRoadmapNodes.length / totalPossibleNodes) * 10));
      }
    }

    const skillSet = new Set(userSkills);
    const scored = JOB_POOL.map((job) => {
      const overlap = job.skills.filter((s) => skillSet.has(s)).length;
      const adjustedScore = userSkills.length > 0
        ? Math.min(100, Math.round(job.match * (0.6 + 0.4 * overlap / job.skills.length)) + roadmapBonus)
        : job.match;
      return { ...job, score: adjustedScore };
    }).sort((a, b) => b.score - a.score);

    const topScore = scored[0]?.score || 75;
    return res.json({ jobs: scored, topScore });
  } catch (err) {
    console.error('Jobs error:', err);
    return res.status(500).json({ error: 'Server error fetching jobs' });
  }
});

// POST /api/jobs/save  — save/unsave a job
app.post('/api/jobs/save', authRequired, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId required' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const idx = user.savedJobs.indexOf(jobId);
    if (idx >= 0) {
      user.savedJobs.splice(idx, 1);
    } else {
      user.savedJobs.push(jobId);
    }
    await user.save();
    return res.json({ savedJobs: user.savedJobs });
  } catch (err) {
    console.error('Save job error:', err);
    return res.status(500).json({ error: 'Server error saving job' });
  }
});

// ══════════════════════════════════════════════════════════════
//  CHAT ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/chat
app.post('/api/chat', authOptional, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    let userName = 'the user';
    let userSkills = [];
    let userDomain = 'General';
    let userId = null;

    if (req.user) {
      const user = await User.findById(req.user.id).select('name skills domains experience');
      if (user) {
        userId = user._id;
        userName = user.name;
        userSkills = user.skills || [];
        userDomain = (user.domains || [])[0] || 'General';
      }
    }

    // Retrieve last 8 chat messages for context
    const history = await Chat.find(
      userId ? { userId } : { sessionId: sessionId || '' },
      null,
      { sort: { timestamp: -1 }, limit: 8 }
    );
    const historyText = history
      .reverse()
      .map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.message}`)
      .join('\n');

    const systemPrompt = `You are SkillSync AI, an expert career coach and mentor for tech professionals.
The user's name is ${userName}. Their current skills are: ${userSkills.join(', ') || 'not specified'}.
They are targeting the ${userDomain} domain.
Be encouraging, specific, and actionable. Use emojis sparingly. Keep responses under 200 words.
Previous conversation:
${historyText}`;

    // Save user message
    await Chat.create({ userId, sessionId: sessionId || '', message, sender: 'user' });

    // Get AI response
    const aiReply = await callAI(systemPrompt, message);

    // Save bot message
    await Chat.create({ userId, sessionId: sessionId || '', message: aiReply, sender: 'bot' });

    return res.json({ reply: aiReply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Server error in chat', reply: "I'm having a moment — please try again! 😅" });
  }
});

// GET /api/chat/history  — load chat history for authenticated user
app.get('/api/chat/history', authRequired, async (req, res) => {
  try {
    const messages = await Chat.find({ userId: req.user.id })
      .sort({ timestamp: 1 })
      .limit(50);
    return res.json({ messages });
  } catch (err) {
    console.error('Chat history error:', err);
    return res.status(500).json({ error: 'Server error fetching chat history' });
  }
});

// ══════════════════════════════════════════════════════════════
//  SERVE FRONTEND
// ══════════════════════════════════════════════════════════════
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ══════════════════════════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SkillSync AI running at http://localhost:${PORT}`);
});
