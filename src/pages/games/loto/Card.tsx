import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { softBreaks } from '../../../utils/tsqvilebi';
import { NOT_MINE } from '../../../utils/loto';

// „საგალობო ლოტო“'s card: nine names, three by three. A name marked is green, a whole line gold („საგანძური!“); the name
// tapped and not yet judged has an amber ring; at the reveal the piece that sounded is outlined when it was on the card and
// not marked, and a wrong tap is crossed out. The same card in the room, alone, and when a printed card is checked.

export const LotoCard: React.FC<{
  names: readonly string[];
  card: readonly number[];
  marked?: readonly number[];
  /** the cells of whole lines */
  lines?: ReadonlySet<number>;
  pending?: number | null;
  /** the reveal: the piece that sounded, my wrong tap */
  right?: number;
  wrong?: number;
  /** the name just marked (it pops in) */
  fresh?: number;
  onTap?: (i: number) => void;
  label?: string;
  /** a phone on its side: the card as tall as the screen allows, beside the rest */
  side?: boolean;
  className?: string;
}> = ({ names, card, marked = [], lines, pending, right, wrong, fresh, onTap, label = 'ჩემი ბარათი', side, className = '' }) => (
  <div
    role="group"
    aria-label={label}
    style={side ? { width: CARD_SIDE } : undefined}
    className={`grid grid-cols-3 gap-1.5 rounded-[26px] bg-[#4a3426] p-1.5 shadow-[0_2px_10px_rgba(74,52,38,0.18)] ${side ? 'shrink-0' : 'mx-auto w-full max-w-[420px]'} ${className}`}
  >
    {card.map((i, cell) => {
      const done = marked.includes(i);
      const gold = done && !!lines?.has(cell);
      const wait = !done && pending === i;
      const missed = !done && right === i;
      const crossed = !done && wrong === i;
      const tone = gold
        ? 'bg-[#e2b93b] text-[#3b2a10]'
        : done
          ? 'bg-[#2f7d4f] text-white'
          : crossed
            ? 'bg-[#f6dcd8] text-[#7a2028]'
            : wait
              ? 'bg-[#fff4d6] text-[#4a3426] ring-[3px] ring-inset ring-[#c9a227]'
              : missed
                ? 'bg-white text-[#7a2028] outline-dashed outline-[2.5px] -outline-offset-[6px] outline-[#b4443a]'
                : 'bg-[#fbf6ec] text-[#4a3426]';
      const tappable = !!onTap && !done;
      return (
        <button
          key={cell}
          type="button"
          disabled={!tappable}
          aria-pressed={onTap ? wait || done : undefined}
          onClick={() => tappable && onTap!(i)}
          className={`relative flex aspect-[1/0.92] min-h-[76px] items-center justify-center rounded-[20px] px-1.5 py-2 text-center transition-colors ${tone} ${tappable ? 'cursor-pointer hover:brightness-[0.97] active:scale-[0.97]' : 'cursor-default'} ${fresh === i ? 'animate-[loto-pop_420ms_ease-out]' : ''}`}
        >
          <span className="font-serif-ge text-[13.5px] sm:text-[15px] font-bold leading-[1.18] [overflow-wrap:anywhere] [hyphens:manual]">{softBreaks(names[i] ?? '', 9)}</span>
          {done && (
            <span className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full ${gold ? 'bg-[#3b2a10]/15' : 'bg-white/25'}`}>
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
          {crossed && <X className="absolute right-1.5 top-1.5 h-4 w-4" strokeWidth={3} />}
        </button>
      );
    })}
  </div>
);

/** a phone on its side (the card goes beside the rest, as tall as the screen allows) */
const SHORT = '(max-height: 500px)';
export const useShort = () => {
  const [short, setShort] = useState(() => window.matchMedia(SHORT).matches);
  useEffect(() => {
    const m = window.matchMedia(SHORT);
    const h = () => setShort(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return short;
};
/** the card's width when it stands beside the rest: three rows of cells fit the screen's height under the bar */
export const CARD_SIDE = 'min(420px, calc((100dvh - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 1.08))';

/** the answer „it is not on my card“ */
export const NotMine: React.FC<{ on: boolean; onClick?: () => void; disabled?: boolean }> = ({ on, onClick, disabled }) => (
  <button
    type="button"
    aria-pressed={on}
    disabled={disabled}
    onClick={onClick}
    className={`mx-auto flex h-12 w-full max-w-[420px] items-center justify-center gap-2 rounded-full text-[15px] font-bold transition-colors ${on ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-white text-[#4a3426] ring-1 ring-[#d9cbb4] hover:bg-[#4a3426]/[0.04]'} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
  >
    <X className="h-4 w-4" />ჩემს ბარათზე არ არის
  </button>
);

export const isNotMine = (pick: number | null | undefined) => pick === NOT_MINE;
