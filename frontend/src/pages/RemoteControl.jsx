import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import useCountdown from '../hooks/useCountdown';

const socket = io(import.meta.env.VITE_API_URL || '');

export default function RemoteControl() {
  const { code } = useParams();
  const navigate = useNavigate();
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('pulse_token'));
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Room state
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState('2');

  // Parse token from URL if present (scanned QR code auto-auth)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const t = searchParams.get('t');
    const r = searchParams.get('r');
    const u = searchParams.get('u');
    
    if (t && r && u) {
      localStorage.setItem('pulse_token', t);
      localStorage.setItem('pulse_role', r);
      localStorage.setItem('pulse_username', u);
      setToken(t);
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch room data and connect socket
  useEffect(() => {
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then(data => {
        setRoom(data);
        setLoading(false);
      })
      .catch(() => {
        navigate('/dashboard');
      });

    socket.emit('joinRoom', code);

    const handleRoomUpdated = (updatedRoom) => {
      if (updatedRoom.code === code.toUpperCase()) {
        setRoom(updatedRoom);
      }
    };

    socket.on('roomUpdated', handleRoomUpdated);

    socket.on('roomDeleted', () => {
      alert('Room has been deleted');
      navigate('/dashboard');
    });

    return () => {
      socket.off('roomUpdated', handleRoomUpdated);
      socket.off('roomDeleted');
    };
  }, [code, navigate, token]);

  const { formattedTime, isExpired } = useCountdown(room?.timerEndsAt);

  // Manual Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('pulse_token', data.token);
        localStorage.setItem('pulse_role', data.role);
        localStorage.setItem('pulse_username', data.username);
        setToken(data.token);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Connection error');
    }
  };

  // Socket action emitters
  const emitAction = (eventName, payload = {}) => {
    socket.emit(eventName, { code, ...payload });
  };

  const handleStartTimer = (minutes) => {
    const mins = parseFloat(minutes);
    if (!isNaN(mins) && mins > 0) {
      emitAction('startTimer', { minutes: mins });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="glass-card p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">Pulse Remote</h1>
            <p className="text-white/60 text-sm mt-1">Authenticate to control session {code}</p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="glass-input w-full text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/70 mb-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="glass-input w-full text-sm"
                required
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                {loginError}
              </div>
            )}

            <button type="submit" className="glow-button py-3 mt-2">
              Log In & Control
            </button>
          </form>
        </motion.div>
        <Footer />
      </div>
    );
  }

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/50 animate-pulse">Loading Remote Panel...</p>
      </div>
    );
  }

  const isLocked = room.isLocked || isExpired;

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto flex flex-col justify-between">
      <div>
        {/* Top bar navigation */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/dashboard" className="text-white/50 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg text-xs">
            &larr; Dashboard
          </Link>
          <Link to={`/live/${code}`} className="text-indigo-400 hover:text-indigo-300 px-3 py-1.5 bg-indigo-500/10 rounded-lg text-xs font-bold">
            Live View &rarr;
          </Link>
        </div>

        {/* Room Header */}
        <div className="glass-card p-4 mb-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-2xl font-mono font-bold text-indigo-400 tracking-widest">{code}</span>
            <span className="uppercase text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/70">
              {room.type}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white leading-tight">
            {room.question || 'Untitled Session'}
          </h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isLocked ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>
              {isLocked ? 'Closed / Paused' : 'Open / Accepting'}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${room.isHidden ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
              {room.isHidden ? 'Results Hidden' : 'Results Visible'}
            </span>
            {room.timerEndsAt && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${isExpired ? 'bg-red-500/20 text-red-300' : 'bg-indigo-500/20 text-indigo-300 animate-pulse'}`}>
                {isExpired ? 'Timer Expired' : `Timer: ${formattedTime}`}
              </span>
            )}
          </div>
        </div>

        {/* Control Center Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => emitAction('toggleRoomLock')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${isLocked ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isLocked ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              )}
            </svg>
            <span className="text-xs font-bold">{isLocked ? 'Unlock Voting' : 'Pause Voting'}</span>
          </button>

          <button
            onClick={() => emitAction('toggleRoomVisibility')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${room.isHidden ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {room.isHidden ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              )}
            </svg>
            <span className="text-xs font-bold">{room.isHidden ? 'Show Results' : 'Hide Results'}</span>
          </button>

          <button
            onClick={() => emitAction('toggleJoinInfo')}
            className="p-4 rounded-xl border bg-white/5 border-white/10 text-white/60 hover:text-white flex flex-col items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-xs font-bold">Toggle QR Overlay</span>
          </button>

          <button
            onClick={() => emitAction('toggleReactions')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${room.reactionsEnabled ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs font-bold">{room.reactionsEnabled ? 'Disable Reactions' : 'Enable Reactions'}</span>
          </button>
        </div>

        {/* Timer Control Card */}
        <div className="glass-card p-4 mb-4">
          <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Session Timer
          </h3>
          
          <div className="flex gap-2 mb-3">
            {[1, 2, 5].map(m => (
              <button
                key={m}
                onClick={() => handleStartTimer(m)}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg text-white/80 border border-white/5"
              >
                {m} Min
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value)}
              className="glass-input w-24 text-center text-sm"
              placeholder="Min"
            />
            <button
              onClick={() => handleStartTimer(timerMinutes)}
              className="flex-1 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/30"
            >
              Start Timer
            </button>
            {room.timerEndsAt && (
              <button
                onClick={() => emitAction('clearTimer')}
                className="py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg border border-red-500/30"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content Management / Live Responses */}
        <div className="glass-card p-4 mb-6">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white/70">
              Live Content ({
                room.type === 'WORDCLOUD' ? (room.words?.length || 0) :
                room.type === 'QNA' ? (room.qnaMessages?.length || 0) :
                room.type === 'OPEN_ENDED' ? (room.openAnswers?.length || 0) : 
                (room.options?.length || 0)
              })
            </h3>
            
            <button
              onClick={() => {
                if (window.confirm('Reset this room? All submissions will be lost.')) {
                  emitAction('resetRoom');
                }
              }}
              className="text-[11px] text-red-400/80 hover:text-red-400"
            >
              Clear Room Data
            </button>
          </div>

          {/* Type specific list view */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            
            {/* WORDCLOUD */}
            {room.type === 'WORDCLOUD' && (
              (!room.words || room.words.length === 0) ? (
                <p className="text-xs text-white/40 italic text-center py-4">No words submitted yet</p>
              ) : (
                [...room.words].sort((a,b) => b.count - a.count).map(w => (
                  <div key={w.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-sm text-white font-medium">{w.text} <span className="text-white/40 text-xs font-normal">({w.count}x)</span></span>
                    <button
                      onClick={() => emitAction('deleteWord', { wordId: w.id })}
                      className="text-white/20 hover:text-red-400 transition-colors"
                      title="Delete word"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )
            )}

            {/* Q&A */}
            {room.type === 'QNA' && (
              (!room.qnaMessages || room.qnaMessages.length === 0) ? (
                <p className="text-xs text-white/40 italic text-center py-4">No questions asked yet</p>
              ) : (
                room.qnaMessages.map(msg => (
                  <div key={msg.id} className="flex gap-3 items-start bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="bg-indigo-500/10 text-indigo-300 font-bold text-xs px-2 py-1 rounded min-w-[32px] text-center">
                      ▲ {msg.upvotes}
                    </div>
                    <p className="text-xs text-white/80 flex-1 leading-normal break-words">{msg.text}</p>
                    <button
                      onClick={() => emitAction('deleteQna', { messageId: msg.id })}
                      className="text-white/20 hover:text-red-400 transition-colors"
                      title="Delete question"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )
            )}

            {/* OPEN ENDED */}
            {room.type === 'OPEN_ENDED' && (
              (!room.openAnswers || room.openAnswers.length === 0) ? (
                <p className="text-xs text-white/40 italic text-center py-4">No answers submitted yet</p>
              ) : (
                room.openAnswers.map(ans => (
                  <div key={ans.id} className="flex justify-between items-start bg-white/5 p-3 rounded-lg border border-white/5 gap-3">
                    <p className="text-xs text-white/80 leading-normal flex-1 break-words">{ans.text}</p>
                    <button
                      onClick={() => emitAction('deleteOpenAnswer', { answerId: ans.id })}
                      className="text-white/20 hover:text-red-400 transition-colors"
                      title="Delete answer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )
            )}

            {/* POLL & RANKING Results */}
            {(room.type === 'POLL' || room.type === 'RANKING') && (
              room.options?.map((opt, idx) => {
                const totalVotes = room.options.reduce((sum, o) => sum + o.votes, 0) || 1;
                const percentage = Math.round((opt.votes / totalVotes) * 100);
                return (
                  <div key={opt.id} className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-medium text-white/90">
                      <span>{idx + 1}. {opt.text}</span>
                      <span>{opt.votes} {room.type === 'RANKING' ? 'pts' : 'votes'} ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}

            {/* RATING Results */}
            {room.type === 'RATING' && (
              room.options?.map(opt => {
                const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount).toFixed(1) : 0;
                return (
                  <div key={opt.id} className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-white/90">{opt.text}</span>
                      <span className="text-[10px] text-white/40">{opt.ratingCount} ratings</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-400">{avg} / 5</span>
                  </div>
                );
              })
            )}

          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}
