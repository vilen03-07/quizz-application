import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import ImageModal from '../components/ImageModal';

const DURATION_SEC = 30;

export default function QuizArena({ token, participant, socket, onQuizComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [question, setQuestion] = useState(null);
  const [remainingTime, setRemainingTime] = useState(DURATION_SEC);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [violationAlert, setViolationAlert] = useState(null);

  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const isSubmittingRef = useRef(false);

  // Initialize or fetch current question
  const fetchCurrentState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quiz/current', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch question');

      if (data.status === 'NOT_STARTED') {
        // Trigger quiz start
        const startRes = await fetch('/api/quiz/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const startData = await startRes.json();
        setupQuestionData(startData);
      } else if (data.status === 'COMPLETED') {
        onQuizComplete(data);
      } else {
        setupQuestionData(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, onQuizComplete]);

  const setupQuestionData = (data) => {
    setCurrentQuestionIndex(data.currentQuestionIndex || 0);
    setTotalQuestions(data.totalQuestions || 10);
    setQuestion(data.question);
    setSelectedOption(null);
    setIsLocked(false);
    isSubmittingRef.current = false;

    const remaining = data.remainingSec !== undefined ? Math.max(0, data.remainingSec) : DURATION_SEC;
    setRemainingTime(remaining);
    questionStartTimeRef.current = Date.now() - (DURATION_SEC - remaining) * 1000;
  };

  useEffect(() => {
    fetchCurrentState();
  }, [fetchCurrentState]);

  // Anti-Cheat: Track window blur and visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('TAB_SWITCH', 'User minimized browser or switched tabs');
      }
    };

    const handleBlur = () => {
      logViolation('WINDOW_BLUR', 'User unfocused or clicked outside quiz window');
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [token]);

  const logViolation = async (type, details) => {
    setViolations((v) => v + 1);
    setViolationAlert(`Integrity Warning: ${type.replace('_', ' ')} detected! Admin notified.`);
    setTimeout(() => setViolationAlert(null), 5000);

    try {
      await fetch('/api/quiz/violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, details }),
      });
    } catch (e) {}
  };

  // Socket listener for admin resets or timeout broadcasts
  useEffect(() => {
    if (!socket) return;

    const handleReset = (data) => {
      alert(data.message || 'Your session was reset by the administrator.');
      window.location.reload();
    };

    const handleTimeoutAdvance = (data) => {
      if (data.isCompleted) {
        fetchCurrentState();
      } else {
        fetchCurrentState();
      }
    };

    socket.on('quiz:force:reset', handleReset);
    socket.on('quiz:timeout:advance', handleTimeoutAdvance);

    return () => {
      socket.off('quiz:force:reset', handleReset);
      socket.off('quiz:timeout:advance', handleTimeoutAdvance);
    };
  }, [socket, fetchCurrentState]);

  // Submit answer handler
  const handleSelectOption = useCallback(
    async (optionId, isAutoTimeout = false) => {
      if (isLocked || isSubmittingRef.current || !question) return;

      isSubmittingRef.current = true;
      setIsLocked(true);
      setSelectedOption(optionId);

      if (isAutoTimeout) {
        soundFx.playTimeout();
      } else {
        soundFx.playSelect();
      }

      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: question.id,
            selectedOption: optionId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit answer');

        // Short transition delay for tactile visual confirmation
        setTimeout(() => {
          if (data.isComplete) {
            soundFx.playSuccess();
            onQuizComplete(data);
          } else {
            setCurrentQuestionIndex(data.nextQuestionIndex);
            setQuestion(data.nextQuestion);
            setSelectedOption(null);
            setIsLocked(false);
            isSubmittingRef.current = false;
            setRemainingTime(DURATION_SEC);
            questionStartTimeRef.current = Date.now();
          }
        }, 600);
      } catch (err) {
        setError(err.message);
        setIsLocked(false);
        isSubmittingRef.current = false;
      }
    },
    [isLocked, question, token, onQuizComplete]
  );

  // 30-Second Countdown Clock
  useEffect(() => {
    if (loading || isLocked || !question) return;

    timerRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - questionStartTimeRef.current) / 1000;
      const left = Math.max(0, Number((DURATION_SEC - elapsedSec).toFixed(1)));
      setRemainingTime(left);

      // Sound audio cues
      if (Math.floor(left) <= 5 && left > 0 && Math.floor(left) !== Math.floor(left + 0.1)) {
        soundFx.playUrgentTick();
      } else if (Math.floor(left) <= 10 && left > 5 && Math.floor(left) !== Math.floor(left + 0.1)) {
        soundFx.playTick();
      }

      // Time expired
      if (left <= 0) {
        clearInterval(timerRef.current);
        handleSelectOption(null, true);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isLocked, question, handleSelectOption]);

  // Keyboard shortcuts (A, B, C, D or 1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLocked || !question || isSubmittingRef.current) return;

      const key = e.key.toUpperCase();
      const keyMap = {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        'A': 'A',
        'B': 'B',
        'C': 'C',
        'D': 'D',
      };

      const optionId = keyMap[key];
      if (optionId) {
        const validOption = question.options.find((o) => o.id === optionId);
        if (validOption) {
          handleSelectOption(optionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, question, handleSelectOption]);

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl border-2 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
          <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <p className="text-sm font-mono text-cyan-300 tracking-wider">Synchronizing Arena Telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-rose-500/40 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Synchronization Error</h2>
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition"
          >
            Reload Arena
          </button>
        </div>
      </div>
    );
  }

  // Timer visual properties
  const timerPct = (remainingTime / DURATION_SEC) * 100;
  const isCritical = remainingTime <= 6;
  const isWarning = remainingTime <= 12 && !isCritical;
  const timerColor = isCritical
    ? '#f43f5e' // Rose red
    : isWarning
    ? '#f59e0b' // Amber
    : '#06b6d4'; // Cyan

  return (
    <div className="min-h-[88vh] max-w-6xl mx-auto p-4 lg:p-6 flex flex-col justify-between relative z-10">
      {/* Violation Alert Toast */}
      {violationAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border-2 border-rose-500 text-rose-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-xl animate-bounce">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-xs font-bold font-mono">{violationAlert}</span>
        </div>
      )}

      {/* Top Arena Header: Progress bar, question index, authoritative 30s radial timer */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-cyan-500/20 mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Progress info */}
        <div className="flex items-center space-x-4">
          <div className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-sm font-black tracking-wider flex items-center space-x-2">
            <span>QUESTION</span>
            <span className="text-lg text-white">
              {currentQuestionIndex + 1}
            </span>
            <span className="text-slate-400">/ {totalQuestions}</span>
          </div>

          <div className="hidden sm:block">
            <div className="w-48 bg-slate-900/90 rounded-full h-2.5 border border-slate-700 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Instruction badge */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>IDENTIFY THE HARDWARE COMPONENT SHOWN BELOW</span>
        </div>

        {/* Right: Authoritative 30s Timer */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="19"
                stroke="currentColor"
                strokeWidth="4"
                className="text-slate-800/80"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="19"
                stroke={timerColor}
                strokeWidth="4"
                strokeDasharray={119.38}
                strokeDashoffset={119.38 - (119.38 * timerPct) / 100}
                strokeLinecap="round"
                fill="transparent"
                className={`transition-all duration-100 ${isCritical ? 'timer-pulse-critical' : ''}`}
              />
            </svg>
            <div className="absolute text-center">
              <span
                className={`text-sm font-mono font-black ${
                  isCritical ? 'text-rose-400 animate-pulse' : isWarning ? 'text-amber-400' : 'text-cyan-300'
                }`}
              >
                {Math.ceil(remainingTime)}s
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Time Limit</p>
            <p className={`text-xs font-bold font-mono ${isCritical ? 'text-rose-400' : 'text-slate-200'}`}>
              {isCritical ? 'CRITICAL!' : '30s Authoritative'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Arena Grid: Question Image + 4 Interactive Option Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto">
        {/* Left Image Viewport */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="glass-panel-glow rounded-3xl p-3 sm:p-4 border border-cyan-500/30 relative group overflow-hidden flex-1 flex flex-col justify-center items-center bg-[#070e1c]">
            {/* Image container */}
            <div
              onClick={() => setZoomOpen(true)}
              className="relative w-full h-[320px] sm:h-[400px] rounded-2xl overflow-hidden cursor-zoom-in bg-slate-950 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-400/50 transition-all duration-300"
            >
              {question?.image ? (
                <img
                  src={question.image}
                  alt={`Question ${question.id}`}
                  className="w-full h-full object-cover sm:object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              ) : (
                <div className="text-slate-500 text-sm font-mono">Loading High-Res Image...</div>
              )}

              {/* Ambient scanline overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none opacity-40 animate-scanline" />

              {/* Zoom Inspect Badge */}
              <div className="absolute bottom-3 right-3 bg-slate-900/80 border border-slate-700/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-mono text-slate-200 flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 group-hover:bg-cyan-950/90 group-hover:border-cyan-400 transition">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Click to Inspect / Zoom</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Options Matrix */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase font-mono font-bold tracking-widest text-cyan-400">
              Select Correct Option
            </span>
            <span className="text-[11px] font-mono text-slate-400">Keyboard Shortcuts: 1-4 or A-D</span>
          </div>

          <div className="space-y-3">
            {question?.options.map((opt, index) => {
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  disabled={isLocked}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all flex items-center space-x-4 cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-[1.01]'
                      : isLocked
                      ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'glass-card-interactive text-slate-200 hover:text-white'
                  }`}
                >
                  {/* Option Badge (A, B, C, D) */}
                  <div
                    className={`w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-tr from-cyan-400 to-sky-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-800/80 border border-slate-700/80 text-cyan-400 group-hover:border-cyan-400 group-hover:bg-cyan-500/10'
                    }`}
                  >
                    {opt.id}
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold tracking-wide truncate">{opt.text}</p>
                  </div>

                  {/* Lock Indicator */}
                  {isSelected ? (
                    <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-cyan-300 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 animate-pulse" />
                      <span>LOCKED</span>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <ChevronRight className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Locked Notice */}
          {isLocked && (
            <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-center animate-pulse">
              <p className="text-xs font-mono text-cyan-300 font-semibold">
                Answer choice locked in. Advancing to next question...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Integrity Bar */}
      <div className="mt-6 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>SESSION AUTHENTICATED:</span>
          <span className="text-slate-200">{participant?.name || 'Participant'}</span>
        </div>

        <div>
          <span>VIOLATIONS: </span>
          <span className={violations > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
            {violations} (Monitored)
          </span>
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageModal
        isOpen={zoomOpen}
        onClose={() => setZoomOpen(false)}
        src={question?.image}
        alt={`Question ${question?.id}`}
      />
    </div>
  );
}
