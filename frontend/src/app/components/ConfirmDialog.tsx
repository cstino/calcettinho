'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Modale di conferma a tema con l'app (dark, font-runtime, accento verde/rosso),
// al posto del window.confirm() nativo del browser.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onCancel}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F1116] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_30px_60px_-30px_rgba(0,0,0,.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
                danger ? 'bg-red-500/15' : 'bg-green-500/15'
              }`}
            >
              <AlertTriangle className={`w-7 h-7 ${danger ? 'text-red-400' : 'text-green-400'}`} />
            </div>
            <h3 className="text-white text-lg font-bold mb-2 font-runtime">
              {title}
            </h3>
            <p className="text-gray-400 text-sm mb-6 font-runtime">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white text-sm font-bold font-runtime hover:bg-white/5 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold font-runtime transition-transform active:scale-95 ${
                  danger
                    ? 'text-white bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_18px_-4px_rgba(220,38,38,.6)]'
                    : 'text-[#06210F] bg-gradient-to-b from-[#4BDB7E] to-[#2BA659] shadow-[0_0_18px_-4px_rgba(62,207,110,.6)]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
