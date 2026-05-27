import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';

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

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white print:bg-white print:text-black font-sans selection:bg-indigo-500 selection:text-white">
      
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
            <div className="space-y-6">
              <table className="w-full text-left border-collapse">
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

              {/* Print-safe visual charts */}
              <div className="space-y-4 pt-4 border-t border-white/10 print:border-black/10">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-white/50 print:text-black/50">
                  Visual Distribution
                </h3>
                {room.options?.map(opt => {
                  const base = room.type === 'RANKING' ? totalPoints : totalVotes;
                  const percentage = base > 0 ? Math.round((opt.votes / base) * 100) : 0;
                  return (
                    <div key={opt.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-white/80 print:text-black/80">
                        <span>{opt.text}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-4 bg-white/5 rounded print:bg-black/5 overflow-hidden border border-white/10 print:border-black/10">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 print:bg-indigo-600" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RATING */}
          {room.type === 'RATING' && (
            <div className="space-y-6">
              <table className="w-full text-left border-collapse">
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

              {/* Visual Bars for Ratings */}
              <div className="space-y-4 pt-4 border-t border-white/10 print:border-black/10">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-white/50 print:text-black/50">
                  Rating Scales
                </h3>
                {room.options?.map(opt => {
                  const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount) : 0;
                  const percent = (avg / 5) * 100;
                  return (
                    <div key={opt.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-white/80 print:text-black/80">
                        <span>{opt.text}</span>
                        <span>{avg.toFixed(1)} / 5</span>
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
            </div>
          )}

          {/* WORDCLOUD */}
          {room.type === 'WORDCLOUD' && (
            <div className="space-y-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/50 print:text-black/50 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">Submitted Word / Term</th>
                    <th className="py-3 font-semibold text-right">Occurrence Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {!room.words || room.words.length === 0 ? (
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
