import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { RoundButton } from '../../../components/ui2';
import { MainButton, type LearnAction } from './parts';

/** The phrase's notes big, over the whole screen, in the new look: the same as the old look's BigNotes (the lines as wide as
 *  the screen, the sentence and the one big button — on a phone on its side they stand beside the notes). */
export const BigNotesView: React.FC<{
  title: string; sub: string; onClose: () => void; say: React.ReactNode; main: LearnAction; pulse: boolean; children: React.ReactNode;
}> = ({ title, sub, onClose, say, main, pulse, children }) => createPortal(
  <div className="fixed inset-0 z-[95] flex flex-col bg-page text-ink" role="dialog" aria-modal="true" aria-label={`ნოტები დიდად · ${title}`}>
    <div className="safe-top safe-x shrink-0 border-b border-line">
      <div className="flex min-h-14 items-center gap-2.5 px-3 py-1.5 [@media(max-height:500px)]:min-h-12">
        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate text-lead leading-tight font-bold">{title}</p>
          {/* the chant's name: two lines rather than cut off */}
          <p className="line-clamp-2 text-meta leading-tight wrap-break-word text-mut [@media(max-height:500px)]:line-clamp-1">{sub}</p>
        </div>
        <RoundButton label="დახურვა" onClick={onClose}><X /></RoundButton>
      </div>
    </div>
    <div className="safe-x flex min-h-0 flex-1 flex-col [@media(max-height:500px)]:flex-row">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2">{children}</div>
      <div className="flex shrink-0 flex-col justify-center gap-2.5 border-t border-line bg-surf px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] [@media(max-height:500px)]:w-64 [@media(max-height:500px)]:border-t-0 [@media(max-height:500px)]:border-l">
        <p className="text-body leading-snug font-semibold" aria-live="polite">{say}</p>
        <MainButton action={main} pulse={pulse} />
      </div>
    </div>
  </div>,
  document.body,
);
