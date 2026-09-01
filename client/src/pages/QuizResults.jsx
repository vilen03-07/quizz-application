import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Award,
  ExternalLink,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import ImageModal from '../components/ImageModal';

export default function QuizResults({ token, onRestart }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/quiz/review', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load results');
        setData(json);

        // Confetti fanfare
        soundFx.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#38bdf8', '#a855f7', '#10b981'],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <p className="text-sm font-mono text-cyan-300">Calculating Official Score & Debrief...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Results Error</h2>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  const { participant, review } = data;
  const accuracy = Math.round((participant.totalCorrect / review.length) * 100);

  return (
    <div className="min-h-[88vh] max-w-6xl mx-auto p-4 lg:p-8 space-y-8 relative z-10">
      {/* Top Banner / Celebration Hero */}
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-10 border border-cyan-500/30 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-300/40 mb-4">
          <Trophy className="w-10 h-10 text-white animate-bounce" />
        </div>

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-2">
          <Award className="w-3.5 h-3.5" />
          <span>QUIZ COMPLETED • LIVE TELEMETRY SUBMITTED</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white">
          Outstanding Performance, {participant.name}!
        </h1>
        <p className="text-sm text-slate-300 max-w-xl mx-auto mt-2">
          Your answers have been locked, synchronized, and logged into the administrative command leaderboard.
        </p>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20">
            <p className="text-xs uppercase font-mono text-slate-400">Total Score</p>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-sky-400 mt-1">
              {participant.score}
              <span className="text-xs text-slate-400 font-normal"> / 100</span>
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20">
            <p className="text-xs uppercase font-mono text-slate-400">Accuracy</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">
              {accuracy}%
              <span className="text-xs text-slate-400 font-normal"> ({participant.totalCorrect}/10)</span>
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-purple-500/20">
            <p className="text-xs uppercase font-mono text-slate-400">Total Time</p>
            <p className="text-3xl font-black text-purple-300 mt-1">
              {participant.totalTimeSec}s
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-amber-500/20">
            <p className="text-xs uppercase font-mono text-slate-400">Avg Speed</p>
            <p className="text-3xl font-black text-amber-400 mt-1">
              {(participant.totalTimeSec / 10).toFixed(1)}s
              <span className="text-xs text-slate-400 font-normal"> / Q</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Question Review Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Question Review & Explanations</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">10 Components Analyzed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {review.map((item, idx) => {
            const isCorrect = item.isCorrect;
            return (
              <div
                key={item.id}
                className={`glass-panel p-5 rounded-2xl border transition-all ${
                  isCorrect
                    ? 'border-emerald-500/30 hover:border-emerald-500/60'
                    : 'border-rose-500/30 hover:border-rose-500/60'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Q{idx + 1}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded flex items-center space-x-1 ${
                        isCorrect
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CORRECT</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{item.isTimedOut ? 'TIMED OUT' : 'INCORRECT'}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs font-mono text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.timeSpentSec}s</span>
                  </div>
                </div>

                {/* Image & Answers */}
                <div className="flex gap-4 items-start">
                  <div
                    onClick={() => setSelectedImage(item.image)}
                    className="w-24 h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 cursor-pointer group relative"
                  >
                    <img
                      src={item.image}
                      alt={`Question ${item.id}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <ExternalLink className="w-4 h-4 text-cyan-300" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-400">Your Selection: </span>
                      <span
                        className={`font-bold ${
                          isCorrect ? 'text-emerald-400' : 'text-rose-400 line-through'
                        }`}
                      >
                        {item.userAnswer ? `[${item.userAnswer}] ${item.userAnswerText}` : 'None (Timed Out)'}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div>
                        <span className="text-slate-400">Correct Answer: </span>
                        <span className="text-emerald-400 font-bold">
                          [{item.correctAnswer}] {item.correctAnswerText}
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 mt-2">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-6 border-t border-slate-800 text-center">
        <button
          onClick={onRestart}
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Exit Arena / Return to Lobby</span>
        </button>
      </div>

      {/* Zoom Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        src={selectedImage}
        alt="Question Review Detail"
      />
    </div>
  );
}
