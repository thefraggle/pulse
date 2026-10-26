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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white/50 hover:text-white/90 bg-white/5 hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-1 focus:ring-brand-purple/50 transition-all cursor-pointer border border-white/10 ${className}`}
      title={currentLang === 'de' ? 'Auf Englisch umschalten' : 'Switch to German'}
    >
      <Globe className="w-3.5 h-3.5 opacity-70" />
      <span className="uppercase tracking-wider font-semibold">{currentLang}</span>
    </button>
  );
}
