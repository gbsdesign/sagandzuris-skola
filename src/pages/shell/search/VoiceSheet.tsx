import React from 'react';
import { Mic } from 'lucide-react';
import { Button, Sheet } from '../../../components/ui2';
import type { VoiceState } from '../voiceSearch';

/** The big wine mic with its soft rings — the voice sheet's and the singing search's. `still`: no motion (a state picture). */
export const MicRings: React.FC<{ size?: 'md' | 'lg'; still?: boolean }> = ({ size = 'md', still }) => (
  <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center rounded-full bg-wine/10 ${size === 'lg' ? 'size-[220px]' : 'size-36'} ${still ? '' : 'motion-safe:animate-pulse'}`}>
    <span className={`flex items-center justify-center rounded-full bg-wine/10 ${size === 'lg' ? 'size-[152px]' : 'size-28'}`}>
      <span className={`flex items-center justify-center rounded-full bg-wine text-white shadow-wine ${size === 'lg' ? 'size-24 [&_svg]:size-9' : 'size-21 [&_svg]:size-8'}`}>
        <Mic strokeWidth={1.75} />
      </span>
    </span>
  </span>
);

/** x-idea-khmit: „გისმენ…“ — the words heard so far; an error turns into a line and „კიდევ ვცდი“. */
export const VoiceSheet: React.FC<{
  open: boolean; state: VoiceState; heard: string; error: string; onClose: () => void; onRetry: () => void;
}> = ({ open, state, heard, error, onClose, onRetry }) => (
  <Sheet open={open} title="გისმენ…" onClose={onClose}>
    <div className="flex flex-col items-center gap-3 pb-2 text-center">
      <MicRings still={state === 'error'} />
      {state === 'error' ? (
        <>
          <p role="alert" className="px-2 text-lead leading-snug font-bold">{error}</p>
          <Button kind="soft" onClick={onRetry}>კიდევ ვცდი</Button>
        </>
      ) : (
        <>
          <p aria-live="polite" className="min-h-[1.5em] px-2 text-head leading-snug font-bold wrap-break-word">{heard ? `„${heard}“` : ''}</p>
          <p className="px-4 text-body leading-normal text-mut">თქვი, რას ეძებ. დასრულებისას თვითონ მოძებნის.</p>
        </>
      )}
    </div>
  </Sheet>
);
