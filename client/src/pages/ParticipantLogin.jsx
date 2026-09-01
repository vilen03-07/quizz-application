import React, { useState } from 'react';
import { ArrowRight, AlertCircle, Terminal, Shield, Clock } from 'lucide-react';
import { soundFx } from '../utils/audio';

const BADGES = [
  { id: 'ALPHA', label: 'Alpha' },
  { id: 'BRAVO', label: 'Bravo' },
  { id: 'CHARLIE', label: 'Charlie' },
  { id: 'DELTA', label: 'Delta' },
  { id: 'ECHO', label: 'Echo' },
  { id: 'FOXTROT', label: 'Foxtrot' },
];

export default function ParticipantLogin({ onLoginSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [badge, setBadge] = useState(BADGES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.');
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
          avatar: badge,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate');

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
    <div className="min-h-[85vh] max-w-7xl mx-auto px-4 lg:px-8 py-10 flex items-center justify-center relative z-10">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Asymmetrical Editorial Specification */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 font-mono text-[11px] text-[#3b82f6] uppercase tracking-widest bg-[#131622] border border-[#232a3d] px-2.5 py-1 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
              <span>Assessment Protocol #2026</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight leading-[1.1]">
              Hardware Component <br />
              <span className="text-[#9ca3af]">Visual Identification</span>
            </h1>
            
            <p className="text-sm text-[#949dae] leading-relaxed max-w-lg pt-1">
              Identify 10 high-precision hardware units from authentic macro imagery. 
              Submissions are locked authoritatively on selection and streamed live to the administrator.
            </p>
          </div>

          {/* Technical Protocol Data Table (No generic 3-card/4-card rows) */}
          <div className="border border-[#202532] bg-[#0f1117] rounded-sm divide-y divide-[#1c202a] text-xs font-mono">
            <div className="flex items-center justify-between p-3.5">
              <span className="text-[#848d9f]">Time Allowance</span>
              <span className="text-white font-bold">30.0s Per Question (Strict Auto-Advance)</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-[#848d9f]">Answer Submission</span>
              <span className="text-white font-bold">Single-Choice Lock (Zero Retry)</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-[#848d9f]">Integrity Monitor</span>
              <span className="text-white font-bold">Active Tab Blur & Window Switch Logging</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-[#848d9f]">Telemetry Stream</span>
              <span className="text-[#3b82f6] font-bold">Live WebSocket to Admin Console</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean, High-Contrast Sign-in Form */}
        <div className="lg:col-span-5">
          <div className="bg-[#11131a] border border-[#262b3a] p-6 sm:p-8 rounded-sm space-y-6">
            <div className="border-b border-[#202534] pb-4">
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-tight">
                Participant Check-in
              </h2>
              <p className="font-mono text-[11px] text-[#7d8597] mt-0.5">
                Register unique session credentials to proceed
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[#241216] border border-[#6b212e] text-[#fca5a5] text-xs font-mono flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[#9ba3b5] uppercase font-bold mb-1 tracking-wider text-[10px]">
                  Full Name <span className="text-[#3b82f6]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full bg-[#0a0b0f] border border-[#272d3e] focus:border-[#3b82f6] text-white px-3 py-2.5 rounded-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[#9ba3b5] uppercase font-bold mb-1 tracking-wider text-[10px]">
                  Email Address <span className="text-[#3b82f6]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@organization.com"
                  className="w-full bg-[#0a0b0f] border border-[#272d3e] focus:border-[#3b82f6] text-white px-3 py-2.5 rounded-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[#9ba3b5] uppercase font-bold mb-1 tracking-wider text-[10px]">
                  Department / Unit / Roll ID
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Hardware Engineering"
                  className="w-full bg-[#0a0b0f] border border-[#272d3e] focus:border-[#3b82f6] text-white px-3 py-2.5 rounded-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[#9ba3b5] uppercase font-bold mb-1.5 tracking-wider text-[10px]">
                  Callsign Badge
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BADGES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBadge(b.id)}
                      className={`py-2 px-3 text-center border text-[11px] font-bold rounded-sm transition ${
                        badge === b.id
                          ? 'bg-[#1e2738] border-[#3b82f6] text-white'
                          : 'bg-[#0c0d12] border-[#222633] text-[#7d8597] hover:border-[#353b4d] hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-mono font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 rounded-sm transition disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'INITIALIZING...' : 'START ASSESSMENT'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
