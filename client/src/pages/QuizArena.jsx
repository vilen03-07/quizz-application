import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
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
        logViolation('TAB_SWITCH', 'User switched active tab/window');
      }
    };

    const handleBlur = () => {
      logViolation('WINDOW_BLUR', 'User unfocused quiz window');
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
    setViolationAlert(`Integrity Notice: ${type.replace('_', ' ')} detected and logged.`);
    setTimeout(() => setViolationAlert(null), 4000);

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

  // Socket listener
  useEffect(() => {
    if (!socket) return;

    const handleReset = (data) => {
      alert(data.message || 'Session reset by administrator.');
      window.location.reload();
    };

    const handleTimeoutAdvance = () => {
      fetchCurrentState();
    };

    socket.on('quiz:force:reset', handleReset);
    socket.on('quiz:timeout:advance', handleTimeoutAdvance);

    return () => {
      socket.off('quiz:force:reset', handleReset);
      socket.off('quiz:timeout:advance', handleTimeoutAdvance);
    };
  }, [socket, fetchCurrentState]);

  // Submit answer
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
        }, 500);
      } catch (err) {
        setError(err.message);
        setIsLocked(false);
        isSubmittingRef.current = false;
      }
    },
    [isLocked, question, token, onQuizComplete]
  );

  // 30s Countdown Clock
  useEffect(() => {
    if (loading || isLocked || !question) return;

    timerRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - questionStartTimeRef.current) / 1000;
      const left = Math.max(0, Number((DURATION_SEC - elapsedSec).toFixed(1)));
      setRemainingTime(left);

      if (Math.floor(left) <= 5 && left > 0 && Math.floor(left) !== Math.floor(left + 0.1)) {
        soundFx.playUrgentTick();
      } else if (Math.floor(left) <= 10 && left > 5 && Math.floor(left) !== Math.floor(left + 0.1)) {
        soundFx.playTick();
      }

      if (left <= 0) {
        clearInterval(timerRef.current);
        handleSelectOption(null, true);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isLocked, question, handleSelectOption]);

  // Keyboard shortcuts (A-D, 1-4)
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3 font-mono text-xs text-[#848d9f]">
        <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
        <span>SYNCING ARENA TELEMETRY...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-[#14161f] border border-[#2d3345] p-6 max-w-md w-full text-center space-y-4 font-mono">
          <AlertTriangle className="w-8 h-8 text-[#ef4444] mx-auto" />
          <h2 className="text-sm font-bold text-white uppercase">Sync Failure</h2>
          <p className="text-xs text-[#9ba3b5]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-white text-black font-bold text-xs uppercase rounded-sm"
          >
            Reload Session
          </button>
        </div>
      </div>
    );
  }

  const isCritical = remainingTime <= 6;
  const isWarning = remainingTime <= 12 && !isCritical;
  const timerBarPct = (remainingTime / DURATION_SEC) * 100;

  return (
    <div className="min-h-[85vh] max-w-6xl mx-auto px-4 lg:px-8 py-6 flex flex-col justify-between relative z-10">
      {/* Violation Alert Toast */}
      {violationAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2b1418] border border-[#ef4444] text-white px-4 py-2 text-xs font-mono flex items-center space-x-2 shadow-lg">
          <ShieldAlert className="w-4 h-4 text-[#ef4444] shrink-0" />
          <span>{violationAlert}</span>
        </div>
      )}

      {/* Top Header: Linear Progress & Digital Precision Timer */}
      <div className="bg-[#10121a] border border-[#222736] p-4 rounded-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className="bg-[#191d2a] border border-[#2d354a] text-white font-bold px-2.5 py-1 rounded-sm">
              QUESTION {String(currentQuestionIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
            </span>
            <span className="text-[#7d8699] hidden sm:inline">VISUAL IDENTIFICATION</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[#7d8699]">REMAINING:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-sm border ${
                isCritical
                  ? 'bg-[#3b1219] border-[#ef4444] text-[#ef4444]'
                  : isWarning
                  ? 'bg-[#362512] border-[#f59e0b] text-[#f59e0b]'
                  : 'bg-[#141c2d] border-[#3b82f6] text-[#60a5fa]'
              }`}
            >
              {remainingTime.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* High-contrast precision timer bar */}
        <div className="w-full bg-[#090a0f] h-1.5 rounded-none overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              isCritical ? 'bg-[#ef4444]' : isWarning ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'
            }`}
            style={{ width: `${timerBarPct}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Hardware Image Frame + 4 Tactical Option Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 items-stretch">
        
        {/* Left: Hardware Image Display */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-[#0f1118] border border-[#252b3b] p-3 rounded-sm flex-1 flex flex-col justify-center items-center relative group">
            <div
              onClick={() => setZoomOpen(true)}
              className="relative w-full h-[320px] sm:h-[380px] bg-[#07080c] flex items-center justify-center cursor-zoom-in overflow-hidden border border-[#1b1f2b]"
            >
              {question?.image ? (
                <img
                  src={question.image}
                  alt={`Hardware Component ${question.id}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-mono text-xs text-[#525a6c]">Awaiting Image...</span>
              )}

              {/* Minimal Zoom Badge */}
              <div className="absolute bottom-2 right-2 bg-[#0c0d12]/90 border border-[#282d3d] px-2 py-1 text-[10px] font-mono text-[#9ba3b5] flex items-center space-x-1 group-hover:text-white group-hover:border-[#4b546d] transition">
                <Maximize2 className="w-3 h-3" />
                <span>EXPAND / ZOOM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 4 High-Contrast Tactical Selection Buttons */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-3 font-mono">
          <div className="flex items-center justify-between text-[11px] text-[#7d8699] px-0.5">
            <span>SELECT MATCHING COMPONENT</span>
            <span>SHORTCUTS: [A, B, C, D]</span>
          </div>

          <div className="space-y-2.5">
            {question?.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  disabled={isLocked}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-sm border transition-all flex items-center space-x-4 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1d2b45] border-[#3b82f6] text-white'
                      : isLocked
                      ? 'bg-[#0e1017] border-[#1c202d] text-[#555e71] cursor-not-allowed'
                      : 'bg-[#11141c] border-[#252a3b] hover:bg-[#181c28] hover:border-[#40485f] text-[#d1d5db] hover:text-white'
                  }`}
                >
                  {/* Key Label */}
                  <div
                    className={`w-8 h-8 font-bold text-xs flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                        : 'bg-[#171a25] border-[#2f3549] text-[#9ca3af]'
                    }`}
                  >
                    {opt.id}
                  </div>

                  {/* Option Label */}
                  <div className="flex-1 font-sans font-semibold text-sm sm:text-base">
                    {opt.text}
                  </div>

                  {/* Lock Indicator */}
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-[#60a5fa] uppercase tracking-wider">
                      [LOCKED]
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Submission status note */}
          {isLocked && (
            <div className="p-2.5 bg-[#141a28] border border-[#2b3a58] text-center">
              <span className="text-[11px] font-mono text-[#93c5fd]">
                Selection locked. Synchronizing with server...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="border-t border-[#1e2230] pt-3 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#6f788b]">
        <div>
          <span>CANDIDATE: </span>
          <span className="text-white font-bold">{participant?.name}</span>
          <span className="text-[#4b5563]"> ({participant?.email})</span>
        </div>

        <div>
          <span>SECURITY VIOLATIONS: </span>
          <span className={violations > 0 ? 'text-[#ef4444] font-bold' : 'text-[#9ca3af]'}>
            {violations}
          </span>
        </div>
      </div>

      {/* Image Zoom Inspector Modal */}
      <ImageModal
        isOpen={zoomOpen}
        onClose={() => setZoomOpen(false)}
        src={question?.image}
        alt={`Question ${question?.id}`}
      />
    </div>
  );
}
