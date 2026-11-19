import React from 'react';
import { Delete } from 'lucide-react';
import { KEY_ROWS, type Mark } from '../../utils/sitqva';
import { triggerHaptic } from '../../utils/haptics';
import { useNewLook } from '../../design/newLook';

// The 33-letter Georgian keyboard on the screen (games hub, 2026-10-28): three rows of eleven in the alphabet's order,
// then a row of „წაშლა“ and „შემოწმება“. A key wears what the game learnt about its letter (green · amber · grey).
// Born with „დღის სიტყვა“, for every word game after it. Keys are 48 px tall; eleven in a row is what a phone's own
// Georgian keyboard does. A game of names of two words („ჩამოთვალე!“) asks for a space key too (`onSpace`).

// the new look (board x-tamashi-asoebi): white keys on the page's ground, the marks in the design's meanings
const KEY2: Record<Mark | 'none', string> = {
  none: 'bg-surf text-ink active:bg-soft',
  hit: 'bg-leaf text-white',
  near: 'bg-gold text-white',
  miss: 'bg-dim text-ink/70',
};

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
  onSpace?: () => void;
  /** the back key's own face and state (the teams of „ხუცური წარწერა“: „უკან“ takes the last call back) */
  backLabel?: React.ReactNode;
  backDisabled?: boolean;
}> = props => (useNewLook() ? <GeoKeyboard2 {...props} /> : <GeoKeyboard1 {...props} />);

type KeyboardProps = React.ComponentProps<typeof GeoKeyboard>;

const GeoKeyboard2: React.FC<KeyboardProps> = ({ marks, onKey, onBack, onEnter, enterLabel = 'შემოწმება', disabled, onSpace, backLabel, backDisabled }) => (
  <div className="flex flex-col gap-1.5 select-none" role="group" aria-label="კლავიატურა">
    {KEY_ROWS.map((row, i) => (
      <div key={i} className="flex gap-1">
        {row.map(ch => (
          <button
            key={ch}
            type="button"
            disabled={disabled}
            onClick={() => { triggerHaptic(5); onKey(ch); }}
            className={`h-tap min-w-0 flex-1 cursor-pointer rounded-chip text-lead leading-none font-bold transition active:scale-95 disabled:opacity-50 ${KEY2[marks[ch] ?? 'none']}`}
          >
            {ch}
          </button>
        ))}
      </div>
    ))}
    <div className="flex gap-1.5 pt-1">
      <button
        type="button"
        disabled={disabled || backDisabled}
        onClick={() => { triggerHaptic(5); onBack(); }}
        aria-label={typeof backLabel === 'string' ? backLabel : 'წაშლა'}
        className="flex h-tap w-[30%] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-surf text-body font-bold text-ink transition active:scale-[0.97] disabled:opacity-50 [&_svg]:size-5"
      >
        {backLabel ?? <><Delete strokeWidth={1.75} /> წაშლა</>}
      </button>
      {onSpace && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => { triggerHaptic(5); onSpace(); }}
          aria-label="ჰარი"
          className="h-tap w-[24%] cursor-pointer rounded-full bg-surf text-meta font-bold text-mut transition active:scale-[0.97] disabled:opacity-50"
        >
          ჰარი
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { triggerHaptic(10); onEnter(); }}
        className="h-tap min-w-0 flex-1 cursor-pointer truncate rounded-full bg-wine px-3 text-body font-bold text-white transition active:scale-[0.97] active:bg-wine-deep disabled:opacity-50"
      >
        {enterLabel}
      </button>
    </div>
  </div>
);

const GeoKeyboard1: React.FC<KeyboardProps> = ({ marks, onKey, onBack, onEnter, enterLabel = 'შემოწმება', disabled, onSpace, backLabel, backDisabled }) => (
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
        disabled={disabled || backDisabled}
        onClick={() => { triggerHaptic(5); onBack(); }}
        aria-label={typeof backLabel === 'string' ? backLabel : 'წაშლა'}
        className="w-[30%] h-12 rounded-lg bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center gap-1.5 text-[14px] font-bold active:scale-[0.97] disabled:opacity-50 cursor-pointer"
      >
        {backLabel ?? <><Delete className="w-5 h-5" /> წაშლა</>}
      </button>
      {onSpace && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => { triggerHaptic(5); onSpace(); }}
          aria-label="ჰარი"
          className="w-[24%] h-12 rounded-lg bg-white ring-1 ring-[#e8dcc8] text-[#8c7b66] text-[13px] font-bold active:scale-[0.97] disabled:opacity-50 cursor-pointer"
        >
          ჰარი
        </button>
      )}
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
