import React, { useState } from 'react';
import { Loader2, Play, Square } from 'lucide-react';
import { triggerHaptic } from '../../../utils/haptics';
import { hushSnippets, useSnippet, type Clip } from './useSnippet';

// Pieces to listen to beside a game (2026-11-01, „ქართული აკორდი“ and „რვა ხმა“): the kinds of chord or the eight tones, each
// with its own ▶, one sounding at a time — a tap first silences every other piece on the screen (the round's own, too).

export const PlayDot: React.FC<{ busy: boolean; load: boolean; label: string; onTap: () => void; size?: 'md' | 'sm' }> = ({ busy, load, label, onTap, size = 'md' }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(8); onTap(); }}
    aria-label={busy ? 'გაჩერება' : label}
    className={`${size === 'sm' ? 'w-10 h-10' : 'w-11 h-11'} shrink-0 rounded-full flex items-center justify-center active:scale-[0.96] cursor-pointer transition-colors ${busy ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.08] text-[#7a2028] hover:bg-[#7a2028]/[0.14]'}`}
  >
    {load ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : busy ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-4.5 h-4.5 ml-0.5 fill-current" />}
  </button>
);

/** a list's player: which of its pieces sounds, and a tap that plays one or stops it */
export const useSampler = (seconds: number) => {
  const snip = useSnippet(seconds);
  const [on, setOn] = useState<number | null>(null);
  const busy = snip.state === 'play' || snip.state === 'load';
  const tap = (i: number, clip: Clip) => {
    if (on === i && busy) { snip.stop(); return; }
    hushSnippets();
    setOn(i);
    snip.play(clip);
  };
  return { tap, isOn: (i: number) => on === i && busy, isLoading: (i: number) => on === i && snip.state === 'load', state: snip.state };
};

/** one piece to listen to (an answer's card: „this tone's model“) */
export const SampleBtn: React.FC<{ clip: Clip; label: string; seconds: number }> = ({ clip, label, seconds }) => {
  const s = useSampler(seconds);
  return (
    <div className="mt-3 flex items-center gap-3">
      <PlayDot busy={s.isOn(0)} load={s.isLoading(0)} label={label} onTap={() => s.tap(0, clip)} />
      <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-snug text-[#7a2028]">{label}</span>
    </div>
  );
};
