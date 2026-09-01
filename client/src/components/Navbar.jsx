import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Radio, ArrowUpRight } from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function Navbar({ participant, role = 'participant', onToggleRole }) {
  const [muted, setMuted] = useState(soundFx.isMuted);

  const handleToggleMute = () => {
    const isNowMuted = soundFx.toggleMute();
    setMuted(isNowMuted);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c0d12] border-b border-[#202430] px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand / Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => (window.location.href = '/')}>
          <div className="w-8 h-8 bg-white text-black font-mono font-black text-sm flex items-center justify-center rounded-sm">
            Q
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-sm tracking-tight text-white uppercase">
                Hardware Arena
              </span>
              <span className="font-mono text-[10px] text-[#6b7280] border border-[#2b303c] px-1.5 py-0.2 rounded-sm uppercase">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#8c94a5] font-mono">Authoritative 30s Real-Time Quiz</p>
          </div>
        </div>

        {/* Center: System Status */}
        <div className="hidden md:flex items-center space-x-2.5 font-mono text-[11px] text-[#9ca3af] bg-[#14161f] border border-[#262b38] px-3 py-1 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>SOCKET ENGINE:</span>
          <span className="text-white font-bold">CONNECTED</span>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Audio toggle */}
          <button
            onClick={handleToggleMute}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-sm bg-[#161822] border border-[#282d3b] text-[#9ca3af] hover:text-white hover:border-[#3e4559] transition"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Participant snippet */}
          {participant && (
            <div className="hidden sm:flex items-center space-x-2 bg-[#161822] border border-[#282d3b] px-2.5 py-1 rounded-sm text-xs font-mono">
              <span className="text-[#9ca3af]">{participant.name}</span>
              <span className="text-[#3b82f6] font-bold">[{participant.score || 0} PTS]</span>
            </div>
          )}

          {/* Role switcher */}
          <button
            onClick={onToggleRole}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#1a1d28] hover:bg-[#222736] border border-[#32384a] hover:border-[#4b546d] text-white text-xs font-mono font-medium rounded-sm transition"
          >
            <Shield className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span>{role === 'admin' ? 'Participant View' : 'Admin Panel'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
