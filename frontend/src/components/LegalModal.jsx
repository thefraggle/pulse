import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, X } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, type = 'imprint' }) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isImprint = type === 'imprint';
  const title = isImprint ? t('legal.imprintTitle') : t('legal.privacyTitle');

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d0f1a] border border-white/20 p-6 md:p-8 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col relative shadow-2xl cursor-default text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                {isImprint ? (
                  <FileText className="w-5 h-5 text-brand-purple" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
                <h3 className="text-xl font-bold text-white">{title}</h3>
              </div>
              <button 
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto pr-2 text-sm text-white/80 space-y-4 leading-relaxed">
              {isImprint ? (
                <>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('legal.imprint.providerInfo')}</h4>
                    <p className="text-white/60">{t('legal.imprint.responsible')}</p>
                    <p className="font-medium text-white">{t('legal.imprint.name')}</p>
                    <p className="text-white/70">{t('legal.imprint.address')}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('legal.imprint.contact')}</h4>
                    <p className="text-white/70">{t('legal.imprint.email')}</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="font-semibold text-white mb-1 text-xs uppercase tracking-wider">{t('legal.imprint.disclaimerTitle')}</h4>
                    <p className="text-xs text-white/60 leading-normal">{t('legal.imprint.disclaimerText')}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('legal.privacy.overviewTitle')}</h4>
                    <p className="text-white/70 text-xs md:text-sm">{t('legal.privacy.overviewText')}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('legal.privacy.participantTitle')}</h4>
                    <p className="text-white/70 text-xs md:text-sm">{t('legal.privacy.participantText')}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('legal.privacy.hostTitle')}</h4>
                    <p className="text-white/70 text-xs md:text-sm">{t('legal.privacy.hostText')}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('legal.privacy.rightsTitle')}</h4>
                    <p className="text-white/70 text-xs md:text-sm">{t('legal.privacy.rightsText')}</p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-white/90 bg-white/10 hover:bg-white/15 active:scale-95 rounded-xl transition-all cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
