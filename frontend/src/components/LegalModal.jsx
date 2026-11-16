import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, X } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, type = 'imprint' }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback light-dismiss for browsers without <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const handlePointerDown = (e) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e) => {
      if (pressedOutside && isOutside(e)) {
        onClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onClose]);

  const isImprint = type === 'imprint';
  const title = isImprint ? t('legal.imprintTitle') : t('legal.privacyTitle');

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto bg-[#0d0f1a] text-white border border-white/20 p-6 md:p-8 rounded-2xl max-w-xl w-[calc(100%-2rem)] max-h-[85vh] relative shadow-2xl text-left backdrop:bg-black/85 backdrop:backdrop-blur-md open:flex open:flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          {isImprint ? (
            <FileText className="w-5 h-5 text-indigo-400" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          )}
          <h2 id={titleId} className="text-xl font-bold text-white">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-w-11 min-h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto pr-2 text-sm text-white/85 space-y-4 leading-relaxed">
        {isImprint ? (
          <>
            <div>
              <h3 className="font-semibold text-white mb-1">{t('legal.imprint.providerInfo')}</h3>
              <p className="text-white/75">{t('legal.imprint.responsible')}</p>
              <p className="font-medium text-white">{t('legal.imprint.name')}</p>
              <p className="text-white/80">{t('legal.imprint.address')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">{t('legal.imprint.contact')}</h3>
              <p className="text-white/80">{t('legal.imprint.phone')}</p>
              <p className="text-white/80">{t('legal.imprint.email')}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <h3 className="font-semibold text-white mb-1 text-xs uppercase tracking-wider">{t('legal.imprint.disclaimerTitle')}</h3>
              <p className="text-xs text-white/75 leading-normal">{t('legal.imprint.disclaimerText')}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="font-semibold text-white mb-1">{t('legal.privacy.overviewTitle')}</h3>
              <p className="text-white/80 text-xs md:text-sm">{t('legal.privacy.overviewText')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">{t('legal.privacy.participantTitle')}</h3>
              <p className="text-white/80 text-xs md:text-sm">{t('legal.privacy.participantText')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">{t('legal.privacy.hostTitle')}</h3>
              <p className="text-white/80 text-xs md:text-sm">{t('legal.privacy.hostText')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-1">{t('legal.privacy.rightsTitle')}</h3>
              <p className="text-white/80 text-xs md:text-sm">{t('legal.privacy.rightsText')}</p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="min-h-11 px-5 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 active:scale-[0.98] rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {t('common.close')}
        </button>
      </div>
    </dialog>
  );
}
