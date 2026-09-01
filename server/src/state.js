import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data.json');

// Question timeout in seconds
export const QUESTION_DURATION_SEC = 30;
export const QUESTION_DURATION_MS = QUESTION_DURATION_SEC * 1000;

class QuizStateManager {
  constructor() {
    this.participants = new Map(); // id -> participantData
    this.activeSockets = new Map(); // socketId -> participantId / 'admin'
    this.adminSockets = new Set(); // Set of socketIds
    this.auditLogs = [];
    this.broadcasts = [];
    this.settings = {
      isQuizActive: true,
      allowRegistration: true,
      timePerQuestionSec: QUESTION_DURATION_SEC,
      totalQuestions: 10,
    };
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.participants) {
          for (const [id, p] of Object.entries(data.participants)) {
            // Reset online status on reload
            p.isOnline = false;
            p.socketId = null;
            this.participants.set(id, p);
          }
        }
        if (data.auditLogs) {
          this.auditLogs = data.auditLogs.slice(-200);
        }
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
        }
        console.log(`Loaded ${this.participants.size} participants from persistence.`);
      }
    } catch (e) {
      console.error('Failed to load state from disk:', e);
    }
  }

  saveState() {
    try {
      const exportData = {
        participants: Object.fromEntries(this.participants),
        auditLogs: this.auditLogs.slice(-200),
        settings: this.settings,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(exportData, null, 2));
    } catch (e) {
      console.error('Failed to save state to disk:', e);
    }
  }

  logEvent(type, message, participantId = null, extra = {}) {
    const event = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      message,
      participantId,
      ...extra,
    };
    this.auditLogs.unshift(event);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return event;
  }

  registerParticipant({ id, name, email, avatar, department }) {
    // Check if participant with email already exists
    let existing = Array.from(this.participants.values()).find(
      (p) => p.email && p.email.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      return { participant: existing, isExisting: true };
    }

    const newParticipant = {
      id: id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: avatar || 'avatar-1',
      department: department || 'General',
      registeredAt: new Date().toISOString(),
      currentQuestionIndex: 0, // 0 to 9
      questionStartTime: null,
      answers: [], // Array of { questionId, selectedOption, isCorrect, timeSpentSec, submittedAt, isTimedOut }
      score: 0,
      totalCorrect: 0,
      totalTimeSec: 0,
      status: 'NOT_STARTED', // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
      isOnline: false,
      socketId: null,
      violations: [], // { type: 'TAB_SWITCH', timestamp: string }
      completedAt: null,
    };

    this.participants.set(newParticipant.id, newParticipant);
    this.logEvent('PARTICIPANT_REGISTERED', `${newParticipant.name} (${newParticipant.email}) registered`, newParticipant.id);
    this.saveState();
    return { participant: newParticipant, isExisting: false };
  }

  getParticipant(id) {
    return this.participants.get(id) || null;
  }

  getAllParticipants() {
    return Array.from(this.participants.values());
  }

  startQuiz(participantId, questionsList) {
    const p = this.participants.get(participantId);
    if (!p) return null;

    if (p.status === 'COMPLETED') {
      return p;
    }

    if (p.status === 'NOT_STARTED') {
      p.status = 'IN_PROGRESS';
      p.currentQuestionIndex = 0;
      p.questionStartTime = Date.now();
      this.logEvent('QUIZ_STARTED', `${p.name} started the quiz`, p.id);
      this.saveState();
    } else if (p.status === 'IN_PROGRESS') {
      // If resuming, check if current question has timed out
      this.checkAndAutoAdvance(p, questionsList);
    }

    return p;
  }

  checkAndAutoAdvance(p, questionsList) {
    if (p.status !== 'IN_PROGRESS' || !p.questionStartTime) return false;

    const elapsedMs = Date.now() - p.questionStartTime;
    if (elapsedMs > (this.settings.timePerQuestionSec * 1000 + 1000)) {
      // Auto timeout this question
      const currentQ = questionsList[p.currentQuestionIndex];
      const answerRecord = {
        questionId: currentQ.id,
        selectedOption: null,
        selectedText: null,
        isCorrect: false,
        timeSpentSec: this.settings.timePerQuestionSec,
        submittedAt: new Date().toISOString(),
        isTimedOut: true,
      };

      p.answers.push(answerRecord);
      p.totalTimeSec += this.settings.timePerQuestionSec;

      this.logEvent('QUESTION_TIMED_OUT', `${p.name} ran out of time on Question ${currentQ.id}`, p.id, {
        questionId: currentQ.id,
      });

      // Advance
      if (p.currentQuestionIndex + 1 < questionsList.length) {
        p.currentQuestionIndex += 1;
        p.questionStartTime = Date.now();
      } else {
        p.status = 'COMPLETED';
        p.completedAt = new Date().toISOString();
        p.questionStartTime = null;
        this.logEvent('QUIZ_COMPLETED', `${p.name} completed the quiz with score ${p.score}/100`, p.id, {
          score: p.score,
        });
      }

      this.saveState();
      return true;
    }
    return false;
  }

  submitAnswer(participantId, { questionId, selectedOption }, questionsList) {
    const p = this.participants.get(participantId);
    if (!p) throw new Error('Participant not found');
    if (p.status === 'COMPLETED') throw new Error('Quiz is already completed');

    const currentQ = questionsList[p.currentQuestionIndex];
    if (!currentQ || currentQ.id !== questionId) {
      throw new Error(`Invalid question submission. Expected question ${currentQ?.id}, got ${questionId}`);
    }

    // Check if already answered
    const alreadyAnswered = p.answers.some((a) => a.questionId === questionId);
    if (alreadyAnswered) {
      throw new Error('Question already answered. Retries are strictly prohibited.');
    }

    const now = Date.now();
    const elapsedMs = p.questionStartTime ? Math.max(0, now - p.questionStartTime) : 0;
    const timeSpentSec = Math.min(this.settings.timePerQuestionSec, Number((elapsedMs / 1000).toFixed(2)));
    const isTimedOut = elapsedMs > (this.settings.timePerQuestionSec * 1000 + 2000); // 2s grace for network

    const isCorrect = !isTimedOut && selectedOption === currentQ.correctAnswer;
    const pointsForCorrect = 10;
    const earnedPoints = isCorrect ? pointsForCorrect : 0;

    const optObj = currentQ.options.find((o) => o.id === selectedOption);
    const selectedText = optObj ? optObj.text : null;

    const answerRecord = {
      questionId: currentQ.id,
      selectedOption: isTimedOut ? null : selectedOption,
      selectedText: isTimedOut ? 'Timed Out' : selectedText,
      isCorrect,
      timeSpentSec: isTimedOut ? this.settings.timePerQuestionSec : timeSpentSec,
      submittedAt: new Date().toISOString(),
      isTimedOut,
      pointsEarned: earnedPoints,
    };

    p.answers.push(answerRecord);
    if (isCorrect) {
      p.score += earnedPoints;
      p.totalCorrect += 1;
    }
    p.totalTimeSec = Number((p.totalTimeSec + answerRecord.timeSpentSec).toFixed(2));

    this.logEvent(
      'ANSWER_SUBMITTED',
      `${p.name} answered Q${currentQ.id} [${selectedOption || 'TIMEOUT'}] - ${isCorrect ? 'CORRECT' : 'INCORRECT'} (${answerRecord.timeSpentSec}s)`,
      p.id,
      {
        questionId: currentQ.id,
        selectedOption,
        isCorrect,
        timeSpentSec: answerRecord.timeSpentSec,
      }
    );

    // Advance to next question
    if (p.currentQuestionIndex + 1 < questionsList.length) {
      p.currentQuestionIndex += 1;
      p.questionStartTime = Date.now();
    } else {
      p.status = 'COMPLETED';
      p.completedAt = new Date().toISOString();
      p.questionStartTime = null;
      this.logEvent('QUIZ_COMPLETED', `${p.name} completed the quiz! Final Score: ${p.score}/100`, p.id, {
        score: p.score,
      });
    }

    this.saveState();
    return { participant: p, answerRecord, nextQuestionIndex: p.currentQuestionIndex, isComplete: p.status === 'COMPLETED' };
  }

  recordViolation(participantId, violationType, details = '') {
    const p = this.participants.get(participantId);
    if (!p) return null;

    const violation = {
      id: Math.random().toString(36).substring(2, 7),
      type: violationType,
      details,
      timestamp: new Date().toISOString(),
      questionIndex: p.currentQuestionIndex,
    };

    p.violations.push(violation);
    this.logEvent('INTEGRITY_VIOLATION', `Security Alert: ${p.name} triggered ${violationType} (${details})`, p.id, {
      violation,
    });

    this.saveState();
    return violation;
  }

  setParticipantOnline(participantId, socketId, isOnline = true) {
    const p = this.participants.get(participantId);
    if (p) {
      p.isOnline = isOnline;
      p.socketId = isOnline ? socketId : null;
      if (isOnline) {
        this.activeSockets.set(socketId, participantId);
      } else {
        this.activeSockets.delete(socketId);
      }
    }
  }

  resetParticipant(participantId) {
    const p = this.participants.get(participantId);
    if (!p) return null;

    p.currentQuestionIndex = 0;
    p.questionStartTime = null;
    p.answers = [];
    p.score = 0;
    p.totalCorrect = 0;
    p.totalTimeSec = 0;
    p.status = 'NOT_STARTED';
    p.violations = [];
    p.completedAt = null;

    this.logEvent('ADMIN_RESET', `Admin reset progress for ${p.name}`, p.id);
    this.saveState();
    return p;
  }

  deleteParticipant(participantId) {
    const p = this.participants.get(participantId);
    if (p) {
      this.participants.delete(participantId);
      this.logEvent('ADMIN_DELETE', `Admin deleted participant ${p.name}`, participantId);
      this.saveState();
      return true;
    }
    return false;
  }

  getLeaderboard() {
    const list = Array.from(this.participants.values());
    return list
      .map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        avatar: p.avatar,
        department: p.department,
        score: p.score,
        totalCorrect: p.totalCorrect,
        totalTimeSec: p.totalTimeSec,
        status: p.status,
        currentQuestionIndex: p.currentQuestionIndex,
        completedAt: p.completedAt,
        violationsCount: p.violations.length,
        isOnline: p.isOnline,
      }))
      .sort((a, b) => {
        // High score first, then lower total time
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.totalTimeSec - b.totalTimeSec;
      });
  }

  getQuestionAnalytics(questionsList) {
    const stats = questionsList.map((q) => {
      const distribution = { A: 0, B: 0, C: 0, D: 0, TIMEOUT: 0 };
      let correctCount = 0;
      let totalAnswered = 0;
      let totalTime = 0;

      for (const p of this.participants.values()) {
        const ans = p.answers.find((a) => a.questionId === q.id);
        if (ans) {
          totalAnswered += 1;
          totalTime += ans.timeSpentSec;
          if (ans.isTimedOut) {
            distribution.TIMEOUT += 1;
          } else if (ans.selectedOption && distribution[ans.selectedOption] !== undefined) {
            distribution[ans.selectedOption] += 1;
          }
          if (ans.isCorrect) {
            correctCount += 1;
          }
        }
      }

      return {
        questionId: q.id,
        correctAnswer: q.correctAnswer,
        totalAnswered,
        correctCount,
        accuracyPct: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
        avgTimeSec: totalAnswered > 0 ? Number((totalTime / totalAnswered).toFixed(1)) : 0,
        distribution,
      };
    });

    return stats;
  }
}

export const quizState = new QuizStateManager();
