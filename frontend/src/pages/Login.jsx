import { useId, useState } from 'react';
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
  const usernameId = useId();
  const passwordId = useId();

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
          <Link to="/" className="inline-flex items-center min-h-11 px-3 text-white/75 hover:text-white text-xs mb-2 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            {t('login.backToHome')}
          </Link>
          <h1 className="text-3xl font-bold mb-2">{t('login.title')}</h1>
        </div>

        <form onSubmit={handleLogin} className="glass-card p-8 flex flex-col gap-4">
          {error && <div role="alert" className="text-red-300 text-sm text-center bg-red-500/15 border border-red-500/30 p-2.5 rounded-lg">{error}</div>}
          
          <div>
            <label htmlFor={usernameId} className="block text-sm font-medium text-white/80 mb-2">{t('login.username')}</label>
            <input
              id={usernameId}
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="glass-input w-full"
              required
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="block text-sm font-medium text-white/80 mb-2">{t('login.password')}</label>
            <input
              id={passwordId}
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              className="glass-input w-full"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="glow-button w-full min-h-11 py-3 mt-2 cursor-pointer">
            {loading ? t('common.loading') : t('login.submit')}
          </button>
        </form>
      </motion.div>
      <Footer />
    </div>
  );
}
