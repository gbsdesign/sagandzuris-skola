import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

// amber = recording player (the notes page's warm paper colours), dusk = synthesizer
const TONES = {
  amber: { ring: 'hover:ring-[#efd6a6]', changed: 'text-[#b4620e]' },
  dusk: { ring: 'hover:ring-dusk-300', changed: 'text-dusk-700' },
};

// Compact card: label on top, [−] value [+] below; tapping the value resets it.
// min-w: on a narrow phone the cards stack instead of running off the screen
export const Stepper: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  isDefault: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onReset: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  tone?: keyof typeof TONES;
}> = ({ icon, label, value, isDefault, onMinus, onPlus, onReset, minusDisabled, plusDisabled, tone = 'amber' }) => {
  const t = TONES[tone];
  const stepBtn = `w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white text-[#574739] shadow-xs ring-1 ring-[#e4d8c4] ${t.ring} active:scale-90 transition-all disabled:opacity-30 disabled:active:scale-100 cursor-pointer`;
  return (
    <div className="flex-1 min-w-[124px] flex flex-col gap-1 px-1.5 pt-1.5 pb-1.5 rounded-2xl bg-[#faf6ef] border border-[#e8dcc8]">
      <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#8c7c6b] leading-none">
        {icon}
        {label}
      </span>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => { triggerHaptic(5); onMinus(); }}
          disabled={minusDisabled}
          className={stepBtn}
          aria-label={`${label} −`}
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => { triggerHaptic(5); onReset(); }}
          className={`flex-1 min-w-0 h-9 text-center font-mono text-sm font-black transition-colors cursor-pointer ${isDefault ? 'text-[#2a2017]' : t.changed}`}
          title="საწყისზე დაბრუნება"
        >
          {value}
        </button>
        <button
          type="button"
          onClick={() => { triggerHaptic(5); onPlus(); }}
          disabled={plusDisabled}
          className={stepBtn}
          aria-label={`${label} +`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
