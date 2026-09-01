import React, { useEffect, useState } from 'react';
import { Megaphone, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function BroadcastBanner({ socket }) {
  const [broadcasts, setBroadcasts] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleBroadcast = (data) => {
      soundFx.playSuccess();
      setBroadcasts((prev) => [data, ...prev]);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setBroadcasts((prev) => prev.filter((b) => b.id !== data.id));
      }, 10000);
    };

    socket.on('client:broadcast:message', handleBroadcast);

    return () => {
      socket.off('client:broadcast:message', handleBroadcast);
    };
  }, [socket]);

  if (broadcasts.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none space-y-2">
      {broadcasts.map((b) => (
        <div
          key={b.id}
          className="pointer-events-auto flex items-start space-x-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-purple-950/95 border-2 border-cyan-400/60 shadow-2xl shadow-cyan-500/30 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300"
        >
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
            <Megaphone className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                Official Broadcast
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(b.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 mt-1 leading-relaxed">{b.message}</p>
          </div>
          <button
            onClick={() => setBroadcasts((prev) => prev.filter((item) => item.id !== b.id))}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
