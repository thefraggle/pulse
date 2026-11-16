import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function Home() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(searchParams.get('error') === 'notfound' ? t('home.roomNotFound') : '');
  const [loading, setLoading] = useState(false);
  const codeInputId = useId();

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError(t('home.codePlaceholder'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/rooms/${trimmed}`);
      if (!res.ok) {
        setError(t('home.roomNotFound'));
        setLoading(false);
        return;
      }
      navigate(`/${trimmed}`);
    } catch {
      setError(t('home.connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden="true">
        <img
          src="/logo-full.png"
          alt=""
          width="256"
          height="256"
          className="w-[120vw] md:w-[70vw] max-w-[900px] aspect-square opacity-[0.06] mix-blend-screen"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-5 mb-10">
          <img
            src="/logo-full.png"
            alt="Pulse Logo"
            width="64"
            height="64"
            className="w-16 h-16 object-contain rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          />
          <div className="text-left">
            <h1 className="text-5xl font-extrabold tracking-tight text-white leading-none">
              Pulse
            </h1>
            <p className="text-white/75 text-sm mt-1.5">{t('home.title')}</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="glass-card p-8 flex flex-col gap-4">
          <div>
            <label htmlFor={codeInputId} className="block text-sm font-medium text-white/80 mb-2">
              {t('home.codePlaceholder')}
            </label>
            <input
              id={codeInputId}
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              className="glass-input w-full text-center text-2xl tracking-widest uppercase font-mono"
              required
            />
          </div>
          {error && (
            <div role="alert" className="text-red-300 text-sm text-center bg-red-500/15 border border-red-500/30 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="glow-button w-full min-h-11 py-3 mt-2 cursor-pointer">
            {loading ? t('common.loading') : t('home.join')}
          </button>
        </form>
      </motion.div>

      <Footer showAdminLink />
    </div>
  );
}
