import React from 'react';
import { Delete } from 'lucide-react';
import { KEY_ROWS, type Mark } from '../../utils/sitqva';
import { triggerHaptic } from '../../utils/haptics';

// The 33-letter Georgian keyboard on the screen (games hub, 2026-10-28): three rows of eleven in the alphabet's order,
// then a row of „წაშლა“ and „შემოწმება“. A key wears what the game learnt about its letter (green · amber · grey).
// Born with „დღის სიტყვა“, for every word game after it. Keys are 48 px tall; eleven in a row is what a phone's own
// Georgian keyboard does.

const KEY: Record<Mark | 'none', string> = {
  none: 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:bg-[#fbf6ec]',
  hit: 'bg-[#2f7d4f] text-white',
  near: 'bg-[#d9a21b] text-white',
  miss: 'bg-[#b9ad9c] text-white/90',
};

export const GeoKeyboard: React.FC<{
  marks: Record<string, Mark>;
  onKey: (letter: string) => void;
  onBack: () => void;
  onEnter: () => void;
  enterLabel?: string;
  disabled?: boolean;
}> = ({ marks, onKey, onBack, onEnter, enterLabel = 'შემოწმება', disabled }) => (
  <div className="space-y-1.5 select-none" role="group" aria-label="კლავიატურა">
    {KEY_ROWS.map((row, i) => (
      <div key={i} className="flex gap-1">
        {row.map(ch => (
          <button
            key={ch}
            type="button"
            disabled={disabled}
            onClick={() => { triggerHaptic(5); onKey(ch); }}
            className={`flex-1 min-w-0 h-12 rounded-lg text-[17px] font-bold leading-none transition active:scale-95 disabled:opacity-50 cursor-pointer ${KEY[marks[ch] ?? 'none']}`}
          >
            {ch}
          </button>
        ))}
      </div>
    ))}
    <div className="flex gap-1.5 pt-0.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { triggerHaptic(5); onBack(); }}
        aria-label="წაშლა"
        className="w-[30%] h-12 rounded-lg bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center gap-1.5 text-[14px] font-bold active:scale-[0.97] disabled:opacity-50 cursor-pointer"
      >
        <Delete className="w-5 h-5" /> წაშლა
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { triggerHaptic(10); onEnter(); }}
        className="flex-1 h-12 rounded-lg bg-[#7a2028] text-[#fbf6ec] text-[15px] font-bold active:scale-[0.97] disabled:opacity-50 cursor-pointer"
      >
        {enterLabel}
      </button>
    </div>
  </div>
);

export default GeoKeyboard;
