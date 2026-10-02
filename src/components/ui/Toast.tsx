import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  isVisible,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgStyles =
    type === 'success'
      ? 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-900/30'
      : type === 'error'
      ? 'bg-red-900/90 text-white border-red-700 shadow-red-900/30'
      : 'bg-slate-900/90 text-white border-slate-700 shadow-slate-900/30';

  const Icon =
    type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;

  return (
    <div className="fixed bottom-5 right-5 z-[200] max-w-sm w-full px-4 animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto">
      <div
        className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-lg ${bgStyles}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-4 h-4 shrink-0 text-amber-300" />
          <p className="text-xs font-bold leading-snug">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
