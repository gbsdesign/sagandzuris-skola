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

  // the app's paper with a coloured icon (the kit's Flash uses the same tones)
  const Icon =
    type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;
  const iconColor = type === 'success' ? 'text-emerald-600' : type === 'error' ? 'text-red-600' : 'text-[#7a2028]';

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:left-auto sm:right-[calc(env(safe-area-inset-right,0px)+1.25rem)] z-[200] sm:max-w-sm w-full px-4 animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto">
      <div
        role="status"
        className="flex items-center justify-between gap-3 pl-3.5 pr-1.5 py-1.5 min-h-12 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] shadow-[0_14px_30px_-14px_rgba(74,52,38,0.45)] text-[#2a2017]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-[18px] h-[18px] shrink-0 ${iconColor}`} />
          <p className="text-sm font-semibold leading-snug">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          title="დახურვა"
          className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
