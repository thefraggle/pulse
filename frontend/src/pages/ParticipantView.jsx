import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import { io } from 'socket.io-client';
import Footer from '../components/Footer';
import useCountdown from '../hooks/useCountdown';

const socket = io(import.meta.env.VITE_API_URL || '');

export default function ParticipantView() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  // Shared text state for Wordcloud, QNA, OpenEnded
  const [word, setWord] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [toast, setToast] = useState('');

  // State for Ranking
  const [rankingItems, setRankingItems] = useState([]);

  // State for Rating
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    if (localStorage.getItem(`pulse_voted_${code}`)) {
      setSubmitted(true);
    }
    const savedCount = parseInt(localStorage.getItem(`pulse_words_${code}`) || '0', 10);
    setWordCount(savedCount);

    fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then(data => {
        setRoom(data);
        if (data.type === 'RANKING' && data.options) {
          // Shuffle initially or keep original order
          setRankingItems(data.options);
        }
        setLoading(false);
      })
      .catch(() => {
        navigate('/?error=notfound');
      });

    socket.emit('joinRoom', code);

    socket.on('roomUpdated', (updatedRoom) => {
      setRoom(prev => {
        // Only update room state if it's not breaking user inputs
        return updatedRoom;
      });
    });

    socket.on('roomDeleted', () => {
      navigate('/?error=notfound');
    });

    return () => {
      socket.off('roomDeleted');
      socket.off('roomUpdated');
    };
  }, [code, navigate]);

  const { formattedTime, isExpired } = useCountdown(room?.timerEndsAt);

  const handleVote = (optionId) => {
    socket.emit('submitVote', { code, optionId });
    localStorage.setItem(`pulse_voted_${code}`, 'true');
    setSubmitted(true);
  };

  const handleWordSubmit = (e) => {
    e.preventDefault();
    const limit = room?.wordLimit || 4;
    if (!word.trim() || wordCount >= limit) return;
    socket.emit('submitWord', { code, text: word.trim(), roomId: room.id });
    const newCount = wordCount + 1;
    setWordCount(newCount);
    localStorage.setItem(`pulse_words_${code}`, newCount.toString());
    setToast('Word submitted!');
    setWord('');
    setTimeout(() => setToast(''), 3000);
  };

  const handleQnaSubmit = (e) => {
    e.preventDefault();
    if (!word.trim()) return;
    socket.emit('submitQna', { code, text: word.trim(), roomId: room.id });
    setToast('Question submitted!');
    setWord('');
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenEndedSubmit = (e) => {
    e.preventDefault();
    if (!word.trim()) return;
    socket.emit('submitOpenAnswer', { code, text: word.trim(), roomId: room.id });
    setToast('Answer submitted!');
    setWord('');
    setTimeout(() => setToast(''), 3000);
  };

  const handleUpvoteQna = (messageId) => {
    if (localStorage.getItem(`pulse_qna_upvote_${messageId}`)) return;
    socket.emit('upvoteQna', { code, messageId });
    localStorage.setItem(`pulse_qna_upvote_${messageId}`, 'true');
    // Optimistic UI update
    setRoom(prev => ({
      ...prev,
      qnaMessages: prev.qnaMessages.map(m => m.id === messageId ? { ...m, upvotes: m.upvotes + 1 } : m)
    }));
  };

  const handleRankingSubmit = () => {
    const optionIds = rankingItems.map(opt => opt.id);
    socket.emit('submitRanking', { code, optionIds });
    localStorage.setItem(`pulse_voted_${code}`, 'true');
    setSubmitted(true);
  };

  const handleRatingSubmit = () => {
    socket.emit('submitRating', { code, ratings });
    localStorage.setItem(`pulse_voted_${code}`, 'true');
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center"><span>Loading...</span><Footer /></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center text-red-400"><span>{error}</span><Footer /></div>;

  // Determine if user has reached limit and should see the "Danke" view
  const limit = room?.wordLimit || 4;
  const isWordcloudDone = room?.type === 'WORDCLOUD' && wordCount >= limit;
  const isPollOrRankingOrRatingDone = (room?.type === 'POLL' || room?.type === 'RANKING' || room?.type === 'RATING') && submitted;

  const isLocked = room?.isLocked || isExpired;

  if (isLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Session paused</h2>
          <p className="text-white/60 mb-8">The moderator has temporarily closed the voting.</p>
          <div className="flex flex-col gap-4 mt-2">
            <Link to={`/live/${code}`} className="glass-button w-full py-3 flex items-center justify-center gap-2 text-indigo-300 hover:text-indigo-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Live Results
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
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
          <p className="text-white/60 mb-8">Your answer has been submitted.</p>
          
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
            <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Join Code for others</p>
            <p className="text-3xl font-mono tracking-widest font-bold text-indigo-400">{code}</p>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <Link 
              to={`/live/${code}`}
              className="glass-button w-full py-3 flex items-center justify-center gap-2 text-indigo-300 hover:text-indigo-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Live Results
            </Link>
            
            <Link 
              to="/"
              className="w-full py-2 text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </motion.div>
        <Footer />
      </div>
    );
  }

  const getTitle = () => {
    if (room?.question) return room.question;
    switch (room?.type) {
      case 'POLL': return 'Poll';
      case 'QNA': return 'Q&A';
      case 'OPEN_ENDED': return 'Brainstorming';
      case 'RANKING': return 'Ranking';
      case 'RATING': return 'Rating';
      default: return 'Wordcloud';
    }
  };

  const getSubtitle = () => {
    switch (room?.type) {
      case 'POLL': return 'Please select an option';
      case 'QNA': return 'Ask a question or vote for others';
      case 'OPEN_ENDED': return 'Share your ideas';
      case 'RANKING': return 'Sort by drag & drop';
      case 'RATING': return 'Give stars for the categories';
      default: return 'Please enter your answer';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      
      {room?.timerEndsAt && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/5 rounded-full px-3 py-1 border border-white/10 text-sm font-mono font-bold text-white z-50">
          <svg className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-indigo-400'} animate-pulse`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={isExpired ? 'text-red-400' : ''}>{formattedTime}</span>
        </div>
      )}

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        
        <div className="text-center mb-8 mt-12">
          <h1 className="text-3xl font-bold mb-2">{getTitle()}</h1>
          <p className="text-white/60">{getSubtitle()}</p>
        </div>

        {/* POLL */}
        {room?.type === 'POLL' && (
          <div className="flex flex-col gap-4">
            {room?.options?.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                className="glass-button w-full p-4 text-left hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
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
                  <div className="glass-card w-full p-4 flex items-center gap-4 bg-white/5 hover:bg-white/10">
                    <div className="font-bold text-indigo-400 w-6 text-center">{i + 1}.</div>
                    <span className="text-lg flex-1">{opt.text}</span>
                    <div className="text-white/20">☰</div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <button onClick={handleRankingSubmit} className="glow-button w-full py-3 mt-4">
              Submit Ranking
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
                  {!isSingleDefault && <h3 className="text-xl mb-4">{opt.text}</h3>}
                  <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRatings(prev => ({ ...prev, [opt.id]: star }))}
                      className={`transition-colors ${ratings[opt.id] >= star ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/50'}`}
                    >
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            );
            })}
            <button 
              onClick={handleRatingSubmit} 
              className="glow-button w-full py-3 mt-2"
              disabled={Object.keys(ratings).length !== (room?.options?.length || 0)}
            >
              Submit Rating
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
              placeholder={room?.type === 'QNA' ? "Your question..." : "A word or short sentence..."}
              className="glass-input w-full text-lg"
              autoFocus
              required
            />
            <button type="submit" className="glow-button w-full py-3">
              {room?.type === 'QNA' ? 'Ask question' : 'Submit'}
            </button>
            {toast && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-green-400 text-center font-medium mt-2">
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
                    onClick={() => handleUpvoteQna(msg.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${hasUpvoted ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/5 hover:bg-white/10 text-white/50'}`}
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    <span className="text-xs font-bold">{msg.upvotes}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-4 mt-6">
          <Link 
            to={`/live/${code}`}
            className="glass-button w-full py-3 flex items-center justify-center gap-2 text-indigo-300 hover:text-indigo-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View Live Results
          </Link>
          
          <Link 
            to="/"
            className="w-full py-2 text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>

      </motion.div>
      <Footer />
    </div>
  );
}
