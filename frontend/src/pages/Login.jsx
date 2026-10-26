import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        localStorage.setItem('pulse_token', data.token);
        localStorage.setItem('pulse_role', data.role);
        localStorage.setItem('pulse_username', data.username);
        navigate('/dashboard');
      } else {
        setError(data.error ? (t(`login.${data.error}`) || data.error) : t('login.invalidCredentials'));
        setLoading(false);
      }
    } catch {
      setError(t('login.connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-white/40 hover:text-white/80 text-xs mb-4 transition-colors">
            {t('login.backToHome')}
          </Link>
          <h1 className="text-3xl font-bold mb-2">{t('login.title')}</h1>
        </div>

        <form onSubmit={handleLogin} className="glass-card p-8 flex flex-col gap-4">
          {error && <div className="text-red-400 text-sm text-center bg-red-400/10 p-2 rounded">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">{t('login.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              className="glass-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="glass-input w-full"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="glow-button w-full py-3 mt-2 disabled:opacity-50 cursor-pointer">
            {loading ? t('common.loading') : t('login.submit')}
          </button>
        </form>
      </motion.div>
      <Footer />
    </div>
  );
}
