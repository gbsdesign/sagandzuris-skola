import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Seg, TopBar } from '../../../components/ui2';
import { openOverlay } from '../../../utils/backToClose';

export type StudioTab = 'mix' | 'record';

/** „კლასის სტუდია“ in the new look (board x-studia): a screen of its own over the page — the bar (← the name, the chant and
 *  its book under it), a teacher's two tabs, the body. While a take is recorded, made or sent it cannot be closed (`locked`),
 *  as the old look's window. The logic stays in components/studio/ClassStudio.tsx. */
export const StudioScreen: React.FC<{
  title: string;
  sub: string;
  onClose: () => void;
  locked: boolean;
  /** a teacher's „კლასის ჩანაწერები · ჩემი ხმა“ (none while something is being made) */
  tabs: { value: StudioTab; onChange: (t: StudioTab) => void } | null;
  children: React.ReactNode;
}> = ({ title, sub, onClose, locked, tabs, children }) => {
  const close = useRef(onClose);
  close.current = onClose;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  // the phone's back closes the studio (a history step of its own); while a take is being recorded / made / sent it stays
  // open and takes a new step, so the next back is not lost either
  const [step, setStep] = useState(0);
  useEffect(() => openOverlay(() => {
    if (lockedRef.current) setStep(n => n + 1);
    else close.current();
  }), [step]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !lockedRef.current) close.current(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[75] flex flex-col overflow-y-auto overscroll-contain bg-page text-ink safe-top safe-x">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <TopBar title={title} sub={sub} onBack={locked ? undefined : onClose} />
        {tabs && (
          <Seg<StudioTab> label="სტუდია" value={tabs.value} onChange={tabs.onChange} items={[
            { id: 'mix', label: 'კლასის ჩანაწერები' },
            { id: 'record', label: 'ჩემი ხმა' },
          ]} />
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};
