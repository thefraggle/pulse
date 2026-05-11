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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            pulse
          </h1>
          <p className="text-white/50 text-sm">Feel the Pulse</p>
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
