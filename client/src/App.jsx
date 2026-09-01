import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import BackgroundCanvas from './components/BackgroundCanvas';
import BroadcastBanner from './components/BroadcastBanner';
import ParticipantLogin from './pages/ParticipantLogin';
import QuizArena from './pages/QuizArena';
import QuizResults from './pages/QuizResults';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [role, setRole] = useState('participant'); // 'participant' | 'admin'
  const [participant, setParticipant] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz_participant');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('quiz_token') || '');
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('quiz_admin_token') || '');
  const [quizCompletedData, setQuizCompletedData] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.io
  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('Connected to Real-Time Quiz WebSocket');
      if (participant?.id) {
        s.emit('participant:join', { participantId: participant.id });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Update participant room join when participant changes
  useEffect(() => {
    if (socket && participant?.id) {
      socket.emit('participant:join', { participantId: participant.id });
    }
  }, [socket, participant]);

  const handleParticipantLogin = (pData, pToken) => {
    setParticipant(pData);
    setToken(pToken);
    setQuizCompletedData(null);
    if (socket && pData?.id) {
      socket.emit('participant:join', { participantId: pData.id });
    }
  };

  const handleAdminLogin = (aToken) => {
    setAdminToken(aToken);
    setRole('admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('quiz_admin_token');
    setAdminToken('');
    setRole('participant');
  };

  const handleRestart = () => {
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_participant');
    setParticipant(null);
    setToken('');
    setQuizCompletedData(null);
  };

  const toggleRole = () => {
    setRole((prev) => (prev === 'admin' ? 'participant' : 'admin'));
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Canvas Background Particles */}
      <BackgroundCanvas />

      {/* Real-time Admin Announcements Banner */}
      <BroadcastBanner socket={socket} />

      {/* Top Navbar */}
      <Navbar participant={participant} role={role} onToggleRole={toggleRole} />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col relative z-10">
        {role === 'admin' ? (
          adminToken ? (
            <AdminDashboard
              adminToken={adminToken}
              socket={socket}
              onLogout={handleAdminLogout}
            />
          ) : (
            <AdminLogin onLoginSuccess={handleAdminLogin} />
          )
        ) : (
          /* Participant Flow */
          !token || !participant ? (
            <ParticipantLogin onLoginSuccess={handleParticipantLogin} />
          ) : quizCompletedData ? (
            <QuizResults token={token} onRestart={handleRestart} />
          ) : (
            <QuizArena
              token={token}
              participant={participant}
              socket={socket}
              onQuizComplete={(data) => setQuizCompletedData(data)}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-4 px-6 text-center text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>CYBERQUIZ PRO • HARDWARE IDENTIFICATION ARENA</span>
        </div>
        <div>
          <span>AUTHORITATIVE 30S TIMER • WEBSOCKET STREAMING</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
