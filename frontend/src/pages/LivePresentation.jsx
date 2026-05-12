import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Footer from '../components/Footer';
import useCountdown from '../hooks/useCountdown';
import { exportRoomToCSV } from '../utils/exportUtils';
import { startLiveTour } from '../utils/tourUtils';

const socket = io(import.meta.env.VITE_API_URL || '');

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

const CustomWordcloud = ({ words, isAdmin, onWordClick }) => {
  const containerRef = useRef(null);
  const [placements, setPlacements] = useState([]);

  const computeLayout = useCallback(() => {
    if (words.length === 0 || !containerRef.current) return;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const cx = cw / 2;
    const cy = ch / 2;

    const max = Math.max(...words.map(w => w.value));
    const min = Math.min(...words.map(w => w.value));
    const sorted = [...words].sort((a, b) => b.value - a.value);

    // Estimate bounding boxes for each word using a hidden canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const items = sorted.map((w, i) => {
      let size;
      if (min === max) {
        size = Math.min(180, 40 + (w.value * 20));
      } else {
        const ratio = (w.value - min) / (max - min);
        // Exponent < 1 hebt mittlere Werte etwas an, für deutlichere Abstufungen.
        // Die extremen Größenunterschiede wurden leicht abgemildert, damit auch kleine Wörter lesbar bleiben.
        size = 32 + (Math.pow(ratio, 0.7) * 160);
      }

      const hash = w.text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const isVertical = i > 0 && hash % 4 === 0; // ~25% vertical, never first

      ctx.font = `900 ${size}px sans-serif`;
      const metrics = ctx.measureText(w.text);
      // Approximate text dimensions
      const textW = metrics.width;
      const textH = size * 0.85;

      return {
        ...w,
        size,
        color: COLORS[i % COLORS.length],
        isVertical,
        // For vertical text, swap width/height
        bw: isVertical ? textH : textW,
        bh: isVertical ? textW : textH,
        x: 0,
        y: 0,
      };
    });

    // Place words using Archimedean spiral (centered at 0,0)
    const placed = [];
    const OVERLAP_TOLERANCE = 0.7; // Allow 30% overlap for organic feel
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];

      if (idx === 0) {
        // Biggest word goes dead center
        item.x = -item.bw / 2;
        item.y = -item.bh / 2;
        placed.push(item);
        minX = item.x;
        maxX = item.x + item.bw;
        minY = item.y;
        maxY = item.y + item.bh;
        continue;
      }

      // Spiral search for a good position
      let angle = 0;
      const step = 0.3;
      const radiusStep = 2;
      let found = false;

      for (let attempt = 0; attempt < 3000; attempt++) {
        angle += step;
        const radius = radiusStep * angle;
        const testX = Math.cos(angle) * radius - item.bw / 2;
        const testY = Math.sin(angle) * radius - item.bh / 2;

        // Check overlap with placed words (with tolerance)
        let overlaps = false;
        for (const p of placed) {
          const overlapX = Math.max(0, Math.min(testX + item.bw, p.x + p.bw) - Math.max(testX, p.x));
          const overlapY = Math.max(0, Math.min(testY + item.bh, p.y + p.bh) - Math.max(testY, p.y));
          const overlapArea = overlapX * overlapY;
          const smallerArea = Math.min(item.bw * item.bh, p.bw * p.bh);
          
          if (overlapArea > smallerArea * (1 - OVERLAP_TOLERANCE)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          item.x = testX;
          item.y = testY;
          found = true;
          break;
        }
      }

      if (found) {
        placed.push(item);
        minX = Math.min(minX, item.x);
        maxX = Math.max(maxX, item.x + item.bw);
        minY = Math.min(minY, item.y);
        maxY = Math.max(maxY, item.y + item.bh);
      }
    }

    // Now compute scale to fit in container
    const cloudWidth = maxX - minX;
    const cloudHeight = maxY - minY;
    
    // Add padding (40px)
    const padding = 40;
    const availableW = Math.max(10, cw - padding);
    const availableH = Math.max(10, ch - padding);
    
    // Scale down if it doesn't fit
    const scale = Math.min(1, availableW / cloudWidth, availableH / cloudHeight);
    
    // Calculate offsets to center the cloud in the container
    const offsetX = cw / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = ch / 2 - ((minY + maxY) / 2) * scale;
    
    // Apply scale and offset
    placed.forEach(p => {
       p.x = p.x * scale + offsetX;
       p.y = p.y * scale + offsetY;
       p.size = p.size * scale;
       p.bw = p.bw * scale;
       p.bh = p.bh * scale;
    });

    setPlacements(placed);
  }, [words]);

  useEffect(() => {
    computeLayout();
  }, [computeLayout]);

  // Recompute on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => computeLayout());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [computeLayout]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {placements.map((item, i) => (
        <motion.span
          key={`${item.text}-${item.value}`}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: i * 0.04 }}
          style={{
            position: 'absolute',
            left: `${item.x}px`,
            top: `${item.y}px`,
            fontSize: `${item.size}px`,
            color: item.color,
            fontWeight: '900',
            writingMode: item.isVertical ? 'vertical-rl' : 'horizontal-tb',
            lineHeight: '1',
            whiteSpace: 'nowrap',
          }}
          onClick={() => isAdmin && onWordClick(item)}
          className={`drop-shadow-[0_0_12px_rgba(255,255,255,0.12)] ${isAdmin ? 'cursor-pointer hover:opacity-50 transition-opacity' : ''}`}
        >
          {item.text}
        </motion.span>
      ))}
    </div>
  );
};

export default function LivePresentation() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(true);
  
  const isAdmin = !!localStorage.getItem('pulse_token');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setRoom(data);
        setLoading(false);
      })
      .catch(() => navigate('/?error=notfound'));

    socket.emit('joinRoom', code);

    socket.on('roomUpdated', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('roomDeleted', () => {
      navigate('/?error=notfound');
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('roomDeleted');
    };
  }, [code, navigate]);

  useEffect(() => {
    if (isAdmin) {
      setTimeout(() => startLiveTour(), 500);
    }
    const handleStartTour = () => {
      if (isAdmin) startLiveTour(true);
    };
    window.addEventListener('start-tour', handleStartTour);
    return () => window.removeEventListener('start-tour', handleStartTour);
  }, [isAdmin]);

  const { timeLeft, formattedTime, isExpired } = useCountdown(room?.timerEndsAt);
  const isWarning = timeLeft !== null && timeLeft <= 20;
  
  if (loading || !room) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const totalVotes = room.type === 'POLL' ? (room.options?.reduce((acc, curr) => acc + curr.votes, 0) || 0) : 0;
  
  const wordcloudData = room.type === 'WORDCLOUD' 
    ? (room.words?.map(w => ({ id: w.id, text: w.text, value: w.count })) || [])
    : [];

  const isLocked = room.isLocked || isExpired;

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link to="/dashboard" className="text-white/50 hover:text-white px-4 py-2 bg-white/5 rounded-lg text-sm">
              &larr; Dashboard
            </Link>
          )}
          
          {isAdmin && (
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10" id="tour-admin-controls">
              <button 
                onClick={() => socket.emit('toggleRoomLock', { code })} 
                className={`p-1.5 rounded-md transition-colors ${isLocked ? 'text-yellow-400 bg-yellow-400/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title={isLocked ? 'Open poll' : 'Pause poll'}
              >
                {isLocked ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </button>
              
              <div className="w-px h-4 bg-white/10 mx-1"></div>

              {/* Session Timer Control */}
              <button 
                onClick={() => {
                  if (room.timerEndsAt) {
                    socket.emit('clearTimer', { code });
                  } else {
                    const minStr = window.prompt("Timer duration in minutes (e.g. 2 or 0.5):", "2");
                    if (minStr !== null) {
                      const minutes = parseFloat(minStr.replace(',', '.'));
                      if (!isNaN(minutes) && minutes > 0) {
                        socket.emit('startTimer', { code, minutes });
                      }
                    }
                  }
                }} 
                className={`p-1.5 rounded-md transition-colors ${room.timerEndsAt ? 'text-indigo-400 bg-indigo-400/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title={room.timerEndsAt ? 'Clear Timer' : 'Set Timer'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              <button 
                onClick={() => {
                  if (window.confirm("Are you sure? All previous answers will be deleted.")) {
                    socket.emit('resetRoom', { code });
                  }
                }}
                className="p-1.5 rounded-md transition-colors text-white/50 hover:text-red-400 hover:bg-red-400/10"
                title="Clear session"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              <button 
                onClick={() => socket.emit('toggleRoomVisibility', { code })} 
                className={`p-1.5 rounded-md transition-colors ${room.isHidden ? 'text-green-400 bg-green-400/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title={room.isHidden ? 'Show results' : 'Hide results'}
              >
                {room.isHidden ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              <button 
                onClick={() => exportRoomToCSV(room)} 
                className="p-1.5 rounded-md transition-colors text-white/50 hover:text-indigo-400 hover:bg-indigo-400/10"
                title="Export to CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>

              <div className="w-px h-4 bg-white/10 mx-1"></div>

              <button 
                onClick={() => setShowJoin(!showJoin)} 
                className={`p-1.5 rounded-md transition-colors ${showJoin ? 'text-indigo-400 bg-indigo-400/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title="Show/Hide Join Info"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
          )}
        </div>
        {showJoin && (
          <div className="glass-card px-8 py-4 flex items-center gap-6" id="tour-join-info">
            <div className="text-center">
              <p className="text-sm text-white/60 mb-1 uppercase tracking-widest font-semibold">Join via {window.location.host}</p>
              <p className="text-5xl font-mono tracking-widest font-bold text-indigo-400">{code}</p>
            </div>
            <div className="bg-white p-2 rounded-xl">
              <QRCodeSVG value={`${window.location.protocol}//${window.location.host}/${code}`} size={80} />
            </div>
          </div>
        )}
      </div>

      {room.timerEndsAt && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-card px-4 py-2 text-2xl font-mono font-bold text-white z-50">
          <svg className={`w-6 h-6 ${isWarning ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={isWarning ? 'text-red-400' : ''}>{formattedTime}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center relative z-10">
          {room.question || (
            room.type === 'POLL' ? 'Poll' :
            room.type === 'QNA' ? 'Q&A' :
            room.type === 'OPEN_ENDED' ? 'Brainstorming' :
            room.type === 'RANKING' ? 'Ranking' : 
            room.type === 'RATING' ? 'Rating' : 'Wordcloud'
          )}
        </h2>

        <div className="w-full relative flex-1 flex flex-col">
          {/* Blur Overlay */}
          {room.isHidden && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
              <svg className="w-20 h-20 text-white/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <h3 className="text-3xl font-bold text-white/80">Results hidden</h3>
            </div>
          )}
          
          {/* Content Wrapper */}
          <div className={`w-full flex-1 transition-all duration-500 ${room.isHidden ? 'blur-2xl opacity-30 pointer-events-none' : ''}`}>

        {(room.type === 'POLL' || room.type === 'RANKING') && (
          <>
            <div className="w-full h-[500px] glass-card p-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={room.type === 'RANKING' ? [...(room.options || [])].sort((a,b) => b.votes - a.votes) : (room.options || [])} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="text" type="category" width={150} tick={{ fill: 'white', fontSize: 16 }} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ backgroundColor: '#0d0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
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
            <div className="mt-3 ml-1 text-white/40 text-sm">Total {room.type === 'RANKING' ? 'Points' : 'Votes'}: {totalVotes}</div>
          </>
        )}

        {room.type === 'WORDCLOUD' && (
          <div className="w-full h-[500px] glass-card p-8 flex items-center justify-center">
            {wordcloudData.length === 0 ? (
              <p className="text-white/40 italic text-xl">Waiting for submissions...</p>
            ) : (
              <CustomWordcloud 
                words={wordcloudData} 
                isAdmin={isAdmin} 
                onWordClick={(word) => {
                  if (window.confirm(`Delete word "${word.text}"?`)) {
                    socket.emit('deleteWord', { code, wordId: word.id });
                  }
                }} 
              />
            )}
          </div>
        )}

        {room.type === 'QNA' && (
          <div className="w-full h-[500px] flex flex-col gap-4 overflow-y-auto p-4 glass-card">
            {(!room.qnaMessages || room.qnaMessages.length === 0) ? (
              <div className="flex-1 flex items-center justify-center"><p className="text-white/40 italic text-xl">Waiting for questions...</p></div>
            ) : (
              room.qnaMessages.map(msg => (
                <motion.div layout key={msg.id} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white/5 p-6 rounded-xl flex gap-6 items-center border border-white/10 relative">
                   <div className="flex flex-col items-center justify-center p-3 bg-indigo-500/20 rounded-xl min-w-[80px]">
                      <svg className="w-8 h-8 text-indigo-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      <span className="text-2xl font-bold text-white">{msg.upvotes}</span>
                   </div>
                   <div className="flex-1 pr-8">
                     <p className="text-2xl text-white/90 leading-tight break-words">{msg.text}</p>
                   </div>
                   {isAdmin && (
                     <button
                       onClick={() => socket.emit('deleteQna', { code, messageId: msg.id })}
                       className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors"
                       title="Delete question"
                     >
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="w-full h-full flex items-center justify-center"><p className="text-white/40 italic text-xl">Waiting for contributions...</p></div>
            ) : (
              room.openAnswers.map((ans, i) => (
                <motion.div 
                  layout
                  key={ans.id} 
                  initial={{opacity:0, y:20}} 
                  animate={{opacity:1, y:0}} 
                  transition={{ delay: Math.min(i * 0.1, 0.5) }}
                  className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 shadow-lg flex-grow min-w-[250px] max-w-[400px] relative pr-10"
                >
                   <p className="text-xl text-white font-medium">{ans.text}</p>
                   {isAdmin && (
                     <button
                       onClick={() => socket.emit('deleteOpenAnswer', { code, answerId: ans.id })}
                       className="absolute top-2 right-2 text-white/20 hover:text-red-400 transition-colors"
                       title="Delete contribution"
                     >
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="w-full h-[500px] glass-card p-12 flex flex-col justify-center gap-8 overflow-y-auto">
            {room.options?.map(opt => {
              const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount).toFixed(1) : 0;
              const isSingleDefault = room.options?.length === 1 && opt.text === 'Gesamtbewertung';
              return (
                <div key={opt.id} className="flex flex-col gap-3">
                  <div className={`flex ${isSingleDefault ? 'justify-end' : 'justify-between'} items-end`}>
                    {!isSingleDefault && <span className="text-2xl font-medium">{opt.text}</span>}
                    <span className="text-3xl font-bold text-indigo-400">{avg} <span className="text-sm text-white/40 font-normal">/ 5</span></span>
                  </div>
                  <div className="h-6 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${(avg / 5) * 100}%` }} 
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                  <div className="text-right text-sm text-white/30">{opt.ratingCount} Ratings</div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}
