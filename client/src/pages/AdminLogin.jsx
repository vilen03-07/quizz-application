import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { soundFx } from '../utils/audio';
import { getApiUrl } from '../config';

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    soundFx.playSelect();

    try {
      const res = await fetch(getApiUrl('/api/auth/admin'), {
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
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative z-10 font-mono">
      <div className="bg-[#10121a] border border-[#262c3b] p-8 max-w-md w-full rounded-sm space-y-6">
        
        <div className="border-b border-[#202534] pb-4 text-center">
          <div className="w-10 h-10 bg-white text-black font-bold flex items-center justify-center mx-auto mb-3 text-sm">
            ADM
          </div>
          <h2 className="font-display font-bold text-lg text-white uppercase tracking-tight">
            Admin Mission Control
          </h2>
          <p className="text-[11px] text-[#717b8f] mt-0.5">
            Authenticate to monitor live telemetry streams
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#241216] border border-[#6b212e] text-[#fca5a5] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#9ba3b5] uppercase font-bold mb-1 tracking-wider text-[10px]">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-[#0a0b0f] border border-[#272d3e] focus:border-[#3b82f6] text-white px-3 py-2.5 rounded-sm focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[#9ba3b5] uppercase font-bold mb-1 tracking-wider text-[10px]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-[#0a0b0f] border border-[#272d3e] focus:border-[#3b82f6] text-white px-3 py-2.5 rounded-sm focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 rounded-sm transition cursor-pointer"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
