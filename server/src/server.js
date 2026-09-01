import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import questionsData from './questions.json' assert { type: 'json' };
import { quizState, QUESTION_DURATION_SEC } from './state.js';
import {
  signParticipantToken,
  signAdminToken,
  verifyAdminCredentials,
  authMiddleware,
  adminAuthMiddleware,
} from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

// In-memory questions array (mutable via admin upload)
let questions = [...questionsData];

// Configure CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Public static files for question images
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Serve built React client if available
const clientDistDir = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

// Multer storage for admin image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imagesDir = path.join(publicDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const questionId = req.params.id || 'custom';
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `q${questionId}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Broadcast state updates to Admin room
function broadcastToAdmins(eventName, payload) {
  io.to('admin-room').emit(eventName, payload);
}

function broadcastLiveStreamUpdate(participant, extra = {}) {
  const payload = {
    participant: {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      avatar: participant.avatar,
      department: participant.department,
      status: participant.status,
      currentQuestionIndex: participant.currentQuestionIndex,
      score: participant.score,
      totalCorrect: participant.totalCorrect,
      totalTimeSec: participant.totalTimeSec,
      isOnline: participant.isOnline,
      violationsCount: participant.violations.length,
      answers: participant.answers,
      completedAt: participant.completedAt,
    },
    leaderboard: quizState.getLeaderboard(),
    questionAnalytics: quizState.getQuestionAnalytics(questions),
    ...extra,
  };
  broadcastToAdmins('stream:participant:update', payload);
}

// ---------------- REST API ROUTES ---------------- //

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    totalQuestions: questions.length,
    activeParticipants: quizState.getAllParticipants().length,
  });
});

// Admin Auth
app.post('/api/auth/admin', (req, res) => {
  const { username, password } = req.body;
  if (!verifyAdminCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid admin username or password' });
  }
  const token = signAdminToken();
  quizState.logEvent('ADMIN_LOGIN', 'Admin authenticated into command center');
  res.json({ token, username });
});

// Participant Registration / Login
app.post('/api/auth/participant', (req, res) => {
  const { name, email, avatar, department } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are strictly required.' });
  }

  const { participant, isExisting } = quizState.registerParticipant({
    name,
    email,
    avatar,
    department,
  });

  const token = signParticipantToken(participant);

  broadcastLiveStreamUpdate(participant, {
    event: isExisting ? 'PARTICIPANT_RECONNECTED' : 'PARTICIPANT_JOINED',
  });

  res.json({
    token,
    participant,
    isExisting,
    totalQuestions: questions.length,
    timePerQuestionSec: quizState.settings.timePerQuestionSec,
  });
});

// Participant: Start / Resume Quiz
app.post('/api/quiz/start', authMiddleware, (req, res) => {
  const participantId = req.user.id;
  const participant = quizState.startQuiz(participantId, questions);
  if (!participant) {
    return res.status(404).json({ error: 'Participant record not found' });
  }

  broadcastLiveStreamUpdate(participant, { event: 'QUIZ_STARTED' });

  // Sanitize current question (do NOT return correctAnswer)
  const currentQIndex = participant.currentQuestionIndex;
  const currentQ = questions[currentQIndex];

  const now = Date.now();
  const elapsedMs = participant.questionStartTime ? Math.max(0, now - participant.questionStartTime) : 0;
  const remainingSec = Math.max(
    0,
    Number((quizState.settings.timePerQuestionSec - elapsedMs / 1000).toFixed(1))
  );

  res.json({
    status: participant.status,
    currentQuestionIndex: currentQIndex,
    totalQuestions: questions.length,
    remainingSec,
    questionDurationSec: quizState.settings.timePerQuestionSec,
    question: currentQ
      ? {
          id: currentQ.id,
          image: currentQ.image,
          options: currentQ.options,
        }
      : null,
    answersCount: participant.answers.length,
    score: participant.score,
  });
});

// Participant: Get Current Active Question & Remaining Time
app.get('/api/quiz/current', authMiddleware, (req, res) => {
  const participantId = req.user.id;
  const participant = quizState.getParticipant(participantId);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  // Check auto timeout
  quizState.checkAndAutoAdvance(participant, questions);

  if (participant.status === 'COMPLETED') {
    return res.json({
      status: 'COMPLETED',
      currentQuestionIndex: participant.currentQuestionIndex,
      totalQuestions: questions.length,
      score: participant.score,
      totalCorrect: participant.totalCorrect,
      totalTimeSec: participant.totalTimeSec,
      answers: participant.answers,
      completedAt: participant.completedAt,
    });
  }

  const currentQIndex = participant.currentQuestionIndex;
  const currentQ = questions[currentQIndex];

  let remainingSec = quizState.settings.timePerQuestionSec;
  if (participant.questionStartTime) {
    const elapsedMs = Date.now() - participant.questionStartTime;
    remainingSec = Math.max(
      0,
      Number((quizState.settings.timePerQuestionSec - elapsedMs / 1000).toFixed(1))
    );
  }

  res.json({
    status: participant.status,
    currentQuestionIndex: currentQIndex,
    totalQuestions: questions.length,
    remainingSec,
    questionDurationSec: quizState.settings.timePerQuestionSec,
    question: currentQ
      ? {
          id: currentQ.id,
          image: currentQ.image,
          options: currentQ.options,
        }
      : null,
    answersCount: participant.answers.length,
    score: participant.score,
  });
});

// Participant: Submit Answer
app.post('/api/quiz/submit', authMiddleware, (req, res) => {
  const participantId = req.user.id;
  const { questionId, selectedOption } = req.body;

  try {
    const result = quizState.submitAnswer(
      participantId,
      { questionId: Number(questionId), selectedOption },
      questions
    );

    // Stream update to admin immediately
    broadcastLiveStreamUpdate(result.participant, {
      event: 'ANSWER_RECEIVED',
      answer: result.answerRecord,
    });

    const nextQ = questions[result.nextQuestionIndex];

    res.json({
      success: true,
      isComplete: result.isComplete,
      currentScore: result.participant.score,
      nextQuestionIndex: result.nextQuestionIndex,
      nextQuestion:
        !result.isComplete && nextQ
          ? {
              id: nextQ.id,
              image: nextQ.image,
              options: nextQ.options,
            }
          : null,
      questionDurationSec: quizState.settings.timePerQuestionSec,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Participant: Log Integrity Violation (Tab switch, window blur)
app.post('/api/quiz/violation', authMiddleware, (req, res) => {
  const participantId = req.user.id;
  const { type, details } = req.body;

  const violation = quizState.recordViolation(participantId, type || 'TAB_SWITCH', details);
  const participant = quizState.getParticipant(participantId);

  if (participant) {
    broadcastToAdmins('stream:violation:alert', {
      participantId: participant.id,
      name: participant.name,
      violation,
      totalViolations: participant.violations.length,
    });
  }

  res.json({ status: 'violation_logged' });
});

// Participant: Review Quiz (Accessible only after completion)
app.get('/api/quiz/review', authMiddleware, (req, res) => {
  const participantId = req.user.id;
  const participant = quizState.getParticipant(participantId);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  if (participant.status !== 'COMPLETED') {
    return res.status(403).json({ error: 'Quiz review is only accessible once all questions are completed.' });
  }

  // Combine participant's answers with full questions data and explanations
  const review = questions.map((q) => {
    const userAns = participant.answers.find((a) => a.questionId === q.id) || {
      selectedOption: null,
      selectedText: 'Timed Out',
      isCorrect: false,
      timeSpentSec: 30,
      isTimedOut: true,
    };

    return {
      id: q.id,
      image: q.image,
      options: q.options,
      correctAnswer: q.correctAnswer,
      correctAnswerText: q.correctAnswerText,
      explanation: q.explanation,
      userAnswer: userAns.selectedOption,
      userAnswerText: userAns.selectedText,
      isCorrect: userAns.isCorrect,
      timeSpentSec: userAns.timeSpentSec,
      isTimedOut: userAns.isTimedOut,
    };
  });

  res.json({
    participant: {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      score: participant.score,
      totalCorrect: participant.totalCorrect,
      totalTimeSec: participant.totalTimeSec,
      completedAt: participant.completedAt,
    },
    review,
  });
});

// ---------------- ADMIN REST API ROUTES ---------------- //

// Admin: Get complete live stream snapshot
app.get('/api/admin/snapshot', adminAuthMiddleware, (req, res) => {
  res.json({
    participants: quizState.getAllParticipants(),
    leaderboard: quizState.getLeaderboard(),
    questionAnalytics: quizState.getQuestionAnalytics(questions),
    auditLogs: quizState.auditLogs.slice(0, 100),
    questions,
    settings: quizState.settings,
  });
});

// Admin: Update Question Image
app.post('/api/admin/questions/:id/image', adminAuthMiddleware, upload.single('image'), (req, res) => {
  const questionId = Number(req.params.id);
  const targetQ = questions.find((q) => q.id === questionId);
  if (!targetQ) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const imageUrl = `/images/${req.file.filename}`;
  targetQ.image = imageUrl;

  // Persist into questions.json
  try {
    fs.writeFileSync(
      path.join(__dirname, 'questions.json'),
      JSON.stringify(questions, null, 2)
    );
  } catch (err) {
    console.error('Failed to update questions.json:', err);
  }

  quizState.logEvent('ADMIN_IMAGE_UPLOAD', `Admin updated image for Question #${questionId}`, null, {
    questionId,
    imageUrl,
  });

  broadcastToAdmins('stream:question:updated', { questionId, question: targetQ });
  io.emit('quiz:question:updated', { questionId, image: imageUrl });

  res.json({ success: true, question: targetQ });
});

// Admin: Broadcast Live Message to all participants
app.post('/api/admin/broadcast', adminAuthMiddleware, (req, res) => {
  const { message, severity = 'info' } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const broadcastObj = {
    id: Date.now().toString(),
    message,
    severity,
    timestamp: new Date().toISOString(),
  };

  quizState.broadcasts.push(broadcastObj);
  quizState.logEvent('BROADCAST_SENT', `Admin broadcasted: "${message}"`);

  io.emit('client:broadcast:message', broadcastObj);
  res.json({ success: true, broadcast: broadcastObj });
});

// Admin: Reset Participant
app.post('/api/admin/participants/:id/reset', adminAuthMiddleware, (req, res) => {
  const p = quizState.resetParticipant(req.params.id);
  if (!p) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  broadcastLiveStreamUpdate(p, { event: 'PARTICIPANT_RESET' });
  io.to(`user-${p.id}`).emit('quiz:force:reset', { message: 'Your quiz session was reset by the administrator.' });

  res.json({ success: true, participant: p });
});

// Admin: Delete Participant
app.delete('/api/admin/participants/:id', adminAuthMiddleware, (req, res) => {
  const success = quizState.deleteParticipant(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  broadcastToAdmins('stream:participant:deleted', { participantId: req.params.id });
  res.json({ success: true });
});

// Admin: Export Leaderboard as CSV
app.get('/api/admin/export/csv', adminAuthMiddleware, (req, res) => {
  const leaderboard = quizState.getLeaderboard();
  const headers = ['Rank', 'Name', 'Email', 'Department', 'Score', 'Correct Answers', 'Total Time (s)', 'Status', 'Violations', 'Completed At'];
  const rows = leaderboard.map((p, idx) => [
    idx + 1,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.email}"`,
    `"${p.department}"`,
    p.score,
    `${p.totalCorrect}/10`,
    p.totalTimeSec,
    p.status,
    p.violationsCount,
    p.completedAt || 'N/A',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=quiz_leaderboard_${Date.now()}.csv`);
  res.send(csvContent);
});

// SPA fallback route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/images') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(clientDistDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Quiz API Server Running. Please start client Vite server or build client.');
  }
});

// ---------------- SOCKET.IO REAL-TIME HANDLING ---------------- //

io.on('connection', (socket) => {
  // Handle Admin Join
  socket.on('admin:join', () => {
    socket.join('admin-room');
    quizState.adminSockets.add(socket.id);
    socket.emit('admin:snapshot', {
      participants: quizState.getAllParticipants(),
      leaderboard: quizState.getLeaderboard(),
      questionAnalytics: quizState.getQuestionAnalytics(questions),
      auditLogs: quizState.auditLogs.slice(0, 100),
      questions,
      settings: quizState.settings,
    });
  });

  // Handle Participant Join
  socket.on('participant:join', ({ participantId }) => {
    if (!participantId) return;
    socket.join(`user-${participantId}`);
    socket.join('participant-room');
    quizState.setParticipantOnline(participantId, socket.id, true);

    const participant = quizState.getParticipant(participantId);
    if (participant) {
      broadcastLiveStreamUpdate(participant, { event: 'PARTICIPANT_ONLINE' });
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    quizState.adminSockets.delete(socket.id);
    const participantId = quizState.activeSockets.get(socket.id);
    if (participantId) {
      quizState.setParticipantOnline(participantId, socket.id, false);
      const participant = quizState.getParticipant(participantId);
      if (participant) {
        broadcastLiveStreamUpdate(participant, { event: 'PARTICIPANT_OFFLINE' });
      }
    }
  });
});

// Background heartbeat: Check for auto timeouts every 2 seconds
setInterval(() => {
  let anyUpdated = false;
  for (const p of quizState.participants.values()) {
    if (p.status === 'IN_PROGRESS') {
      const advanced = quizState.checkAndAutoAdvance(p, questions);
      if (advanced) {
        anyUpdated = true;
        broadcastLiveStreamUpdate(p, { event: 'QUESTION_TIMED_OUT' });
        // Notify participant socket
        io.to(`user-${p.id}`).emit('quiz:timeout:advance', {
          nextQuestionIndex: p.currentQuestionIndex,
          isCompleted: p.status === 'COMPLETED',
        });
      }
    }
  }
}, 2000);

// Start server
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 AAA Quiz Server running on http://localhost:${PORT}`);
  console.log(`🎯 Real-Time Admin live streaming enabled on /admin`);
  console.log(`⏱️ Authoritative Timer: ${QUESTION_DURATION_SEC} seconds per question`);
  console.log(`=================================================`);
});
