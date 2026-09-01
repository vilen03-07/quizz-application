import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Trophy,
  Clock,
  Download,
  Megaphone,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  Radio,
  Eye,
  Trash2,
  RotateCcw,
  Upload,
  BarChart2,
  Terminal,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { getApiUrl } from '../config';

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

  const fetchSnapshot = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/admin/snapshot'), {
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

      soundFx.playTick(1200);
    };

    const handleViolationAlert = (data) => {
      soundFx.playTimeout();
      showNotification(`Violation Alert: ${data.name} [${data.violation.type}]`, 'error');
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

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setBroadcastSending(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/broadcast'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ message: broadcastText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to broadcast');
      setBroadcastText('');
      showNotification('Announcement broadcasted in real-time.');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleResetParticipant = async (pId) => {
    if (!window.confirm('Reset this participant session?')) return;

    try {
      const res = await fetch(getApiUrl(`/api/admin/participants/${pId}/reset`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset participant');
      showNotification('Participant session reset.');
      fetchSnapshot();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteParticipant = async (pId) => {
    if (!window.confirm('Permanently delete participant?')) return;

    try {
      const res = await fetch(getApiUrl(`/api/admin/participants/${pId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      showNotification('Participant deleted.');
      if (selectedParticipant?.id === pId) setSelectedParticipant(null);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

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
      const res = await fetch(getApiUrl(`/api/admin/questions/${uploadingForQ}/image`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload');
      showNotification(`Image updated for Question #${uploadingForQ}!`);
      fetchSnapshot();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setUploadingForQ(null);
      e.target.value = '';
    }
  };

  const handleExportCSV = () => {
    window.open(getApiUrl(`/api/admin/export/csv?token=${adminToken}`), '_blank');
  };

  const totalCount = snapshot.participants.length;
  const onlineCount = snapshot.participants.filter((p) => p.isOnline).length;
  const inProgressCount = snapshot.participants.filter((p) => p.status === 'IN_PROGRESS').length;
  const completedCount = snapshot.participants.filter((p) => p.status === 'COMPLETED').length;
  const avgScore =
    totalCount > 0
      ? Math.round(snapshot.participants.reduce((acc, p) => acc + (p.score || 0), 0) / totalCount)
      : 0;

  const filteredParticipants = snapshot.participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[85vh] max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6 relative z-10 font-mono">
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
          className={`fixed top-16 right-6 z-50 px-4 py-2 text-xs font-bold border ${
            notification.type === 'error'
              ? 'bg-[#2b1216] border-[#ef4444] text-[#fca5a5]'
              : 'bg-[#0f241a] border-[#10b981] text-[#6ee7b7]'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="bg-[#10121a] border border-[#232839] p-6 rounded-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1f2434] pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display font-bold text-2xl text-white uppercase tracking-tight">
                Live Admin Stream
              </h1>
              <span className="px-2 py-0.5 bg-[#0f241a] border border-[#10b981] text-emerald-400 text-[10px] font-bold">
                STREAMING LIVE
              </span>
            </div>
            <p className="text-xs text-[#717b8f] mt-0.5">
              Authoritative 30s Countdown Engine • Sub-50ms Socket Telemetry
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={fetchSnapshot}
              className="p-2 bg-[#171b26] hover:bg-[#202534] border border-[#2d3447] text-white transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-[#241316] hover:bg-[#381a20] border border-[#6b212e] text-[#fca5a5] text-xs font-bold rounded-sm transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* 5 High-Contrast Data Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#0b0c11] border border-[#1d212d] p-3.5 rounded-sm">
            <span className="text-[10px] text-[#717b8f] uppercase">Total Candidates</span>
            <p className="text-2xl font-bold text-white mt-0.5">{totalCount}</p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-3.5 rounded-sm">
            <span className="text-[10px] text-[#717b8f] uppercase">Online Now</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{onlineCount}</p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-3.5 rounded-sm">
            <span className="text-[10px] text-[#717b8f] uppercase">In Progress</span>
            <p className="text-2xl font-bold text-[#60a5fa] mt-0.5">{inProgressCount}</p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-3.5 rounded-sm">
            <span className="text-[10px] text-[#717b8f] uppercase">Completed</span>
            <p className="text-2xl font-bold text-white mt-0.5">{completedCount}</p>
          </div>

          <div className="bg-[#0b0c11] border border-[#1d212d] p-3.5 rounded-sm">
            <span className="text-[10px] text-[#717b8f] uppercase">Average Score</span>
            <p className="text-2xl font-bold text-[#f59e0b] mt-0.5">{avgScore} / 100</p>
          </div>
        </div>
      </div>

      {/* Real-time Broadcast Console */}
      <div className="bg-[#10121a] border border-[#232839] p-3 rounded-sm">
        <form onSubmit={handleSendBroadcast} className="flex items-center space-x-2">
          <Megaphone className="w-4 h-4 text-[#717b8f] shrink-0 ml-2" />
          <input
            type="text"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Broadcast live announcement banner to all active participants..."
            className="flex-1 bg-[#0a0b0f] border border-[#232839] px-3 py-2 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#3b82f6]"
          />
          <button
            type="submit"
            disabled={broadcastSending || !broadcastText.trim()}
            className="px-4 py-2 bg-[#1b202e] hover:bg-[#252c3f] border border-[#30384f] text-white text-xs font-bold uppercase transition disabled:opacity-50"
          >
            {broadcastSending ? 'Sending...' : 'Broadcast'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#202535] pb-2 overflow-x-auto text-xs">
        {[
          { id: 'live_stream', label: 'Live Stream Grid' },
          { id: 'leaderboard', label: 'Leaderboard Table' },
          { id: 'heatmap', label: 'Answer Distribution Heatmap' },
          { id: 'images', label: 'Question Image Manager' },
          { id: 'logs', label: 'Audit Log Feed' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 font-bold uppercase rounded-sm transition whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-[#12141c] border border-[#232837] text-[#717b8f] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE STREAM GRID */}
      {activeTab === 'live_stream' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-[#717b8f] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name, email, department..."
              className="w-full bg-[#0a0b0f] border border-[#232839] pl-9 pr-3 py-2 text-xs text-white placeholder-[#525a6c] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="bg-[#10121a] border border-[#232839] p-8 text-center text-[#717b8f] text-xs">
              No participant records found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParticipants.map((p) => {
                const latestAnswer = p.answers && p.answers[p.answers.length - 1];
                const violationsCount = p.violations?.length || 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-[#10121a] border p-4 rounded-sm space-y-3 ${
                      p.isOnline ? 'border-[#3b82f6]' : 'border-[#232839]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">{p.name}</span>
                          {p.isOnline && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#717b8f] truncate max-w-[180px]">{p.email}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          p.status === 'COMPLETED'
                            ? 'bg-[#0f241a] text-emerald-400 border border-[#10b981]'
                            : p.status === 'IN_PROGRESS'
                            ? 'bg-[#141c2d] text-[#60a5fa] border border-[#3b82f6]'
                            : 'bg-[#161822] text-[#717b8f]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-[#717b8f]">
                        <span>PROGRESS</span>
                        <span className="text-white font-bold">
                          {p.status === 'COMPLETED' ? '10/10' : `Q${(p.currentQuestionIndex || 0) + 1}/10`}
                        </span>
                      </div>
                      <div className="w-full bg-[#08090d] h-1">
                        <div
                          className="bg-[#3b82f6] h-full"
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

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#0b0c11] border border-[#1d212d] p-2.5">
                      <div>
                        <span className="text-[10px] text-[#717b8f]">SCORE</span>
                        <p className="font-bold text-white">{p.score || 0} pts</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#717b8f]">TOTAL TIME</span>
                        <p className="font-bold text-white">{p.totalTimeSec || 0}s</p>
                      </div>
                    </div>

                    {latestAnswer && (
                      <div className="text-[11px] p-2 bg-[#090b10] border border-[#1d222e] flex items-center justify-between">
                        <span className="text-[#717b8f]">Last: Q{latestAnswer.questionId}</span>
                        <span className={latestAnswer.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          [{latestAnswer.selectedOption || 'TIMEOUT'}] {latestAnswer.isCorrect ? 'CORRECT' : 'INCORRECT'}
                        </span>
                      </div>
                    )}

                    {violationsCount > 0 && (
                      <div className="text-[10px] text-[#fca5a5] bg-[#291317] border border-[#ef4444] px-2 py-1">
                        {violationsCount} Integrity Violation(s) Logged
                      </div>
                    )}

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => setSelectedParticipant(p)}
                        className="flex-1 py-1.5 bg-[#171b26] hover:bg-[#222838] border border-[#2d3447] text-white text-xs font-bold rounded-sm transition"
                      >
                        Inspect Telemetry
                      </button>
                      <button
                        onClick={() => handleResetParticipant(p.id)}
                        className="p-1.5 bg-[#171b26] hover:bg-[#222838] border border-[#2d3447] text-[#9ca3af] hover:text-white rounded-sm"
                        title="Reset Session"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteParticipant(p.id)}
                        className="p-1.5 bg-[#2b1216] hover:bg-[#3d1a20] border border-[#ef4444] text-[#ef4444] rounded-sm"
                        title="Delete Candidate"
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

      {/* TAB 2: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#10121a] border border-[#232839] p-5 rounded-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#202535] text-[#717b8f] uppercase">
                <th className="pb-3 px-2">Rank</th>
                <th className="pb-3 px-2">Candidate</th>
                <th className="pb-3 px-2">Department</th>
                <th className="pb-3 px-2">Score</th>
                <th className="pb-3 px-2">Accuracy</th>
                <th className="pb-3 px-2">Time</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Violations</th>
                <th className="pb-3 px-2 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b202c]">
              {snapshot.leaderboard.map((p, idx) => (
                <tr key={p.id} className="hover:bg-[#151824] transition">
                  <td className="py-3 px-2 font-bold text-white">#{idx + 1}</td>
                  <td className="py-3 px-2">
                    <p className="font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-[#717b8f]">{p.email}</p>
                  </td>
                  <td className="py-3 px-2 text-[#9ca3af]">{p.department}</td>
                  <td className="py-3 px-2 font-bold text-white">{p.score} pts</td>
                  <td className="py-3 px-2 text-emerald-400 font-bold">{p.totalCorrect}/10</td>
                  <td className="py-3 px-2 text-[#60a5fa]">{p.totalTimeSec}s</td>
                  <td className="py-3 px-2">
                    <span className="px-1.5 py-0.5 bg-[#171b26] text-white text-[10px] font-bold">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={p.violationsCount > 0 ? 'text-[#ef4444] font-bold' : 'text-[#717b8f]'}>
                      {p.violationsCount}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => setSelectedParticipant(p)}
                      className="p-1 bg-[#1c2130] hover:bg-[#252c40] text-white rounded-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshot.questionAnalytics.map((stat) => {
            const qObj = snapshot.questions.find((q) => q.id === stat.questionId);
            return (
              <div key={stat.questionId} className="bg-[#10121a] border border-[#232839] p-4 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Question #{stat.questionId} (Key: {stat.correctAnswer})
                  </span>
                  <span className="text-emerald-400 text-xs font-bold">
                    Accuracy: {stat.accuracyPct}%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {['A', 'B', 'C', 'D'].map((optKey) => {
                    const count = stat.distribution[optKey] || 0;
                    const pct = stat.totalAnswered > 0 ? Math.round((count / stat.totalAnswered) * 100) : 0;
                    const isCorrect = optKey === stat.correctAnswer;
                    const optText = qObj?.options?.find((o) => o.id === optKey)?.text;

                    return (
                      <div key={optKey} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className={isCorrect ? 'text-emerald-400 font-bold' : 'text-[#9ca3af]'}>
                            [{optKey}] {optText} {isCorrect && '✓'}
                          </span>
                          <span className="text-[#717b8f]">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#08090d] h-1.5">
                          <div
                            className={`h-full ${isCorrect ? 'bg-emerald-500' : 'bg-[#3b82f6]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: IMAGE MANAGER */}
      {activeTab === 'images' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {snapshot.questions.map((q) => (
            <div key={q.id} className="bg-[#10121a] border border-[#232839] p-3 rounded-sm space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white">Q#{q.id}</span>
                  <span className="text-emerald-400">Key: {q.correctAnswer}</span>
                </div>

                <div className="h-32 bg-[#07080c] border border-[#1d222e] flex items-center justify-center overflow-hidden">
                  <img src={q.image} alt={`Q${q.id}`} className="w-full h-full object-contain" />
                </div>

                <p className="text-[11px] text-[#9ca3af] truncate">{q.correctAnswerText}</p>
              </div>

              <button
                onClick={() => triggerImageUpload(q.id)}
                className="w-full py-1.5 bg-[#171b26] hover:bg-[#202534] border border-[#2d3447] text-white text-xs font-bold flex items-center justify-center space-x-1 transition"
              >
                <Upload className="w-3 h-3" />
                <span>Replace Image</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#10121a] border border-[#232839] p-4 rounded-sm space-y-2 max-h-[500px] overflow-y-auto text-xs">
          {snapshot.auditLogs.map((log) => (
            <div key={log.id} className="p-2 bg-[#0a0b0f] border border-[#1c202d] flex items-start space-x-2">
              <span className="text-[10px] text-[#525a6c] whitespace-nowrap mt-0.5">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-white font-bold">[{log.type}]</span>
              <span className="text-[#9ca3af]">{log.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* DRILL-DOWN MODAL */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
          <div className="bg-[#10121a] border border-[#2d3447] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 rounded-sm">
            <div className="flex items-center justify-between border-b border-[#202535] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">{selectedParticipant.name}</h3>
                <p className="text-xs text-[#717b8f]">{selectedParticipant.email}</p>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="p-1 bg-[#171b26] text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs bg-[#0a0b0f] p-3 border border-[#1c202d]">
              <div>
                <span className="text-[#717b8f] text-[10px]">Score</span>
                <p className="font-bold text-white">{selectedParticipant.score || 0}</p>
              </div>
              <div>
                <span className="text-[#717b8f] text-[10px]">Correct</span>
                <p className="font-bold text-emerald-400">{selectedParticipant.totalCorrect || 0}/10</p>
              </div>
              <div>
                <span className="text-[#717b8f] text-[10px]">Total Time</span>
                <p className="font-bold text-[#60a5fa]">{selectedParticipant.totalTimeSec || 0}s</p>
              </div>
              <div>
                <span className="text-[#717b8f] text-[10px]">Violations</span>
                <p className="font-bold text-[#ef4444]">{selectedParticipant.violations?.length || 0}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-white uppercase text-[10px]">Answer Submissions:</span>
              {selectedParticipant.answers?.map((ans, i) => (
                <div key={i} className="p-2 bg-[#0a0b0f] border border-[#1c202d] flex items-center justify-between">
                  <span>
                    Q{ans.questionId}: [{ans.selectedOption || 'TIMEOUT'}] {ans.selectedText}
                  </span>
                  <span className={ans.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {ans.isCorrect ? 'CORRECT' : 'INCORRECT'} ({ans.timeSpentSec}s)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
