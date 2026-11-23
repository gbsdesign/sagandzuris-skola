import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { INSTRS, type Instr } from '../../../utils/melody';
import { triggerHaptic } from '../../../utils/haptics';

/** „ტონი − 0 +“: a word, the value and two round buttons */
export const Stepper: React.FC<{
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusOff?: boolean;
  plusOff?: boolean;
  dark?: boolean;
  small?: boolean;
}> = ({ label, value, onMinus, onPlus, minusOff, plusOff, dark, small }) => {
  const btn = `flex ${small ? 'size-8' : 'size-9'} shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-90 disabled:opacity-30 [&_svg]:size-4 ${
    dark ? 'bg-white/20 text-white' : 'bg-soft text-wine'
  } relative before:absolute before:-inset-1 before:rounded-full`;
  return (
    <div className={`flex items-center gap-1 ${small ? '' : 'rounded-full bg-page py-0.5 pl-3 pr-0.5'}`}>
      <span className={`mr-0.5 text-cap font-semibold ${dark ? 'text-white/85' : 'text-mut'}`}>{label}</span>
      <button type="button" disabled={minusOff} onClick={e => { e.stopPropagation(); triggerHaptic(8); onMinus(); }} aria-label={`${label} — ნაკლები`} className={btn}>
        <Minus />
      </button>
      <span className={`min-w-[2.6rem] text-center text-meta font-bold tabular-nums ${dark ? 'text-white' : 'text-ink'}`}>{value}</span>
      <button type="button" disabled={plusOff} onClick={e => { e.stopPropagation(); triggerHaptic(8); onPlus(); }} aria-label={`${label} — მეტი`} className={btn}>
        <Plus />
      </button>
    </div>
  );
};

/** the keyboard's sound: four chips */
export const InstrChips: React.FC<{ value: Instr; onChange: (i: Instr) => void }> = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="ხმა" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
    {INSTRS.map(x => (
      <button
        key={x.id}
        type="button"
        role="radio"
        aria-checked={value === x.id}
        onClick={() => { triggerHaptic(8); onChange(x.id); }}
        className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-semibold transition active:scale-95 ${
          value === x.id ? 'bg-wine text-white' : 'bg-page text-ink'
        }`}
      >
        {x.name}
      </button>
    ))}
  </div>
);
