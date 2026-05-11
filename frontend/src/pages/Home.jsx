import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

export default function Home() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(searchParams.get('error') === 'notfound' ? 'Room not found' : '');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${code.toUpperCase()}`);
        if (!res.ok) {
          setError('Room not found');
          setLoading(false);
          return;
        }
        navigate(`/${code.toUpperCase()}`);
      } catch (err) {
        setError('Connection error');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img src="/favicon.png" alt="" className="w-[120vw] md:w-[80vw] max-w-[1000px] opacity-[0.02] grayscale blur-sm" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-5 mb-10">
          <img src="/favicon.png" alt="Pulse Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <div className="text-left">
            <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 leading-none">
              Pulse
            </h1>
            <p className="text-white/50 text-sm mt-1">Feel the Pulse</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="glass-card p-8 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Join Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="glass-input w-full text-center text-2xl tracking-widest uppercase font-mono"
              required
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="glow-button w-full py-3 mt-2 disabled:opacity-50">
            {loading ? 'Checking...' : 'Join'}
          </button>
        </form>
      </motion.div>

      <Footer showAdminLink />
    </div>
  );
}
