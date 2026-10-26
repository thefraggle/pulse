import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import pkg from '../../package.json';
import LegalModal from './LegalModal';
import LanguageSwitcher from './LanguageSwitcher';

export default function Footer({ showAdminLink = false, showHelp = false }) {
  const { t } = useTranslation();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState('imprint');

  const hasToken = !!localStorage.getItem('pulse_token');
  const versionStr = `Pulse v${pkg.version}`;

  const impressumUrl = import.meta.env.VITE_IMPRESSUM_URL;
  const privacyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL;

  const handleOpenLegal = (type) => {
    setLegalModalType(type);
    setLegalModalOpen(true);
  };

  return (
    <>
      <footer className="mt-auto py-6 w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs px-4">
        <a 
          href="https://github.com/thefraggle/pulse" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          {versionStr}
        </a>

        {(showHelp && hasToken) && (
          <>
            <span className="text-white/10">·</span>
            <button 
              onClick={() => window.dispatchEvent(new Event('start-tour'))} 
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer bg-transparent border-none p-0 m-0"
            >
              {t('common.help')}
            </button>
          </>
        )}

        <span className="text-white/10">·</span>
        <a 
          href="https://notthoff.org" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          {t('common.copyright')}
        </a>
        
        <span className="text-white/10">·</span>
        {impressumUrl ? (
          <a href={impressumUrl} className="text-white/20 hover:text-white/40 transition-colors">
            {t('common.legalNotice')}
          </a>
        ) : (
          <button 
            type="button"
            onClick={() => handleOpenLegal('imprint')}
            className="text-white/20 hover:text-white/40 transition-colors cursor-pointer bg-transparent border-none p-0 m-0"
          >
            {t('common.legalNotice')}
          </button>
        )}

        <span className="text-white/10">·</span>
        {privacyUrl ? (
          <a href={privacyUrl} className="text-white/20 hover:text-white/40 transition-colors">
            {t('common.privacyPolicy')}
          </a>
        ) : (
          <button 
            type="button"
            onClick={() => handleOpenLegal('privacy')}
            className="text-white/20 hover:text-white/40 transition-colors cursor-pointer bg-transparent border-none p-0 m-0"
          >
            {t('common.privacyPolicy')}
          </button>
        )}

        {(showAdminLink && hasToken) && (
          <>
            <span className="text-white/10">·</span>
            <Link to="/dashboard" className="text-white/20 hover:text-white/40 transition-colors">
              {t('common.dashboard')}
            </Link>
          </>
        )}

        <span className="text-white/10">·</span>
        <LanguageSwitcher />
      </footer>

      <LegalModal 
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        type={legalModalType}
      />
    </>
  );
}
