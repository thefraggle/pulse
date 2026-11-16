import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import CustomWordcloud from '../components/CustomWordcloud';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function ReportView() {
  const { t } = useTranslation();
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then(data => {
        if (!active) return;
        setRoom(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center print:hidden" role="status" aria-live="polite">
        <p className="text-white/75">{t('common.loading')}</p>
      </div>
    );
  }

  if (notFound || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{t('home.roomNotFound')}</h1>
          <Link to="/" className="glow-button inline-flex items-center justify-center min-h-11 px-6 py-3 w-full">
            {t('notFound.backHome')}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

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

      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
            color: black !important;
          }
          .recharts-text {
            fill: black !important;
          }
        }
      `}</style>

      {/* Action Header - Hidden during print */}
      <div className="sticky top-0 bg-[#0d0f1a]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-4 flex flex-wrap gap-3 justify-between items-center z-40 print:hidden max-w-5xl mx-auto rounded-b-2xl">
        <div className="flex gap-3 items-center">
          <Link to="/dashboard" className="min-h-11 inline-flex items-center text-white/80 hover:text-white text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            &larr; {t('report.backToDashboard')}
          </Link>
          <Link to={`/live/${code}`} className="min-h-11 inline-flex items-center text-white/80 hover:text-white text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            {t('dashboard.present')}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="glow-button min-h-11 px-6 py-2.5 flex items-center gap-2 font-bold cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          {t('report.printPdf')}
        </button>
      </div>

      {/* Main Report Container */}
      <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0 print:pt-4">

        {/* Document Header */}
        <div className="border-b-2 border-indigo-500/20 pb-8 mb-8 flex flex-wrap gap-4 justify-between items-end print:border-black/10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white print:text-black">
              {t('report.title')}
            </h1>
            <p className="text-indigo-400 font-semibold mt-1 print:text-indigo-600">
              {t('report.subtitle')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white print:text-black tracking-widest">
              CODE: {code}
            </div>
            <div className="text-xs text-white/75 print:text-black/70 mt-1">
              {t('report.generated')}: {new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-white/5 p-6 rounded-2xl border border-white/10 print:bg-black/5 print:border-black/10 print:rounded-none">
          <div>
            <span className="block text-xs text-white/70 print:text-black/70 uppercase font-semibold">{t('report.questionLabel')}</span>
            <span className="text-sm font-bold text-white print:text-black leading-tight block mt-1">
              {room.question || 'N/A'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/70 print:text-black/70 uppercase font-semibold">{t('report.typeLabel')}</span>
            <span className="text-sm font-bold text-white print:text-black uppercase block mt-1">
              {room.type}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/70 print:text-black/70 uppercase font-semibold">{t('report.createdAtLabel')}</span>
            <span className="text-sm font-bold text-white print:text-black block mt-1">
              {new Date(room.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div>
            <span className="block text-xs text-white/70 print:text-black/70 uppercase font-semibold">{t('report.totalSubmissionsLabel')}</span>
            <span className="text-sm font-bold text-indigo-400 print:text-indigo-600 block mt-1">
              {room.type === 'POLL' && `${totalVotes} ${t('report.votes')}`}
              {room.type === 'RANKING' && `${room.options?.length || 0} (${totalPoints} ${t('report.points')})`}
              {room.type === 'WORDCLOUD' && `${totalWords}`}
              {room.type === 'QNA' && `${totalQna}`}
              {room.type === 'OPEN_ENDED' && `${totalOpen}`}
              {room.type === 'RATING' && `${totalRatings}`}
            </span>
          </div>
        </div>

        {/* Results Block */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-2 print:text-black print:border-black/10">
            {t('report.resultsBreakdown')}
          </h2>

          {/* POLL / RANKING */}
          {(room.type === 'POLL' || room.type === 'RANKING') && (
            <div className="space-y-8">
              <div className="glass-card p-6 bg-white/5 border border-white/10 print:bg-transparent print:border-black/10 print:rounded-none">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-white/75 print:text-black/75 mb-4">
                  {t('report.visualChart')}
                </h3>
                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={room.type === 'RANKING' ? [...(room.options || [])].sort((a, b) => b.votes - a.votes) : (room.options || [])}
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

              <table className="w-full text-left border-collapse mt-6">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/75 print:text-black/75 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">{t('report.option')}</th>
                    <th className="py-3 font-semibold text-right">
                      {room.type === 'RANKING' ? t('report.points') : t('report.votes')}
                    </th>
                    <th className="py-3 font-semibold text-right">{t('report.percentage')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {room.options?.map(opt => {
                    const base = room.type === 'RANKING' ? totalPoints : totalVotes;
                    const percentage = base > 0 ? Math.round((opt.votes / base) * 100) : 0;
                    return (
                      <tr key={opt.id} className="text-white/95 print:text-black/95">
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
              <div className="glass-card p-6 bg-white/5 border border-white/10 print:bg-transparent print:border-black/10 print:rounded-none space-y-6">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-white/75 print:text-black/75">
                  {t('report.ratingCharts')}
                </h3>
                {room.options?.map(opt => {
                  const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount) : 0;
                  const percent = (avg / 5) * 100;
                  return (
                    <div key={opt.id} className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold text-white/90 print:text-black/90">
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

              <table className="w-full text-left border-collapse mt-6">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/75 print:text-black/75 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">{t('report.category')}</th>
                    <th className="py-3 font-semibold text-center">{t('report.responses')}</th>
                    <th className="py-3 font-semibold text-right">{t('report.averageScore')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {room.options?.map(opt => {
                    const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount).toFixed(2) : '0.00';
                    return (
                      <tr key={opt.id} className="text-white/95 print:text-black/95">
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
              {wordcloudData.length > 0 && (
                <div className="glass-card p-6 bg-white/5 border border-white/10 print:bg-transparent print:border-black/10 print:rounded-none">
                  <h3 className="text-sm uppercase tracking-wider font-semibold text-white/75 print:text-black/75 mb-4">
                    {t('report.visualWordcloud')}
                  </h3>
                  <div className="w-full h-[320px] relative">
                    <CustomWordcloud words={wordcloudData} isPrint={true} />
                  </div>
                </div>
              )}

              <table className="w-full text-left border-collapse mt-6">
                <thead>
                  <tr className="border-b border-white/20 print:border-black/20 text-white/75 print:text-black/75 text-xs uppercase tracking-wider">
                    <th className="py-3 font-semibold">{t('report.submittedTerm')}</th>
                    <th className="py-3 font-semibold text-right">{t('report.occurrenceCount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-black/10 text-sm">
                  {wordcloudData.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="py-4 text-center italic text-white/70 print:text-black/70">{t('report.noWords')}</td>
                    </tr>
                  ) : (
                    [...room.words].sort((a, b) => b.count - a.count).map(w => (
                      <tr key={w.id} className="text-white/95 print:text-black/95">
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
                <p className="italic text-white/70 print:text-black/70 text-center py-8">{t('report.noQuestions')}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {room.qnaMessages.map((msg, index) => (
                    <div key={msg.id} className="bg-white/5 p-4 rounded-xl border border-white/10 print:bg-transparent print:border-none print:p-0 print:border-b print:border-black/10 print:rounded-none flex justify-between items-start gap-6">
                      <div className="flex-1">
                        <div className="text-xs text-white/70 print:text-black/70 mb-1 flex gap-2">
                          <span className="font-bold text-indigo-400 print:text-indigo-600">{t('report.questionNumber', { num: index + 1 })}</span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-white/95 print:text-black/95 leading-relaxed break-words">{msg.text}</p>
                      </div>
                      <div className="bg-indigo-500/15 text-indigo-200 print:bg-black/5 print:text-black font-bold px-3 py-2 rounded-xl text-center min-w-[70px]">
                        <span className="block text-xs uppercase text-white/75 print:text-black/75">{t('report.upvotes')}</span>
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
                <p className="italic text-white/70 print:text-black/70 text-center py-8">{t('report.noSubmissions')}</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 print:grid-cols-1">
                  {room.openAnswers.map((ans, index) => (
                    <div key={ans.id} className="bg-white/5 p-5 rounded-xl border border-white/10 print:bg-transparent print:border-none print:p-0 print:border-b print:border-black/10 print:rounded-none">
                      <div className="text-xs text-white/70 print:text-black/70 mb-1">
                        {t('report.answerNumber', { num: index + 1 })} • {new Date(ans.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="text-sm text-white/95 print:text-black/95 leading-relaxed break-words">{ans.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="mt-16 pt-6 border-t border-white/10 print:border-black/10 text-center text-xs text-white/70 print:text-black/70 flex justify-between">
          <span>{t('report.footerTagline')}</span>
          <span>{t('live.code')}: {code}</span>
        </div>

      </div>

      {/* Outer layout footer - hidden on print */}
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
