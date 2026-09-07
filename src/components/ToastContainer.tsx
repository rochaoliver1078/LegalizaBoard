import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ToastItem } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto relative overflow-hidden min-w-[260px] max-w-sm rounded-xl shadow-2xl text-white animate-fade-in ${t.isError ? 'bg-red-600' : 'bg-slate-900'}`}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 text-xs font-semibold">
            {t.isError
              ? <AlertCircle className="h-4 w-4 shrink-0 text-red-200" />
              : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
            <span className="flex-1 leading-snug">{t.msg}</span>
            {t.actionLabel && t.onAction && (
              <button
                onClick={() => { t.onAction?.(); onDismiss(t.id); }}
                className="shrink-0 uppercase tracking-wide text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 text-white/45 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div
            className={`absolute bottom-0 left-0 h-0.5 ${t.isError ? 'bg-red-300/70' : 'bg-emerald-400/70'}`}
            style={{ animation: `toastbar ${t.duration}ms linear forwards` }}
          />
        </div>
      ))}
    </div>
  );
};
