import React, { useState, useEffect } from 'react';
import {
  Clock,
  Check,
  X,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { getApiUrl } from '../config';
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
        const res = await fetch(getApiUrl('/api/quiz/review'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load results');
        setData(json);
        soundFx.playSuccess();
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3 font-mono text-xs text-[#848d9f]">
        <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
        <span>GENERATING EVALUATION REPORT...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 font-mono">
        <div className="bg-[#14161f] border border-[#2d3345] p-6 max-w-md w-full text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#ef4444] mx-auto" />
          <h2 className="text-sm font-bold text-white uppercase">Report Error</h2>
          <p className="text-xs text-[#9ba3b5]">{error}</p>
        </div>
      </div>
    );
  }

  const { participant, review } = data;
  const accuracy = Math.round((participant.totalCorrect / review.length) * 100);

  return (
    <div className="min-h-[85vh] max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8 relative z-10">
      
      {/* Top Editorial Scorecard */}
      <div className="bg-[#10131a] border border-[#222737] p-6 sm:p-8 rounded-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1f2434] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 font-mono text-[10px] text-[#3b82f6] uppercase tracking-widest bg-[#151a29] border border-[#242e48] px-2 py-0.5 rounded-sm">
              <span>Evaluation Finalized</span>
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight pt-1">
              Assessment Report: {participant.name}
            </h1>
            <p className="text-xs font-mono text-[#7d8699]">
              Session ID: {participant.id} • Completed at {new Date(participant.completedAt || Date.now()).toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={onRestart}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#1b202e] hover:bg-[#252c3f] border border-[#30384f] text-white font-mono text-xs uppercase font-bold rounded-sm transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Lobby</span>
          </button>
        </div>

        {/* 4 High-Contrast Metrics Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div className="bg-[#0b0c11] border border-[#1d212d] p-4 rounded-sm">
            <p className="text-[10px] text-[#717b8f] uppercase tracking-wider">Final Score</p>
            <p className="text-3xl font-bold text-white mt-1">
              {participant.score}
              <span className="text-xs text-[#525a6c] font-normal"> / 100</span>
            </p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-4 rounded-sm">
            <p className="text-[10px] text-[#717b8f] uppercase tracking-wider">Accuracy Rate</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">
              {accuracy}%
              <span className="text-xs text-[#525a6c] font-normal"> ({participant.totalCorrect}/10)</span>
            </p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-4 rounded-sm">
            <p className="text-[10px] text-[#717b8f] uppercase tracking-wider">Total Time</p>
            <p className="text-3xl font-bold text-[#60a5fa] mt-1">
              {participant.totalTimeSec}s
            </p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-4 rounded-sm">
            <p className="text-[10px] text-[#717b8f] uppercase tracking-wider">Average Speed</p>
            <p className="text-3xl font-bold text-[#f59e0b] mt-1">
              {(participant.totalTimeSec / 10).toFixed(1)}s
              <span className="text-xs text-[#525a6c] font-normal"> / Q</span>
            </p>
          </div>
        </div>
      </div>

      {/* Question Review Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e2332] pb-3">
          <h2 className="font-display font-bold text-lg text-white uppercase tracking-tight">
            Itemized Hardware Review
          </h2>
          <span className="font-mono text-xs text-[#717b8f]">10 Items Logged</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {review.map((item, idx) => {
            const isCorrect = item.isCorrect;
            return (
              <div
                key={item.id}
                className="bg-[#101219] border border-[#212635] p-4 rounded-sm space-y-3 font-mono text-xs"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="bg-[#191d2a] text-white font-bold px-2 py-0.5 rounded-sm">
                      Q{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`px-2 py-0.5 font-bold rounded-sm border ${
                        isCorrect
                          ? 'bg-[#102419] border-[#10b981] text-[#34d399]'
                          : 'bg-[#2b1216] border-[#ef4444] text-[#f87171]'
                      }`}
                    >
                      {isCorrect ? 'CORRECT' : item.isTimedOut ? 'TIMED OUT' : 'INCORRECT'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-[#717b8f]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.timeSpentSec}s</span>
                  </div>
                </div>

                {/* Photo & Description */}
                <div className="flex gap-4 items-start">
                  <div
                    onClick={() => setSelectedImage(item.image)}
                    className="w-24 h-24 bg-[#08090d] border border-[#242938] shrink-0 cursor-pointer relative group overflow-hidden"
                  >
                    <img
                      src={item.image}
                      alt={`Question ${item.id}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 font-sans">
                    <div className="font-mono text-[11px]">
                      <span className="text-[#717b8f]">Your Pick: </span>
                      <span className={isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {item.userAnswer ? `[${item.userAnswer}] ${item.userAnswerText}` : 'Timed Out (None)'}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="font-mono text-[11px]">
                        <span className="text-[#717b8f]">Key: </span>
                        <span className="text-emerald-400 font-bold">
                          [{item.correctAnswer}] {item.correctAnswerText}
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-[#9ca3af] leading-relaxed pt-1 border-t border-[#1c202c]">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image Zoom Inspector Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        src={selectedImage}
        alt="Hardware Component Detail"
      />
    </div>
  );
}
