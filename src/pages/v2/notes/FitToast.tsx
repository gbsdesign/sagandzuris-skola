import React, { useEffect, useRef } from 'react';
import { Music } from 'lucide-react';
import { Press } from '../../../components/ui2';
import { shiftWords } from './voiceFit';

/** „შენს ხმაზეა“ — the notes were moved into my voice; undo is one tap. Hides itself after 6 s. */
export const FitToast: React.FC<{ shift: number; onUndo: () => void; onClose: () => void }> = ({ shift, onUndo, onClose }) => {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => close.current(), 6000);
    return () => clearTimeout(t);
  }, [shift]);
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="sg-up flex w-full max-w-[520px] items-center gap-3 rounded-card bg-ink p-3.5 text-white shadow-float">
        <span aria-hidden="true" className="flex size-icon shrink-0 items-center justify-center rounded-full bg-white/15 [&_svg]:size-[18px]">
          <Music />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-lead font-bold">შენს ხმაზეა</span>
          <span className="text-meta text-white/80 wrap-break-word">{shiftWords(shift)}</span>
        </span>
        <Press
          onClick={onUndo}
          className="flex h-tap shrink-0 cursor-pointer items-center rounded-full bg-white/90 px-4 text-body font-bold text-ink active:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          დააბრუნე
        </Press>
      </div>
    </div>
  );
};
