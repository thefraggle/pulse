import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText,
  confirmVariant = 'primary',
  onConfirm,
  isConfirmLoading = false
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const titleId = useId();
  const isDestructive = confirmVariant === 'danger';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback light-dismiss for browsers without <dialog closedby="any"> (e.g. Safari)
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

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={title ? titleId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto bg-[#0d0f1a] text-white border border-white/20 p-6 md:p-8 rounded-2xl max-w-md w-[calc(100%-2rem)] relative shadow-2xl text-left backdrop:bg-black/80 backdrop:backdrop-blur-md open:block"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 min-w-11 min-h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label={t('common.close')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {title && (
        <h2 id={titleId} className="text-xl font-bold text-white mb-2 pr-10">
          {title}
        </h2>
      )}
      {description && <p className="text-sm text-white/75 mb-6 leading-relaxed">{description}</p>}

      {children}

      {(onConfirm || confirmText) && (
        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            onClick={onClose}
            autoFocus={isDestructive}
            className="min-h-11 px-4 py-2 text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 active:scale-[0.98] rounded-xl transition-colors cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmLoading}
            className={`min-h-11 px-5 py-2 text-sm font-bold rounded-xl active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'glow-button'
            }`}
          >
            {isConfirmLoading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText || 'Confirm'}
          </button>
        </div>
      )}
    </dialog>
  );
}
