import { useState, useEffect, useId } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import useCountdown from '../hooks/useCountdown';
import useSocket from '../hooks/useSocket';
import { exportRoomToCSV } from '../utils/exportUtils';
import { startLiveTour } from '../utils/tourUtils';
import CustomWordcloud from '../components/CustomWordcloud';
import Modal from '../components/Modal';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function LivePresentation() {
  const { t } = useTranslation();
  const { code } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('pulse_token') || '';
  const isAdmin = !!token;
  const socket = useSocket(token);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerInput, setTimerInput] = useState('2');
  const [showResetModal, setShowResetModal] = useState(false);
  const [wordToDelete, setWordToDelete] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showJoin, setShowJoin] = useState(true);
  const [reactions, setReactions] = useState([]);
  const customDurationId = useId();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setReactions(prev => prev.filter(r => now - r.createdAt < 6000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (!active) return;
        setRoom(data);
        setLoading(false);
      })
      .catch(() => {
        if (active) navigate('/?error=notfound');
      });

    return () => {
      active = false;
    };
  }, [code, navigate]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      socket.emit('joinRoom', code);
    };

    const handleRoomUpdated = (updatedRoom) => {
      setRoom(updatedRoom);
    };

    const handleRoomDeleted = () => {
      navigate('/?error=notfound');
    };

    const handleJoinInfoToggled = () => {
      setShowJoin(prev => !prev);
    };

    const handleReactionReceived = ({ emoji, id }) => {
      setReactions(prev => [
        ...prev,
        {
          id,
          emoji,
          x: Math.random() * 80 + 10,
          scale: 0.6 + Math.random() * 0.8,
          duration: 3 + Math.random() * 2.5,
          rotation: (Math.random() - 0.5) * 60,
          createdAt: Date.now()
        }
      ]);
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }
    socket.on('roomUpdated', handleRoomUpdated);
    socket.on('roomDeleted', handleRoomDeleted);
    socket.on('joinInfoToggled', handleJoinInfoToggled);
    socket.on('reactionReceived', handleReactionReceived);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('roomUpdated', handleRoomUpdated);
      socket.off('roomDeleted', handleRoomDeleted);
      socket.off('joinInfoToggled', handleJoinInfoToggled);
      socket.off('reactionReceived', handleReactionReceived);
    };
  }, [socket, code, navigate]);

  useEffect(() => {
    let timer;
    if (isAdmin) {
      timer = setTimeout(() => startLiveTour(), 500);
    }
    const handleStartTour = () => {
      if (isAdmin) startLiveTour(true);
    };
    window.addEventListener('start-tour', handleStartTour);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('start-tour', handleStartTour);
    };
  }, [isAdmin]);

  const handleOpenRemoteModal = async () => {
    const baseUrl = `${window.location.protocol}//${window.location.host}/remote/${code}`;
    setShowRemoteModal(true);
    setCopySuccess(false);
    setRemoteUrl(baseUrl);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/remote-ticket`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const { ticket } = await res.json();
        setRemoteUrl(`${baseUrl}?ticket=${encodeURIComponent(ticket)}`);
      }
    } catch {
      // Fallback to unauthenticated URL (user can log in manually on mobile)
    }
  };

  const { timeLeft, formattedTime, isExpired } = useCountdown(room?.timerEndsAt);
  const isWarning = timeLeft !== null && timeLeft <= 20;

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/75" role="status" aria-live="polite">
        {t('common.loading')}
      </div>
    );
  }

  const totalVotes = room.type === 'POLL' || room.type === 'RANKING'
    ? (room.options?.reduce((acc, curr) => acc + curr.votes, 0) || 0)
    : 0;

  const wordcloudData = room.type === 'WORDCLOUD'
    ? (room.words?.map(w => ({ id: w.id, text: w.text, value: w.count })) || [])
    : [];

  const isLocked = room.isLocked || isExpired;

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Link
              to="/dashboard"
              className="min-h-11 inline-flex items-center text-white/80 hover:text-white px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              &larr; {t('common.dashboard')}
            </Link>
          )}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-1 bg-white/5 px-2 py-1.5 rounded-xl border border-white/10" id="tour-admin-controls">
              {/* 1. Pause voting */}
              <button
                type="button"
                onClick={() => socket?.emit('toggleRoomLock', { code, token })}
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isLocked ? 'text-yellow-300 bg-yellow-400/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                title={isLocked ? t('live.openPoll') : t('live.pausePoll')}
                aria-label={isLocked ? t('live.openPoll') : t('live.pausePoll')}
              >
                {isLocked ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 2. Session Timer Control */}
              <button
                type="button"
                onClick={() => {
                  if (room.timerEndsAt) {
                    socket?.emit('clearTimer', { code, token });
                  } else {
                    setShowTimerModal(true);
                  }
                }}
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${room.timerEndsAt ? 'text-indigo-300 bg-indigo-400/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                title={room.timerEndsAt ? t('live.clearTimer') : t('live.setTimer')}
                aria-label={room.timerEndsAt ? t('live.clearTimer') : t('live.setTimer')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 3. Hide/Show Results */}
              <button
                type="button"
                onClick={() => socket?.emit('toggleRoomVisibility', { code, token })}
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${room.isHidden ? 'text-green-300 bg-green-400/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                title={room.isHidden ? t('live.showResults') : t('live.hideResults')}
                aria-label={room.isHidden ? t('live.showResults') : t('live.hideResults')}
              >
                {room.isHidden ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 4. Toggle Reactions */}
              <button
                type="button"
                onClick={() => socket?.emit('toggleReactions', { code, token })}
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${room.reactionsEnabled ? 'text-red-300 bg-red-400/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                title={room.reactionsEnabled ? t('live.disableReactions') : t('live.enableReactions')}
                aria-label={room.reactionsEnabled ? t('live.disableReactions') : t('live.enableReactions')}
              >
                <svg className="w-5 h-5" fill={room.reactionsEnabled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 5. Export to CSV */}
              <button
                type="button"
                onClick={() => exportRoomToCSV(room)}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-white/75 hover:text-indigo-300 hover:bg-indigo-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                title={t('dashboard.exportCsv')}
                aria-label={t('dashboard.exportCsv')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 6. Report PDF Button */}
              <Link
                to={`/live/${code}/report`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-11 min-h-11 rounded-lg transition-colors cursor-pointer text-white/75 hover:text-indigo-300 hover:bg-indigo-400/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                title={t('report.printPdf')}
                aria-label={t('report.printPdf')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </Link>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 7. Remote Control Button */}
              <button
                type="button"
                onClick={handleOpenRemoteModal}
                className="min-w-11 min-h-11 rounded-lg transition-colors cursor-pointer text-white/75 hover:text-indigo-300 hover:bg-indigo-400/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                title={t('live.remote')}
                aria-label={t('live.remote')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <rect x="5" y="3" width="8" height="18" rx="2" strokeWidth="2" />
                  <line x1="9" y1="18" x2="9" y2="18" strokeWidth="2" strokeLinecap="round" />
                  <path d="M17 7a4 4 0 0 1 0 10M21 4a8 8 0 0 1 0 16" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 8. Reset/Clear Room Data */}
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-white/75 hover:text-red-300 hover:bg-red-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                title={t('live.clearSession')}
                aria-label={t('live.clearSession')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true"></div>

              {/* 9. Show/Hide Join Info */}
              <button
                type="button"
                onClick={() => setShowJoin(!showJoin)}
                className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${showJoin ? 'text-indigo-300 bg-indigo-400/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
                title={t('live.toggleJoinInfo')}
                aria-label={t('live.toggleJoinInfo')}
                aria-pressed={showJoin}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
          )}

          {room.timerEndsAt && (
            <div className="flex items-center gap-2 glass-card px-4 py-2 text-xl sm:text-2xl font-mono font-bold text-white">
              <svg className={`w-6 h-6 ${isWarning ? 'text-red-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={isWarning ? 'text-red-400' : ''}>{formattedTime}</span>
            </div>
          )}
        </div>

        {showJoin && (
          <div className="glass-card px-6 sm:px-8 py-4 flex items-center gap-6 ml-auto" id="tour-join-info">
            <div className="text-center">
              <p className="text-sm text-white/75 mb-1 uppercase tracking-widest font-semibold">{t('live.joinAt')} {window.location.host}</p>
              <p className="text-4xl sm:text-5xl font-mono tracking-widest font-bold text-indigo-400">{code}</p>
            </div>
            <div className="bg-white p-2 rounded-xl">
              <QRCodeSVG value={`${window.location.protocol}//${window.location.host}/${code}`} size={80} />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-center relative z-10">
          {room.question || t(`dashboard.types.${room.type || 'WORDCLOUD'}`)}
        </h1>

        <div className="w-full relative flex-1 flex flex-col">
          {/* Blur Overlay */}
          {room.isHidden && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
              <svg className="w-20 h-20 text-white/70 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <h2 className="text-3xl font-bold text-white/90">{t('live.resultsHidden')}</h2>
            </div>
          )}

          {/* Content Wrapper */}
          <div className={`w-full flex-1 transition-all duration-500 ${room.isHidden ? 'blur-2xl opacity-30 pointer-events-none' : ''}`}>

            {(room.type === 'POLL' || room.type === 'RANKING') && (
              <>
                <div className="w-full h-[500px] glass-card p-6 sm:p-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={room.type === 'RANKING' ? [...(room.options || [])].sort((a, b) => b.votes - a.votes) : (room.options || [])} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="text" type="category" width={150} tick={{ fill: 'white', fontSize: 16 }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#0d0f1a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' }}
                        itemStyle={{ color: 'white' }}
                      />
                      <Bar dataKey="votes" radius={[0, 4, 4, 0]} animationDuration={1000}>
                        {(room.options || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="votes" position="right" fill="white" fontSize={16} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 ml-1 text-white/75 text-sm">
                  {room.type === 'RANKING' ? t('live.totalPoints') : t('live.totalVotes')}: {totalVotes}
                </div>
              </>
            )}

            {room.type === 'WORDCLOUD' && (
              <div className="w-full h-[500px] glass-card p-8 flex items-center justify-center">
                {wordcloudData.length === 0 ? (
                  <p className="text-white/70 italic text-xl">{t('live.waitingForResponses')}</p>
                ) : (
                  <CustomWordcloud
                    words={wordcloudData}
                    isAdmin={isAdmin}
                    onWordClick={(word) => setWordToDelete(word)}
                  />
                )}
              </div>
            )}

            {room.type === 'QNA' && (
              <div className="w-full h-[500px] flex flex-col gap-4 overflow-y-auto p-4 glass-card">
                {(!room.qnaMessages || room.qnaMessages.length === 0) ? (
                  <div className="flex-1 flex items-center justify-center"><p className="text-white/70 italic text-xl">{t('live.waitingForQuestions')}</p></div>
                ) : (
                  room.qnaMessages.map(msg => (
                    <motion.div layout key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 p-6 rounded-xl flex gap-6 items-center border border-white/10 relative">
                      <div className="flex flex-col items-center justify-center p-3 bg-indigo-500/20 rounded-xl min-w-[80px]">
                        <svg className="w-8 h-8 text-indigo-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-2xl font-bold text-white">{msg.upvotes}</span>
                      </div>
                      <div className="flex-1 pr-10">
                        <p className="text-2xl text-white/95 leading-tight break-words">{msg.text}</p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => socket?.emit('deleteQna', { code, messageId: msg.id, token })}
                          className="absolute top-2 right-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          title={t('live.deleteQuestion')}
                          aria-label={t('live.deleteQuestion')}
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {room.type === 'OPEN_ENDED' && (
              <div className="w-full h-[500px] flex flex-wrap content-start gap-4 overflow-y-auto p-4 glass-card">
                {(!room.openAnswers || room.openAnswers.length === 0) ? (
                  <div className="w-full h-full flex items-center justify-center"><p className="text-white/70 italic text-xl">{t('live.waitingForContributions')}</p></div>
                ) : (
                  room.openAnswers.map((ans, i) => (
                    <motion.div
                      layout
                      key={ans.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.1, 0.5) }}
                      className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 shadow-lg flex-grow min-w-[250px] max-w-[400px] relative pr-12"
                    >
                      <p className="text-xl text-white font-medium">{ans.text}</p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => socket?.emit('deleteOpenAnswer', { code, answerId: ans.id, token })}
                          className="absolute top-1.5 right-1.5 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          title={t('live.deleteContribution')}
                          aria-label={t('live.deleteContribution')}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {room.type === 'RATING' && (
              <div className="w-full h-[500px] glass-card p-8 sm:p-12 flex flex-col justify-center gap-8 overflow-y-auto">
                {room.options?.map(opt => {
                  const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount).toFixed(1) : 0;
                  const isSingleDefault = room.options?.length === 1 && (opt.text === 'Gesamtbewertung' || opt.text === 'Overall Rating');
                  return (
                    <div key={opt.id} className="flex flex-col gap-3">
                      <div className={`flex ${isSingleDefault ? 'justify-end' : 'justify-between'} items-end`}>
                        {!isSingleDefault && <span className="text-2xl font-medium">{opt.text}</span>}
                        <span className="text-3xl font-bold text-indigo-400">{avg} <span className="text-sm text-white/70 font-normal">/ 5</span></span>
                      </div>
                      <div className="h-6 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(avg / 5) * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        />
                      </div>
                      <div className="text-right text-sm text-white/70">{t('live.ratingsCount', { count: opt.ratingCount })}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
      <Footer showHelp={true} />

      {/* Live Reactions Floating Canvas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
        {reactions.map(r => (
          <motion.div
            key={r.id}
            initial={{ y: '105vh', x: `${r.x}vw`, scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{
              y: '-10vh',
              scale: [0.3, r.scale, r.scale, r.scale * 0.8],
              opacity: [0, 1, 1, 0],
              rotate: r.rotation
            }}
            transition={{
              duration: r.duration,
              ease: 'easeOut',
              times: [0, 0.1, 0.8, 1]
            }}
            className="absolute text-5xl select-none filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          >
            {r.emoji}
          </motion.div>
        ))}
      </div>

      {/* Timer Modal */}
      <Modal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        title={t('live.timerModalTitle')}
        description={t('live.timerModalDesc')}
        confirmText={t('live.startTimer')}
        onConfirm={() => {
          const minutes = parseFloat(timerInput.replace(',', '.'));
          if (!isNaN(minutes) && minutes > 0) {
            socket?.emit('startTimer', { code, minutes, token });
            setShowTimerModal(false);
          }
        }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setTimerInput(m.toString())}
                className={`min-h-11 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  timerInput === m.toString()
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {m} Min
              </button>
            ))}
          </div>
          <div>
            <label htmlFor={customDurationId} className="block text-xs font-medium text-white/80 mb-1.5">{t('live.customDuration')}</label>
            <input
              id={customDurationId}
              type="number"
              min="0.5"
              step="0.5"
              value={timerInput}
              onChange={(e) => setTimerInput(e.target.value)}
              className="glass-input w-full text-base font-mono"
              placeholder="e.g. 3"
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* Reset Room Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title={t('live.resetModalTitle')}
        description={t('live.resetModalDesc')}
        confirmText={t('live.resetConfirm')}
        confirmVariant="danger"
        onConfirm={() => {
          socket?.emit('resetRoom', { code, token });
          setShowResetModal(false);
        }}
      />

      {/* Delete Word Modal */}
      <Modal
        isOpen={!!wordToDelete}
        onClose={() => setWordToDelete(null)}
        title={t('live.deleteWordTitle')}
        description={t('live.deleteWordDesc', { word: wordToDelete?.text || '' })}
        confirmText={t('live.deleteWordConfirm')}
        confirmVariant="danger"
        onConfirm={() => {
          if (wordToDelete) {
            socket?.emit('deleteWord', { code, wordId: wordToDelete.id, token });
            setWordToDelete(null);
          }
        }}
      />

      {/* Remote Control Modal */}
      <Modal
        isOpen={showRemoteModal}
        onClose={() => {
          setShowRemoteModal(false);
          setCopySuccess(false);
        }}
        title={t('live.remoteModalTitle')}
        description={t('live.remoteModalDesc')}
      >
        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-xl">
            <QRCodeSVG
              value={remoteUrl || `${window.location.protocol}//${window.location.host}/remote/${code}`}
              size={190}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(remoteUrl || `${window.location.protocol}//${window.location.host}/remote/${code}`);
              setCopySuccess(true);
              setTimeout(() => setCopySuccess(false), 3000);
            }}
            className="glow-button min-h-11 py-2.5 px-6 text-sm font-bold w-full cursor-pointer flex items-center justify-center gap-2"
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('live.copiedLink')}
              </>
            ) : (
              t('live.copyRemoteLink')
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
