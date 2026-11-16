import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage?.startsWith('de') ? 'de' : 'en';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      aria-label="Switch language"
      className={`inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2 rounded-full text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-all cursor-pointer border border-white/15 ${className}`}
      title={currentLang === 'de' ? 'Auf Englisch umschalten' : 'Switch to German'}
    >
      <Globe className="w-3.5 h-3.5 opacity-70" />
      <span className="uppercase tracking-wider font-semibold">{currentLang}</span>
    </button>
  );
}
