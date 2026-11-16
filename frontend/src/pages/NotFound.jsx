import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <main className="glass-card p-8 md:p-10 max-w-md w-full text-center">
        <p className="text-5xl font-mono font-bold text-indigo-400 mb-3">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">{t('notFound.title')}</h1>
        <p className="text-white/75 text-sm mb-8">{t('notFound.description')}</p>
        <Link
          to="/"
          className="glow-button inline-flex items-center justify-center min-h-11 px-6 py-3 w-full"
        >
          {t('notFound.backHome')}
        </Link>
      </main>
      <Footer showAdminLink />
    </div>
  );
}
