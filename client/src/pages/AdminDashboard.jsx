import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Users,
  Trophy,
  Clock,
  ShieldAlert,
  Download,
  Megaphone,
  Image as ImageIcon,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Radio,
  Eye,
  Trash2,
  RotateCcw,
  Sparkles,
  Upload,
  BarChart3,
  Layers,
  Terminal,
  UserCheck,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function AdminDashboard({ adminToken, socket, onLogout }) {
  const [activeTab, setActiveTab] = useState('live_stream'); // 'live_stream' | 'heatmap' | 'leaderboard' | 'images' | 'logs'
  const [snapshot, setSnapshot] = useState({
    participants: [],
    leaderboard: [],
    questionAnalytics: [],
    auditLogs: [],
    questions: [],
    settings: {},
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [uploadingForQ, setUploadingForQ] = useState(null);
  const [notification, setNotification] = useState(null);

  const fileInputRef = useRef(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch initial snapshot
  const fetchSnapshot = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/snapshot', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch admin snapshot');
      setSnapshot(data);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, [adminToken]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit('admin:join');

    const handleSnapshot = (data) => {
      setSnapshot((prev) => ({ ...prev, ...data }));
    };

    const handleStreamUpdate = (data) => {
      setSnapshot((prev) => {
        const updatedParticipants = [...prev.participants];
        const idx = updatedParticipants.findIndex((p) => p.id === data.participant.id);
        if (idx >= 0) {
          updatedParticipants[idx] = { ...updatedParticipants[idx], ...data.participant };
        } else {
          updatedParticipants.unshift(data.participant);
        }

        return {
          ...prev,
          participants: updatedParticipants,
          leaderboard: data.leaderboard || prev.leaderboard,
          questionAnalytics: data.questionAnalytics || prev.questionAnalytics,
        };
      });

      // Sound notification for live events
      soundFx.playTick(1200);
    };

    const handleViolationAlert = (data) => {
      soundFx.playTimeout();
      showNotification(`🚨 Security Alert: ${data.name} triggered ${data.violation.type}`, 'error');
      fetchSnapshot();
    };

    const handleQuestionUpdated = (data) => {
      setSnapshot((prev) => ({
        ...prev,
        questions: prev.questions.map((q) => (q.id === data.questionId ? data.question : q)),
      }));
    };

    const handleParticipantDeleted = (data) => {
      setSnapshot((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== data.participantId),
        leaderboard: prev.leaderboard.filter((p) => p.id !== data.participantId),
      }));
    };

    socket.on('admin:snapshot', handleSnapshot);
    socket.on('stream:participant:update', handleStreamUpdate);
    socket.on('stream:violation:alert', handleViolationAlert);
    socket.on('stream:question:updated', handleQuestionUpdated);
    socket.on('stream:participant:deleted', handleParticipantDeleted);

    return () => {
      socket.off('admin:snapshot', handleSnapshot);
      socket.off('stream:participant:update', handleStreamUpdate);
      socket.off('stream:violation:alert', handleViolationAlert);
      socket.off('stream:question:updated', handleQuestionUpdated);
      socket.off('stream:participant:deleted', handleParticipantDeleted);
    };
  }, [socket]);

  // Send Broadcast Announcement
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setBroadcastSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ message: broadcastText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send broadcast');
      setBroadcastText('');
      showNotification('Announcement broadcasted to all participants in real-time!');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  // Reset Participant Session
  const handleResetParticipant = async (pId) => {
    if (!window.confirm('Are you sure you want to reset this participant quiz session?')) return;

    try {
      const res = await fetch(`/api/admin/participants/${pId}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset participant');
      showNotification('Participant session reset successfully.');
      fetchSnapshot();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Delete Participant
  const handleDeleteParticipant = async (pId) => {
    if (!window.confirm('Delete this participant record permanently?')) return;

    try {
      const res = await fetch(`/api/admin/participants/${pId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete participant');
      showNotification('Participant deleted.');
      if (selectedParticipant?.id === pId) setSelectedParticipant(null);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Upload Question Image
  const triggerImageUpload = (qId) => {
    setUploadingForQ(qId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForQ) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/admin/questions/${uploadingForQ}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');
      showNotification(`Image updated for Question #${uploadingForQ}!`);
      fetchSnapshot();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setUploadingForQ(null);
      e.target.value = '';
    }
  };

  // Export Leaderboard CSV
  const handleExportCSV = () => {
    window.open(`/api/admin/export/csv?token=${adminToken}`, '_blank');
  };

  // Stats calculation
  const totalCount = snapshot.participants.length;
  const onlineCount = snapshot.participants.filter((p) => p.isOnline).length;
  const inProgressCount = snapshot.participants.filter((p) => p.status === 'IN_PROGRESS').length;
  const completedCount = snapshot.participants.filter((p) => p.status === 'COMPLETED').length;
  const avgScore =
    totalCount > 0
      ? Math.round(snapshot.participants.reduce((acc, p) => acc + (p.score || 0), 0) / totalCount)
      : 0;

  // Filtered participants list
  const filteredParticipants = snapshot.participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[88vh] max-w-7xl mx-auto p-4 lg:p-8 space-y-6 relative z-10">
      {/* Hidden File Input for Image Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-semibold flex items-center space-x-2 animate-in slide-in-from-right-5 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-500 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Header & Live Telemetry Metrics */}
      <div className="glass-panel-glow rounded-3xl p-6 border border-cyan-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/25 border border-cyan-300/40">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-white">Live Admin Stream</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>STREAMING</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Real-time Participant Telemetry • Authoritative Clock • Sub-50ms WebSocket Broadcast
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSnapshot}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Stream"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Live Metrics Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-6">
          <div className="glass-panel p-3.5 rounded-2xl border border-cyan-500/20">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TOTAL PLAYERS</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
          </div>

          <div className="glass-panel p-3.5 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>ONLINE NOW</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1">{onlineCount}</p>
          </div>

          <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/20">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>IN PROGRESS</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-purple-300 mt-1">{inProgressCount}</p>
          </div>

          <div className="glass-panel p-3.5 rounded-2xl border border-sky-500/20">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>COMPLETED</span>
              <Trophy className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-sky-400 mt-1">{completedCount}</p>
          </div>

          <div className="glass-panel p-3.5 rounded-2xl border border-amber-500/20">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>AVG SCORE</span>
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {avgScore}
              <span className="text-xs text-slate-400 font-normal"> / 100</span>
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast Message Tool */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20">
        <form onSubmit={handleSendBroadcast} className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Broadcast live banner message to all participants (e.g. '5 minutes remaining!')..."
            className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            type="submit"
            disabled={broadcastSending || !broadcastText.trim()}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold tracking-wider uppercase transition disabled:opacity-50"
          >
            {broadcastSending ? 'Sending...' : 'Broadcast'}
          </button>
        </form>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'live_stream', label: 'Live Stream Grid', icon: Radio },
          { id: 'leaderboard', label: 'Ranked Leaderboard', icon: Trophy },
          { id: 'heatmap', label: 'Question Analytics & Heatmap', icon: BarChart3 },
          { id: 'images', label: 'Question Image Manager', icon: ImageIcon },
          { id: 'logs', label: 'Audit Log Feed', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/50 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE STREAM GRID */}
      {activeTab === 'live_stream' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participant by name, email, department..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
              <p className="text-sm font-semibold">No participants registered yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Share the participant link to invite players into the arena.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParticipants.map((p) => {
                const latestAnswer = p.answers && p.answers[p.answers.length - 1];
                const violationsCount = p.violations?.length || 0;

                return (
                  <div
                    key={p.id}
                    className={`glass-panel p-4.5 rounded-2xl border transition-all relative overflow-hidden ${
                      p.isOnline
                        ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          {p.isOnline && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white truncate max-w-[160px]">{p.name}</h3>
                          <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{p.email}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            p.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'IN_PROGRESS'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-cyan-300 font-bold">
                          {p.status === 'COMPLETED'
                            ? '10 / 10 (Finished)'
                            : `Q${(p.currentQuestionIndex || 0) + 1} / 10`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              p.status === 'COMPLETED'
                                ? 100
                                : (((p.currentQuestionIndex || 0) + 1) / 10) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Live Stream Telemetry details */}
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <p className="text-[10px] text-slate-400">LIVE SCORE</p>
                        <p className="text-base font-bold text-cyan-300">{p.score || 0} pts</p>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <p className="text-[10px] text-slate-400">TOTAL TIME</p>
                        <p className="text-base font-bold text-slate-200">{p.totalTimeSec || 0}s</p>
                      </div>
                    </div>

                    {/* Latest answer notification badge */}
                    {latestAnswer && (
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                        <span className="text-slate-400">Last Answered:</span>
                        <span
                          className={`font-bold flex items-center space-x-1 ${
                            latestAnswer.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <span>Q{latestAnswer.questionId}</span>
                          <span>[{latestAnswer.selectedOption || 'TIMEOUT'}]</span>
                          {latestAnswer.isCorrect ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </div>
                    )}

                    {/* Anti-cheat violation count */}
                    {violationsCount > 0 && (
                      <div className="mt-2 px-2 py-1 rounded bg-rose-950/60 border border-rose-500/40 text-[10px] font-mono text-rose-300 flex items-center space-x-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{violationsCount} Integrity Violation(s) Logged</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3.5 pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedParticipant(p)}
                        className="flex-1 py-1.5 px-3 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Telemetry</span>
                      </button>
                      <button
                        onClick={() => handleResetParticipant(p.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
                        title="Reset Quiz Progress"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteParticipant(p.id)}
                        className="p-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-400 rounded-lg transition"
                        title="Delete Participant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RANKED LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="glass-panel rounded-3xl p-6 border border-cyan-500/20 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Real-Time Leaderboard Matrix</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Sorted by High Score & Fast Response Time
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Rank</th>
                  <th className="pb-3 px-3">Participant</th>
                  <th className="pb-3 px-3">Department</th>
                  <th className="pb-3 px-3">Score</th>
                  <th className="pb-3 px-3">Accuracy</th>
                  <th className="pb-3 px-3">Time</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Violations</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {snapshot.leaderboard.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-cyan-300">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-200">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{p.email}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{p.department}</td>
                    <td className="py-3 px-3 font-black text-cyan-400 text-sm">{p.score} pts</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">{p.totalCorrect}/10</td>
                    <td className="py-3 px-3 text-purple-300">{p.totalTimeSec}s</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={p.violationsCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}
                      >
                        {p.violationsCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedParticipant(p)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION ANALYTICS & HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Real-Time Answer Distribution Heatmap</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Live aggregated response distribution across Option A, B, C, D and Timeouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshot.questionAnalytics.map((stat, index) => {
              const qObj = snapshot.questions.find((q) => q.id === stat.questionId);
              return (
                <div
                  key={stat.questionId}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs">
                        Question #{stat.questionId}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Key: Option {stat.correctAnswer} ({qObj?.correctAnswerText})
                      </span>
                    </div>

                    <div className="text-right text-xs font-mono">
                      <span className="text-slate-400">Accuracy: </span>
                      <span className="text-emerald-400 font-bold">{stat.accuracyPct}%</span>
                    </div>
                  </div>

                  {/* Distribution bars */}
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((optKey) => {
                      const count = stat.distribution[optKey] || 0;
                      const pct = stat.totalAnswered > 0 ? Math.round((count / stat.totalAnswered) * 100) : 0;
                      const isCorrect = optKey === stat.correctAnswer;
                      const optText = qObj?.options?.find((o) => o.id === optKey)?.text;

                      return (
                        <div key={optKey} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span
                              className={`flex items-center space-x-1.5 ${
                                isCorrect ? 'text-emerald-400 font-bold' : 'text-slate-300'
                              }`}
                            >
                              <span>[{optKey}]</span>
                              <span className="truncate max-w-[200px]">{optText}</span>
                              {isCorrect && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                            </span>
                            <span className="text-slate-400">
                              {count} votes ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCorrect ? 'bg-emerald-500' : 'bg-cyan-500/60'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Timeout count */}
                    {stat.distribution.TIMEOUT > 0 && (
                      <p className="text-[11px] font-mono text-rose-400 pt-1">
                        ⚠️ {stat.distribution.TIMEOUT} participant(s) ran out of time on this question.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: QUESTION IMAGE ASSET MANAGER */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>Question Image Slot Manager</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Upload and hot-swap high-resolution component images for any of the 10 questions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {snapshot.questions.map((q) => (
              <div
                key={q.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-cyan-300">Question #{q.id}</span>
                    <span className="text-emerald-400">Ans: {q.correctAnswer}</span>
                  </div>

                  <div className="h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
                    <img
                      src={q.image}
                      alt={`Question ${q.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <button
                        onClick={() => triggerImageUpload(q.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1 shadow-lg"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-200 truncate">{q.correctAnswerText}</p>
                </div>

                <button
                  onClick={() => triggerImageUpload(q.id)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            <span>Authoritative System Audit Log</span>
          </h2>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {snapshot.auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs font-mono flex items-start space-x-3"
              >
                <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    log.type.includes('VIOLATION')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : log.type.includes('COMPLETED')
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {log.type}
                </span>
                <span className="text-slate-300 flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PARTICIPANT DRILL-DOWN MODAL */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel-glow rounded-3xl p-6 max-w-2xl w-full border border-cyan-500/40 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                  {selectedParticipant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedParticipant.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedParticipant.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Metric snippet */}
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-900 p-2 rounded-xl text-center">
                <p className="text-slate-400">Score</p>
                <p className="font-bold text-cyan-400 text-base">{selectedParticipant.score || 0}</p>
              </div>
              <div className="bg-slate-900 p-2 rounded-xl text-center">
                <p className="text-slate-400">Accuracy</p>
                <p className="font-bold text-emerald-400 text-base">
                  {selectedParticipant.totalCorrect || 0}/10
                </p>
              </div>
              <div className="bg-slate-900 p-2 rounded-xl text-center">
                <p className="text-slate-400">Time</p>
                <p className="font-bold text-purple-300 text-base">{selectedParticipant.totalTimeSec || 0}s</p>
              </div>
              <div className="bg-slate-900 p-2 rounded-xl text-center">
                <p className="text-slate-400">Violations</p>
                <p
                  className={`font-bold text-base ${
                    (selectedParticipant.violations?.length || 0) > 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {selectedParticipant.violations?.length || 0}
                </p>
              </div>
            </div>

            {/* Answer details */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                Question Responses
              </h4>
              {selectedParticipant.answers?.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedParticipant.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-300">Q{ans.questionId}:</span>
                        <span className={ans.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          [{ans.selectedOption || 'TIMEOUT'}] {ans.selectedText}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-slate-400">
                        <span>{ans.timeSpentSec}s</span>
                        {ans.isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">No answers submitted yet.</p>
              )}
            </div>

            {/* Violations Log */}
            {selectedParticipant.violations?.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">
                  Anti-Cheat Violations Detected
                </h4>
                <div className="space-y-1.5">
                  {selectedParticipant.violations.map((v, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center justify-between"
                    >
                      <span>
                        {v.type}: {v.details}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
