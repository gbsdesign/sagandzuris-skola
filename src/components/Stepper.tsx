import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

// amber = recording player, dusk = synthesizer
const TONES = {
  amber: { ring: 'hover:ring-amber-300', changed: 'text-amber-700' },
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
  const stepBtn = `w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white text-slate-700 shadow-xs ring-1 ring-slate-200 ${t.ring} active:scale-90 transition-all disabled:opacity-30 disabled:active:scale-100 cursor-pointer`;
  return (
    <div className="flex-1 min-w-[124px] flex flex-col gap-1 px-1.5 pt-1.5 pb-1.5 rounded-2xl bg-slate-50 border border-slate-200/80">
      <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 leading-none">
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
          className={`flex-1 min-w-0 h-9 text-center font-mono text-sm font-black transition-colors cursor-pointer ${isDefault ? 'text-slate-700' : t.changed}`}
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
