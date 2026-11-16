import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import useCountdown from '../hooks/useCountdown';
import useSocket from '../hooks/useSocket';
import NotFound from './NotFound';

const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/i;

export default function ParticipantView() {
  const { t } = useTranslation();
  const { code } = useParams();
  const navigate = useNavigate();
  const isValidCode = ROOM_CODE_REGEX.test(code || '');
  const socket = useSocket();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(isValidCode);
  const [submitted, setSubmitted] = useState(() => !!localStorage.getItem(`pulse_voted_${code}`));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shared text state for Wordcloud, QNA, OpenEnded
  const [word, setWord] = useState('');
  const [wordCount, setWordCount] = useState(() => parseInt(localStorage.getItem(`pulse_words_${code}`) || '0', 10));
  const [toast, setToast] = useState('');

  // State for Ranking
  const [rankingItems, setRankingItems] = useState([]);

  // State for Rating
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    if (!isValidCode) return;

    let active = true;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then(data => {
        if (!active) return;
        setRoom(data);
        if (data.type === 'RANKING' && data.options) {
          setRankingItems(data.options);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) navigate('/?error=notfound');
      });

    return () => {
      active = false;
    };
  }, [code, isValidCode, navigate]);

  useEffect(() => {
    if (!socket || !isValidCode) return;

    const handleConnect = () => {
      socket.emit('joinRoom', code);
    };

    const handleRoomUpdated = (updatedRoom) => {
      setRoom(updatedRoom);
    };

    const handleRoomDeleted = () => {
      navigate('/?error=notfound');
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }
    socket.on('roomUpdated', handleRoomUpdated);
    socket.on('roomDeleted', handleRoomDeleted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('roomDeleted', handleRoomDeleted);
      socket.off('roomUpdated', handleRoomUpdated);
    };
  }, [socket, code, isValidCode, navigate]);

  const { timeLeft, formattedTime, isExpired } = useCountdown(room?.timerEndsAt);
  const isWarning = timeLeft !== null && timeLeft <= 20;

  if (!isValidCode) {
    return <NotFound />;
  }

  const handleVote = (optionId) => {
    if (!socket || isSubmitting) return;
    setIsSubmitting(true);
    socket.emit('submitVote', { code, optionId });
    localStorage.setItem(`pulse_voted_${code}`, 'true');
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleWordSubmit = (e) => {
    e.preventDefault();
    const limit = room?.wordLimit || 4;
    if (!socket || !word.trim() || wordCount >= limit || isSubmitting) return;
    setIsSubmitting(true);
    socket.emit('submitWord', { code, text: word.trim(), roomId: room.id });
    const newCount = wordCount + 1;
    setWordCount(newCount);
    localStorage.setItem(`pulse_words_${code}`, newCount.toString());
    setToast(t('participant.savedToast'));
    setWord('');
    setIsSubmitting(false);
    setTimeout(() => setToast(''), 3000);
  };

  const handleQnaSubmit = (e) => {
    e.preventDefault();
    if (!socket || !word.trim() || isSubmitting) return;
    setIsSubmitting(true);
    socket.emit('submitQna', { code, text: word.trim(), roomId: room.id });
    setToast(t('participant.savedToast'));
    setWord('');
    setIsSubmitting(false);
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenEndedSubmit = (e) => {
    e.preventDefault();
    if (!socket || !word.trim() || isSubmitting) return;
    setIsSubmitting(true);
    socket.emit('submitOpenAnswer', { code, text: word.trim(), roomId: room.id });
    setToast(t('participant.savedToast'));
    setWord('');
    setIsSubmitting(false);
    setTimeout(() => setToast(''), 3000);
  };

  const handleUpvoteQna = (messageId) => {
    if (!socket || localStorage.getItem(`pulse_qna_upvote_${messageId}`)) return;
    socket.emit('upvoteQna', { code, messageId });
    localStorage.setItem(`pulse_qna_upvote_${messageId}`, 'true');
    setRoom(prev => ({
      ...prev,
      qnaMessages: prev.qnaMessages.map(m => m.id === messageId ? { ...m, upvotes: m.upvotes + 1 } : m)
    }));
  };

  const moveRankingItem = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= rankingItems.length) return;
    const next = [...rankingItems];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setRankingItems(next);
  };

  const handleRankingSubmit = () => {
    if (!socket || isSubmitting) return;
    setIsSubmitting(true);
    const optionIds = rankingItems.map(opt => opt.id);
    socket.emit('submitRanking', { code, optionIds });
    localStorage.setItem(`pulse_voted_${code}`, 'true');
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleRatingSubmit = () => {
    if (!socket || isSubmitting) return;
    setIsSubmitting(true);
    socket.emit('submitRating', { code, ratings });
    localStorage.setItem(`pulse_voted_${code}`, 'true');
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" role="status" aria-live="polite">
        <span className="text-white/75">{t('common.loading')}</span>
        <Footer />
      </div>
    );
  }

  const limit = room?.wordLimit || 4;
  const isWordcloudDone = room?.type === 'WORDCLOUD' && wordCount >= limit;
  const isPollOrRankingOrRatingDone = (room?.type === 'POLL' || room?.type === 'RANKING' || room?.type === 'RATING') && submitted;
  const isLocked = room?.isLocked || isExpired;

  if (isLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 md:p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('participant.sessionLocked')}</h1>
          <p className="text-white/75 mb-8">{isExpired ? t('participant.sessionEnded') : t('live.sessionClosed')}</p>
          <div className="flex flex-col gap-4 mt-2">
            <Link to={`/live/${code}`} className="glass-button w-full min-h-11 py-3 flex items-center justify-center gap-2 text-indigo-300 hover:text-indigo-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('participant.viewLiveResults')}
            </Link>
          </div>
        </motion.div>
        <Footer />
      </div>
    );
  }

  if (isWordcloudDone || isPollOrRankingOrRatingDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 md:p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">{t('participant.alreadySubmitted')}</h1>
          
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
            <p className="text-xs text-white/70 mb-1 uppercase tracking-wider">{t('live.code')}</p>
            <p className="text-3xl font-mono tracking-widest font-bold text-indigo-400">{code}</p>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <Link 
              to={`/live/${code}`}
              className="glass-button w-full min-h-11 py-3 flex items-center justify-center gap-2 text-indigo-300 hover:text-indigo-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('participant.viewLiveResults')}
            </Link>
            
            <Link 
              to="/"
              className="w-full min-h-11 py-2 text-sm text-white/75 hover:text-white transition-colors flex items-center justify-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {t('login.backToHome')}
            </Link>
          </div>
        </motion.div>
        <Footer />
      </div>
    );
  }

  const getTitle = () => {
    if (room?.question) return room.question;
    return t(`dashboard.types.${room?.type || 'WORDCLOUD'}`);
  };

  const getSubtitle = () => {
    switch (room?.type) {
      case 'POLL': return t('participant.subtitlePoll');
      case 'QNA': return t('participant.subtitleQna');
      case 'OPEN_ENDED': return t('participant.subtitleOpen');
      case 'RANKING': return t('participant.subtitleRanking');
      case 'RATING': return t('participant.subtitleRating');
      default: return t('participant.subtitleWordcloud');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${room?.reactionsEnabled ? 'pb-28' : ''}`}>
      
      {room?.timerEndsAt && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/15 text-sm font-mono font-bold text-white z-40">
          <svg className={`w-4 h-4 ${isWarning ? 'text-red-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={isWarning ? 'text-red-400' : ''}>{formattedTime}</span>
        </div>
      )}

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        
        <div className="text-center mb-8 mt-12">
          <h1 className="text-3xl font-bold mb-2">{getTitle()}</h1>
          <p className="text-white/75">{getSubtitle()}</p>
        </div>

        {/* POLL */}
        {room?.type === 'POLL' && (
          <div className="flex flex-col gap-4">
            {room?.options?.map(opt => (
              <button
                key={opt.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleVote(opt.id)}
                className="glass-button w-full min-h-12 p-4 text-left hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
              >
                <span className="text-lg">{opt.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* RANKING */}
        {room?.type === 'RANKING' && (
          <div className="flex flex-col gap-4">
            <Reorder.Group axis="y" values={rankingItems} onReorder={setRankingItems} className="flex flex-col gap-3">
              {rankingItems.map((opt, i) => (
                <Reorder.Item key={opt.id} value={opt} className="cursor-grab active:cursor-grabbing">
                  <div className="glass-card w-full p-3.5 flex items-center gap-3 bg-white/5 hover:bg-white/10">
                    <div className="font-bold text-indigo-400 w-6 text-center">{i + 1}.</div>
                    <span className="text-base sm:text-lg flex-1">{opt.text}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveRankingItem(i, -1)}
                        disabled={i === 0}
                        aria-label={`${opt.text}: ${t('participant.moveUp')}`}
                        className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRankingItem(i, 1)}
                        disabled={i === rankingItems.length - 1}
                        aria-label={`${opt.text}: ${t('participant.moveDown')}`}
                        className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRankingSubmit}
              className="glow-button w-full min-h-11 py-3 mt-4 cursor-pointer"
            >
              {isSubmitting ? t('participant.submitting') : t('participant.submitRanking')}
            </button>
          </div>
        )}

        {/* RATING */}
        {room?.type === 'RATING' && (
          <div className="flex flex-col gap-6">
            {room?.options?.map(opt => {
              const isSingleDefault = room?.options?.length === 1 && (opt.text === 'Gesamtbewertung' || opt.text === 'Overall Rating');
              return (
                <div key={opt.id} className="glass-card w-full p-6 text-center">
                  {!isSingleDefault && <h2 className="text-xl font-semibold mb-4">{opt.text}</h2>}
                  <div className="flex justify-center gap-2" role="group" aria-label={isSingleDefault ? t('participant.rateStars') : opt.text}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} / 5`}
                        aria-pressed={ratings[opt.id] === star}
                        onClick={() => setRatings(prev => ({ ...prev, [opt.id]: star }))}
                        className={`min-w-11 min-h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${ratings[opt.id] >= star ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400/70'}`}
                      >
                        <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleRatingSubmit}
              className="glow-button w-full min-h-11 py-3 mt-2 cursor-pointer"
              disabled={isSubmitting || Object.keys(ratings).length !== (room?.options?.length || 0)}
            >
              {isSubmitting ? t('participant.submitting') : t('participant.submitRating')}
            </button>
          </div>
        )}

        {/* WORDCLOUD, QNA, OPEN_ENDED forms */}
        {['WORDCLOUD', 'QNA', 'OPEN_ENDED'].includes(room?.type) && (
          <form 
            onSubmit={
              room?.type === 'WORDCLOUD' ? handleWordSubmit : 
              room?.type === 'QNA' ? handleQnaSubmit : 
              handleOpenEndedSubmit
            } 
            className="glass-card p-6 flex flex-col gap-4 mb-8"
          >
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={
                room?.type === 'QNA'
                  ? t('participant.qnaPlaceholder')
                  : room?.type === 'OPEN_ENDED'
                    ? t('participant.openAnswerPlaceholder')
                    : t('participant.wordPlaceholder')
              }
              aria-label={getTitle()}
              className="glass-input w-full text-lg"
              autoFocus
              required
            />
            <button type="submit" disabled={isSubmitting} className="glow-button w-full min-h-11 py-3 cursor-pointer">
              {isSubmitting
                ? t('participant.submitting')
                : room?.type === 'QNA'
                  ? t('participant.askQuestion')
                  : t('participant.submit')}
            </button>
            {toast && (
              <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-green-300 text-center font-medium mt-2">
                {toast}
              </motion.div>
            )}
          </form>
        )}

        {/* QNA Feed below input */}
        {room?.type === 'QNA' && (
          <div className="flex flex-col gap-3 mt-4">
            {room.qnaMessages?.map(msg => {
              const hasUpvoted = localStorage.getItem(`pulse_qna_upvote_${msg.id}`);
              return (
                <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex justify-between items-start gap-4 bg-white/5">
                  <p className="text-white/90 text-sm">{msg.text}</p>
                  <button
                    type="button"
                    onClick={() => handleUpvoteQna(msg.id)}
                    aria-label={`${t('participant.upvote')}: ${msg.upvotes}`}
                    aria-pressed={!!hasUpvoted}
                    className={`min-w-11 min-h-11 flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${hasUpvoted ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/5 hover:bg-white/10 text-white/75'}`}
                  >
                    <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    <span className="text-xs font-bold">{msg.upvotes}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-6">
          <Link 
            to={`/live/${code}`}
            className="glass-button w-full min-h-11 py-3 flex items-center justify-center gap-2 text-indigo-300 hover:text-indigo-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('participant.viewLiveResults')}
          </Link>
          
          <Link 
            to="/"
            className="w-full min-h-11 py-2 text-sm text-white/75 hover:text-white transition-colors flex items-center justify-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {t('login.backToHome')}
          </Link>
        </div>

      </motion.div>
      <Footer />

      {room?.reactionsEnabled && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass-card px-4 py-2 flex gap-2 items-center border border-white/20 shadow-2xl rounded-full bg-[#0d0f1a]/90 backdrop-blur-md">
          {['👍', '❤️', '🎉', '🔥', '👏'].map(emoji => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => {
                socket?.emit('sendReaction', { code, emoji });
              }}
              className="min-w-11 min-h-11 flex items-center justify-center text-2xl hover:scale-125 active:scale-95 transition-transform rounded-full cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
