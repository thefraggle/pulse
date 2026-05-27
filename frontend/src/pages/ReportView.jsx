import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

// Reusable CustomWordcloud component (configured to render instantly without transition lags for printing)
const CustomWordcloud = ({ words }) => {
  const containerRef = useRef(null);
  const [placements, setPlacements] = useState([]);

  const computeLayout = useCallback(() => {
    if (words.length === 0 || !containerRef.current) return;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const max = Math.max(...words.map(w => w.value));
    const min = Math.min(...words.map(w => w.value));
    const sorted = [...words].sort((a, b) => b.value - a.value);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const items = sorted.map((w, i) => {
      let size;
      if (min === max) {
        size = Math.min(100, 30 + (w.value * 10));
      } else {
        const ratio = (w.value - min) / (max - min);
        size = 24 + (Math.pow(ratio, 0.7) * 70);
      }

      const hash = w.text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const isVertical = i > 0 && hash % 4 === 0;

      ctx.font = `900 ${size}px sans-serif`;
      const metrics = ctx.measureText(w.text);
      const textW = metrics.width;
      const textH = size * 0.85;

      return {
        ...w,
        size,
        color: COLORS[i % COLORS.length],
        isVertical,
        bw: isVertical ? textH : textW,
        bh: isVertical ? textW : textH,
        x: 0,
        y: 0,
      };
    });

    const placed = [];
    const OVERLAP_TOLERANCE = 0.7;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];

      if (idx === 0) {
        item.x = -item.bw / 2;
        item.y = -item.bh / 2;
        placed.push(item);
        minX = item.x;
        maxX = item.x + item.bw;
        minY = item.y;
        maxY = item.y + item.bh;
        continue;
      }

      let angle = 0;
      const step = 0.3;
      const radiusStep = 2;
      let found = false;

      for (let attempt = 0; attempt < 1500; attempt++) {
        angle += step;
        const radius = radiusStep * angle;
        const testX = Math.cos(angle) * radius - item.bw / 2;
        const testY = Math.sin(angle) * radius - item.bh / 2;

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

    const cloudWidth = maxX - minX;
    const cloudHeight = maxY - minY;
    const padding = 20;
    const availableW = Math.max(10, cw - padding);
    const availableH = Math.max(10, ch - padding);
    
    const scale = Math.min(1, availableW / cloudWidth, availableH / cloudHeight);
    
    const offsetX = cw / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = ch / 2 - ((minY + maxY) / 2) * scale;
    
    placed.forEach(p => {
       p.x = p.x * scale + offsetX;
       p.y = p.y * scale + offsetY;
       p.size = p.size * scale;
    });

    setPlacements(placed);
  }, [words]);

  useEffect(() => {
    computeLayout();
  }, [computeLayout]);

  useEffect(() => {
    const observer = new ResizeObserver(() => computeLayout());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [computeLayout]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {placements.map((item) => (
        <span
          key={`${item.text}-${item.value}`}
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
          className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] print:drop-shadow-none"
        >
          {item.text}
        </span>
      ))}
    </div>
  );
};

export default function ReportView() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [code, navigate]);

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center print:hidden">
        <p className="text-white/50 animate-pulse">Loading Report View...</p>
      </div>
    );
  }

  // Helper metrics
  const totalVotes = room.type === 'POLL' ? (room.options?.reduce((acc, curr) => acc + curr.votes, 0) || 0) : 0;
  const totalPoints = room.type === 'RANKING' ? (room.options?.reduce((acc, curr) => acc + curr.votes, 0) || 0) : 0;
  const totalWords = room.type === 'WORDCLOUD' ? (room.words?.reduce((acc, curr) => acc + curr.count, 0) || 0) : 0;
  const totalQna = room.qnaMessages?.length || 0;
  const totalOpen = room.openAnswers?.length || 0;
  const totalRatings = room.type === 'RATING' ? (room.options?.reduce((acc, curr) => acc + curr.ratingCount, 0) || 0) : 0;

  const wordcloudData = room.type === 'WORDCLOUD' 
    ? (room.words?.map(w => ({ id: w.id, text: w.text, value: w.count })) || [])
    : [];

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white print:bg-white print:text-black font-sans selection:bg-indigo-500 selection:text-white pb-12 print:pb-0">
      
      {/* Custom print styles to support text-color switching automatically */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
            color: black !important;
          }
          .print-text-color {
            color: black !important;
          }
          .recharts-text {
            fill: black !important;
          }
        }
      `}</style>

      {/* Action Header - Hidden during print */}
      <div className="sticky top-0 bg-[#0d0f1a]/85 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center z-50 print:hidden max-w-5xl mx-auto rounded-b-2xl">
        <div className="flex gap-4 items-center">
          <Link to="/dashboard" className="text-white/60 hover:text-white text-sm bg-white/5 px-4 py-2 rounded-lg transition-colors border border-white/5">
            &larr; Dashboard
          </Link>
          <Link to={`/live/${code}`} className="text-white/60 hover:text-white text-sm bg-white/5 px-4 py-2 rounded-lg transition-colors border border-white/5">
            Live View
          </Link>
        </div>
        <button
          onClick={() => window.print()}
          className="glow-button px-6 py-2.5 flex items-center gap-2 font-bold cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / Save as PDF
        </button>
      </div>

      {/* Main Report Container */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:pt-4">
        
        {/* Document Header */}
        <div className="border-b-2 border-indigo-500/20 pb-8 mb-8 flex justify-between items-end print:border-black/10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white print:text-black">
              Session Report
            </h1>
            <p className="text-indigo-400 font-semibold mt-1 print:text-indigo-600">
              Pulse • Interactive Surveys
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white print:text-black tracking-widest">
              CODE: {code}
            </div>
            <div className="text-xs text-white/50 print:text-black/50 mt-1">
              Generated: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-white/5 p-6 rounded-2xl border border-white/5 print:bg-black/5 print:border-black/5 print:rounded-none">
          <div>
            <span className="block text-xs text-white/40 print:text-black/50 uppercase font-semibold">Question / Title</span>
            <span className="text-sm font-bold text-white print:text-black leading-tight block mt-1">
              {room.question || 'N/A'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/40 print:text-black/50 uppercase font-semibold">Interaction Type</span>
            <span className="text-sm font-bold text-white print:text-black uppercase block mt-1">
              {room.type}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/40 print:text-black/50 uppercase font-semibold">Created At</span>
            <span className="text-sm font-bold text-white print:text-black block mt-1">
              {new Date(room.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/40 print:text-black/50 uppercase font-semibold">Total Submissions</span>
            <span className="text-sm font-bold text-indigo-400 print:text-indigo-600 block mt-1">
              {room.type === 'POLL' && `${totalVotes} Votes`}
              {room.type === 'RANKING' && `${room.options?.length || 0} Options (${totalPoints} pts)`}
              {room.type === 'WORDCLOUD' && `${totalWords} Words`}
              {room.type === 'QNA' && `${totalQna} Questions`}
              {room.type === 'OPEN_ENDED' && `${totalOpen} Answers`}
              {room.type === 'RATING' && `${totalRatings} Ratings`}
            </span>
          </div>
        </div>

        {/* Results Block */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-2 print:text-black print:border-black/10">
            Results Breakdown
          </h2>

          {/* POLL / RANKING */}
          {(room.type === 'POLL' || room.type === 'RANKING') && (
            <div className="space-y-8">
              
              {/* Graphic Chart (Recharts Bar Chart) */}
              <div className="glass-card p-6 bg-white/5 border border-white/10 print:bg-transparent print:border-black/10 print:rounded-none">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-white/50 print:text-black/50 mb-4">
                  Visual Results Chart
                </h3>
                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={room.type === 'RANKING' ? [...(room.options || [])].sort((a,b) => b.votes - a.votes) : (room.options || [])} 
                      layout="vertical" 
                      margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="text" 
                        type="category" 
                        width={130} 
                        tick={{ fill: 'currentColor', fontSize: 13 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey="votes" radius={[0, 4, 4, 0]} animationDuration={0}>
                        {(room.options || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="votes" position="right" fill="currentColor" fontSize={13} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <table className="w-full text-left border-collapse mt-6">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/50 print:text-black/50 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">Option</th>
                    <th className="py-3 font-semibold text-right">
                      {room.type === 'RANKING' ? 'Points' : 'Votes'}
                    </th>
                    <th className="py-3 font-semibold text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {room.options?.map(opt => {
                    const base = room.type === 'RANKING' ? totalPoints : totalVotes;
                    const percentage = base > 0 ? Math.round((opt.votes / base) * 100) : 0;
                    return (
                      <tr key={opt.id} className="text-white/90 print:text-black/90">
                        <td className="py-4 font-medium">{opt.text}</td>
                        <td className="py-4 text-right font-bold">{opt.votes}</td>
                        <td className="py-4 text-right font-bold text-indigo-400 print:text-indigo-600">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* RATING */}
          {room.type === 'RATING' && (
            <div className="space-y-8">
              
              {/* Visual rating scale */}
              <div className="glass-card p-6 bg-white/5 border border-white/10 print:bg-transparent print:border-black/10 print:rounded-none space-y-6">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-white/50 print:text-black/50">
                  Rating Scale Charts
                </h3>
                {room.options?.map(opt => {
                  const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount) : 0;
                  const percent = (avg / 5) * 100;
                  return (
                    <div key={opt.id} className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold text-white/80 print:text-black/80">
                        <span>{opt.text}</span>
                        <span className="text-indigo-400 print:text-indigo-600 font-bold">{avg.toFixed(1)} / 5</span>
                      </div>
                      <div className="h-4 bg-white/5 rounded print:bg-black/5 overflow-hidden border border-white/10 print:border-black/10">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 print:bg-indigo-600" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Table */}
              <table className="w-full text-left border-collapse mt-6">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/50 print:text-black/50 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">Category</th>
                    <th className="py-3 font-semibold text-center">Responses</th>
                    <th className="py-3 font-semibold text-right">Average Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {room.options?.map(opt => {
                    const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount).toFixed(2) : '0.00';
                    return (
                      <tr key={opt.id} className="text-white/90 print:text-black/90">
                        <td className="py-4 font-medium">{opt.text}</td>
                        <td className="py-4 text-center">{opt.ratingCount}</td>
                        <td className="py-4 text-right font-extrabold text-indigo-400 print:text-indigo-600">
                          {avg} / 5.00
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* WORDCLOUD */}
          {room.type === 'WORDCLOUD' && (
            <div className="space-y-8">
              
              {/* Visual Wordcloud Block */}
              {wordcloudData.length > 0 && (
                <div className="glass-card p-6 bg-white/5 border border-white/10 print:bg-transparent print:border-black/10 print:rounded-none">
                  <h3 className="text-sm uppercase tracking-wider font-semibold text-white/50 print:text-black/50 mb-4">
                    Visual Word Cloud
                  </h3>
                  <div className="w-full h-[320px] relative">
                    <CustomWordcloud words={wordcloudData} />
                  </div>
                </div>
              )}

              {/* Data Table */}
              <table className="w-full text-left border-collapse mt-6">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/50 print:text-black/50 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">Submitted Word / Term</th>
                    <th className="py-3 font-semibold text-right">Occurrence Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {wordcloudData.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="py-4 text-center italic text-white/40 print:text-black/40">No words submitted</td>
                    </tr>
                  ) : (
                    [...room.words].sort((a,b) => b.count - a.count).map(w => (
                      <tr key={w.id} className="text-white/90 print:text-black/90">
                        <td className="py-4 font-medium">{w.text}</td>
                        <td className="py-4 text-right font-bold text-indigo-400 print:text-indigo-600">{w.count}x</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* QNA */}
          {room.type === 'QNA' && (
            <div className="space-y-4">
              {!room.qnaMessages || room.qnaMessages.length === 0 ? (
                <p className="italic text-white/40 print:text-black/40 text-center py-8">No questions asked</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {room.qnaMessages.map((msg, index) => (
                    <div key={msg.id} className="bg-white/5 p-4 rounded-xl border border-white/5 print:bg-transparent print:border-none print:p-0 print:border-b print:border-black/10 print:rounded-none flex justify-between items-start gap-6">
                      <div className="flex-1">
                        <div className="text-xs text-white/40 print:text-black/40 mb-1 flex gap-2">
                          <span className="font-bold text-indigo-400 print:text-indigo-600">Question #{index + 1}</span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-white/90 print:text-black/90 leading-relaxed break-words">{msg.text}</p>
                      </div>
                      <div className="bg-indigo-500/10 text-indigo-300 print:bg-black/5 print:text-black font-bold px-3 py-2 rounded-xl text-center min-w-[70px]">
                        <span className="block text-xs uppercase text-white/50 print:text-black/50">Upvotes</span>
                        <span className="text-lg font-bold">{msg.upvotes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OPEN ENDED */}
          {room.type === 'OPEN_ENDED' && (
            <div className="space-y-4">
              {!room.openAnswers || room.openAnswers.length === 0 ? (
                <p className="italic text-white/40 print:text-black/40 text-center py-8">No submissions</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 print:grid-cols-1">
                  {room.openAnswers.map((ans, index) => (
                    <div key={ans.id} className="bg-white/5 p-5 rounded-xl border border-white/5 print:bg-transparent print:border-none print:p-0 print:border-b print:border-black/10 print:rounded-none">
                      <div className="text-xs text-white/40 print:text-black/40 mb-1">
                        Answer #{index + 1} • {new Date(ans.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="text-sm text-white/90 print:text-black/90 leading-relaxed break-words">{ans.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="mt-16 pt-6 border-t border-white/10 print:border-black/10 text-center text-xs text-white/30 print:text-black/40 flex justify-between">
          <span>Pulse Surveys - Realtime Interactive Web App</span>
          <span>Room Code: {code}</span>
        </div>

      </div>
      
      {/* Outer layout footer - hidden on print */}
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
