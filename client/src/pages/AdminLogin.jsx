import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    soundFx.playSelect();

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');

      localStorage.setItem('quiz_admin_token', data.token);
      soundFx.playSuccess();
      onLoginSuccess(data.token);
    } catch (err) {
      setError(err.message);
      soundFx.playTimeout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 relative z-10">
      <div className="glass-panel-glow rounded-3xl p-8 sm:p-10 max-w-md w-full border border-purple-500/30 relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/30 border border-purple-400/40 mx-auto mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white">Admin Command Center</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time live streaming & participant monitoring</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Admin Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-500/20 rounded-xl text-left">
            <p className="text-[11px] text-purple-300 font-mono">
              💡 Default Credentials: <br />
              Username: <span className="text-white font-bold">admin</span> | Password:{' '}
              <span className="text-white font-bold">admin123</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold uppercase text-xs tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 transition cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Access Command Center'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
