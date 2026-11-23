import React from 'react';
import { VOICE_SPEEDS } from '../../../utils/melody';
import { triggerHaptic } from '../../../utils/haptics';

/** a voice message's pace: „1×“, a tap goes to the next (1 · 1.25 · 1.5 · 2 · 0.5 · 0.75) */
export const SpeedPill: React.FC<{ value: number; onChange: (s: number) => void; dark?: boolean }> = ({ value, onChange, dark }) => {
  const i = VOICE_SPEEDS.findIndex(s => Math.abs(s - value) < 0.001);
  const next = VOICE_SPEEDS[(i + 1) % VOICE_SPEEDS.length];
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); triggerHaptic(8); onChange(next); }}
      aria-label={`სიჩქარე ${value}× — შეცვლა`}
      title="სიჩქარე"
      className={`relative h-9 min-w-[3.25rem] shrink-0 cursor-pointer rounded-full px-2.5 text-meta font-bold tabular-nums transition active:scale-95 ${
        value !== 1 ? (dark ? 'bg-white text-wine' : 'bg-wine text-white') : dark ? 'bg-white/20 text-white' : 'bg-soft text-wine'
      }`}
    >
      {String(value).replace('.', ',')}×
    </button>
  );
};
