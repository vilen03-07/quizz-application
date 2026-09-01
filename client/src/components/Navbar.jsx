import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Activity, User, Sparkles, Terminal } from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function Navbar({ participant, role = 'participant', onToggleRole }) {
  const [muted, setMuted] = useState(soundFx.isMuted);

  const handleToggleMute = () => {
    const isNowMuted = soundFx.toggleMute();
    setMuted(isNowMuted);
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070c18]/80 border-b border-cyan-500/20 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => (window.location.href = '/')}>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-300/40">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#070c18] rounded-full animate-ping" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#070c18] rounded-full" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-sky-400">
                CYBERQUIZ
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                PRO V2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Authoritative 30s Real-Time Arena</p>
          </div>
        </div>

        {/* Center / Live status indicator */}
        <div className="hidden md:flex items-center space-x-3 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300">WEBSOCKET STREAM:</span>
          <span className="text-emerald-400 font-semibold tracking-wider">ONLINE (ACTIVE)</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center space-x-3">
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            title={muted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            className={`p-2 rounded-lg border transition-all ${
              muted
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                : 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Participant snippet or Admin Toggle */}
          {participant ? (
            <div className="flex items-center space-x-2.5 bg-slate-800/70 border border-slate-700/80 px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {participant.name?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{participant.name}</p>
                <p className="text-[10px] text-cyan-400 font-mono">Score: {participant.score || 0}</p>
              </div>
            </div>
          ) : null}

          {/* Admin Switch */}
          <button
            onClick={onToggleRole}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 text-purple-200 hover:border-purple-400 hover:text-white transition-all shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>{role === 'admin' ? 'Participant View' : 'Admin Portal'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
