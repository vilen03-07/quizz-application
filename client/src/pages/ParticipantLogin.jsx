import React, { useState } from 'react';
import { Sparkles, User, Mail, Building, ArrowRight, ShieldCheck, Clock, AlertTriangle, Eye } from 'lucide-react';
import { soundFx } from '../utils/audio';

const AVATARS = [
  { id: 'avatar-1', label: 'Cyber Ninja', icon: '⚡' },
  { id: 'avatar-2', label: 'Quantum Hacker', icon: '🔮' },
  { id: 'avatar-3', label: 'Tech Architect', icon: '💎' },
  { id: 'avatar-4', label: 'Code Samurai', icon: '⚔️' },
  { id: 'avatar-5', label: 'Circuit Master', icon: '🚀' },
  { id: 'avatar-6', label: 'AI Specialist', icon: '🤖' },
];

export default function ParticipantLogin({ onLoginSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill in both your full name and email address.');
      soundFx.playTimeout();
      return;
    }

    setLoading(true);
    setError('');
    soundFx.playSelect();

    try {
      const res = await fetch('/api/auth/participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department: department.trim() || 'General',
          avatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      localStorage.setItem('quiz_token', data.token);
      localStorage.setItem('quiz_participant', JSON.stringify(data.participant));
      soundFx.playSuccess();
      onLoginSuccess(data.participant, data.token);
    } catch (err) {
      setError(err.message);
      soundFx.playTimeout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center p-4 lg:p-8 relative z-10">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left hero / Rules briefing */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>REAL-TIME HARDWARE & TECH QUIZ</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Test Your Tech Knowledge <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
                In The Real-Time Arena
              </span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Identify 10 high-tech hardware components from ultra-high-definition imagery. Your progress and selections are streamed live to the administrator.
            </p>
          </div>

          {/* Rules Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="glass-panel p-3.5 rounded-xl border border-cyan-500/20 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">30s Per Question</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Authoritative countdown with automatic submission</p>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-purple-500/20 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Zero Retry Lock</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Single selection locks instantly. No backtracking</p>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/20 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Live Admin Stream</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time telemetry and score broadcasts</p>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-amber-500/20 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Anti-Cheat Monitor</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Tab-switching & blur events flagged in real-time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right login form card */}
        <div className="lg:col-span-6">
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-cyan-500/30 relative">
            <div className="mb-6 text-left">
              <h2 className="text-2xl font-black text-white tracking-wide">Participant Portal</h2>
              <p className="text-xs text-slate-400 mt-1">Enter your details to generate your verified quiz session</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Full Name <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nageshwar Rao"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Email Address <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. nageshwar@domain.com"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition"
                  />
                </div>
              </div>

              {/* Department / Team */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Department / Organization / Roll No. (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering / Tech Team"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Choose Player Badge
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatar(av.id)}
                      className={`p-2.5 rounded-xl border text-xl flex flex-col items-center justify-center transition-all ${
                        avatar === av.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 scale-105 shadow-md shadow-cyan-500/30'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                      title={av.label}
                    >
                      <span>{av.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit / Enter Arena */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 hover:from-cyan-400 hover:via-sky-400 hover:to-purple-500 text-white font-black tracking-wider uppercase text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Initializing Session...' : 'Enter Quiz Arena'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
