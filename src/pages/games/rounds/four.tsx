import React from 'react';
import { Check } from 'lucide-react';
import { OTKHI_LETTERS } from '../../../utils/otkhi';
import type { PublicQ } from '../../../utils/roundGames';
import { triggerHaptic } from '../../../utils/haptics';
import type { RoundFace } from './face';

// Four answers to pick from (the quick games where a round is named out of four: „ოთხიდან ერთი“, „ხმა-ხმად“, „სამ ნოტში!“):
// each in its own colour and letter, the same on every screen — a team writes the letter down; at the reveal the right one
// in green and how many picked each.

const four = (q: PublicQ) => q as { options?: string[]; right?: number };

/** each answer's colour */
export const LOOK = [
  { dot: 'bg-[#7a2028]', on: 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]', ink: 'text-[#7a2028]' },
  { dot: 'bg-[#2b5f8a]', on: 'bg-[#2b5f8a]/[0.07] ring-2 ring-[#2b5f8a]', ink: 'text-[#2b5f8a]' },
  { dot: 'bg-[#8a5a22]', on: 'bg-[#8a5a22]/[0.07] ring-2 ring-[#8a5a22]', ink: 'text-[#8a5a22]' },
  { dot: 'bg-[#5b3f8c]', on: 'bg-[#5b3f8c]/[0.07] ring-2 ring-[#5b3f8c]', ink: 'text-[#5b3f8c]' },
] as const;

export const Letter: React.FC<{ i: number; size?: 'md' | 'sm'; plain?: boolean }> = ({ i, size = 'md', plain }) => (
  <span
    aria-hidden="true"
    className={`shrink-0 rounded-full flex items-center justify-center font-serif-ge font-bold ${size === 'sm' ? 'w-8 h-8 text-[15px]' : 'w-9 h-9 text-[17px]'} ${plain ? 'bg-white text-[#2f7d4f]' : `${LOOK[i].dot} text-white`}`}
  >
    {OTKHI_LETTERS[i]}
  </span>
);

/** the four answers to read out (the host's and the teams' screen) */
export const OptionList: React.FC<{ q: PublicQ; className?: string }> = ({ q, className = '' }) => {
  const o = four(q);
  if (!o.options) return null;
  return (
    <ul className={`space-y-2 ${className}`}>
      {o.options.map((text, i) => (
        <li key={i} className="flex items-center gap-3">
          <Letter i={i} size="sm" />
          <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{text}</span>
        </li>
      ))}
    </ul>
  );
};

export const FourPick: RoundFace['Pick'] = ({ q, pick, onPick }) => (
  <ul className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="პასუხები">
    {(four(q).options ?? []).map((text, i) => {
      const on = pick === i;
      return (
        <li key={i}>
          <button
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { triggerHaptic(8); onPick(i); }}
            className={`w-full h-full min-h-14 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,transform] active:scale-[0.99] cursor-pointer ${on ? LOOK[i].on : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
          >
            <Letter i={i} />
            <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{text}</span>
            {on && <Check className={`w-5 h-5 shrink-0 ${LOOK[i].ink}`} aria-hidden="true" />}
          </button>
        </li>
      );
    })}
  </ul>
);

/** the reveal: the right answer in green, how many picked each, my own pick */
export const FourReveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = four(q);
  if (o.right === undefined || !o.options) return null;
  const counts = picks ? o.options.map((_, i) => picks.filter(p => p === i).length) : null;
  const answered = counts ? counts.reduce((a, b) => a + b, 0) : 0;
  return (
    <ul className="space-y-2" aria-label="პასუხები">
      {o.options.map((text, i) => {
        const right = i === o.right;
        const isMine = mine === i;
        const look = right ? 'bg-[#2f7d4f] text-white' : isMine ? 'bg-white ring-2 ring-[#c0392b]/55 text-[#4a3426]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]';
        return (
          <li key={i} className={`rounded-2xl px-3 py-2.5 ${look}`}>
            <div className="flex items-center gap-3">
              <Letter i={i} size="sm" plain={right} />
              <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug [overflow-wrap:anywhere]">
                {text}
                {isMine && <span className={`ml-1.5 text-[12.5px] ${right ? 'text-[#d9f0e0]' : 'text-[#c0392b]'}`}>· შენ</span>}
              </span>
              {counts && <span className="shrink-0 min-w-[1.5rem] text-right text-[15px] font-bold tabular-nums">{counts[i]}</span>}
              {right && <Check className="w-5 h-5 shrink-0" aria-label="სწორი პასუხი" />}
            </div>
            {counts && answered > 0 && (
              <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${right ? 'bg-white/25' : 'bg-[#f1e8d9]'}`}>
                <div className={`h-full rounded-full ${right ? 'bg-white' : LOOK[i].dot}`} style={{ width: `${Math.round((counts[i] / answered) * 100)}%` }} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** an answer in words: its letter and text */
export const fourName = (q: PublicQ, pick: number) => {
  const text = four(q).options?.[pick];
  return text ? `${OTKHI_LETTERS[pick]} · ${text}` : OTKHI_LETTERS[pick] ?? '';
};
export const fourConfirm = (_: PublicQ, pick: number | null) => (pick === null ? 'მონიშნე პასუხი' : `${OTKHI_LETTERS[pick]} — გაგზავნა`);
export const fourRight = (q: PublicQ) => four(q).right;
