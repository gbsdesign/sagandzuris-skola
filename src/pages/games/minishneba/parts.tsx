import React from 'react';
import { Ban, Check, X } from 'lucide-react';
import { type ClueFate, type JoResult } from '../../../utils/minishneba';

// The pieces of „ერთი მინიშნება“ (2026-11-01): the clues as notes on the table (a struck one crossed, its word shown only at
// the end), the thirteen cards' marks and the verdict of a guess.

export interface Note { text: string; fate: ClueFate; who?: string }

const STRUCK: Record<ClueFate, string> = { ok: '', same: 'ერთნაირი', part: 'სიტყვის ნაწილი', empty: 'ცარიელი' };

/** the clues: a note each; a struck one crossed — its word shows only once the card is open; `onTap` lets the givers strike
 * one by hand (and take it back) */
export const Notes: React.FC<{ notes: Note[]; open?: boolean; big?: boolean; onTap?: (i: number) => void }> = ({ notes, open, big, onTap }) => (
  <ul className={`grid gap-2 ${notes.length > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`} aria-label="მინიშნებები">
    {notes.map((n, i) => {
      const ok = n.fate === 'ok';
      const Box = onTap && n.fate !== 'empty' ? 'button' : 'div';
      return (
        <li key={i} className="contents">
        <Box
          {...(Box === 'button' ? { type: 'button' as const, onClick: () => onTap?.(i), 'aria-pressed': !ok } : {})}
          className={`relative w-full min-h-[60px] rounded-2xl px-3 py-2 flex flex-col items-center justify-center text-center ${ok ? 'bg-[#fff6dc] ring-1 ring-[#e9cf8a] shadow-[0_2px_6px_-3px_rgba(122,90,20,0.45)]' : 'bg-[#f1e8d9]/70 ring-1 ring-[#e8dcc8]'} ${Box === 'button' ? 'cursor-pointer active:scale-[0.98] transition' : ''}`}
          style={ok ? { transform: `rotate(${(((i * 37) % 5) - 2) * (big ? 0.35 : 1)}deg)` } : undefined}
        >
          {ok ? (
            <span className={`font-serif-ge font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere] ${big ? 'text-[24px] lg:text-[30px]' : 'text-[20px]'}`}>{n.text}</span>
          ) : (
            <span className="inline-flex flex-col items-center gap-0.5">
              {open && n.fate !== 'empty' ? (
                <span className="font-serif-ge text-[17px] font-bold leading-tight text-[#9a8b7b] line-through [overflow-wrap:anywhere]">{n.text}</span>
              ) : (
                <Ban className="w-6 h-6 text-[#b9ad9c]" aria-hidden="true" />
              )}
              <span className="text-[12px] font-bold text-[#9a8b7b]">{STRUCK[n.fate]}</span>
            </span>
          )}
          {n.who && <span className="mt-1 text-[12px] leading-tight text-[#9a8b7b] [overflow-wrap:anywhere]">{n.who}</span>}
        </Box>
        </li>
      );
    })}
  </ul>
);

const DOT: Record<JoResult, string> = {
  right: 'bg-[#2f7d4f] text-white',
  wrong: 'bg-[#b23a48] text-white',
  pass: 'bg-[#d9cdb9] text-[#75685a]',
  lost: 'bg-[#4a3426]/70 text-white',
};
export const RESULT_TEXT: Record<JoResult, string> = { right: 'გამოიცნო', wrong: 'არასწორი', pass: 'გადაიდო', lost: 'დაიკარგა' };

/** the thirteen cards: green won, red wrong, grey passed, dark lost; the one on the table ringed */
export const JoDots: React.FC<{ res: readonly (JoResult | undefined)[]; n: number; at?: number }> = ({ res, n, at = -1 }) => (
  <ol className="flex flex-wrap gap-[3px]" aria-label="ბარათები">
    {Array.from({ length: n }, (_, i) => {
      const r = res[i];
      return (
        <li
          key={i}
          className={`w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-[11px] font-bold ${r ? DOT[r] : i === at ? 'bg-white ring-2 ring-[#7a2028] text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#b3a48f]'}`}
          aria-label={`${i + 1}: ${r ? RESULT_TEXT[r] : i === at ? 'ახლა' : 'წინ'}`}
        >
          {r === 'right' ? <Check className="w-3.5 h-3.5" /> : r === 'wrong' || r === 'lost' ? <X className="w-3.5 h-3.5" /> : i + 1}
        </li>
      );
    })}
  </ol>
);

/** a guess's verdict */
export const Verdict: React.FC<{ res: JoResult | undefined; word: string; guess: string; last: boolean }> = ({ res, word, guess, last }) => {
  if (!res) return null;
  const right = res === 'right';
  const text = right
    ? `სწორია! „${word}“`
    : res === 'wrong'
      ? `„${guess}“ — არა, „${word}“ იყო. ${last ? 'ერთი მოგებული ბარათი იკარგება.' : 'შემდეგი ბარათიც იკარგება.'}`
      : `„${word}“ იყო — ბარათი გადაიდო.`;
  return (
    <p
      className={`flex items-start gap-2 rounded-2xl px-4 py-2.5 text-[15.5px] font-bold leading-snug ${right ? 'bg-[#e6f2e9] text-[#2f7d4f]' : res === 'wrong' ? 'bg-[#fde8e8] text-[#b23a48]' : 'bg-[#f1e8d9] text-[#75685a]'}`}
      role="status"
    >
      {right ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <X className="w-5 h-5 shrink-0 mt-0.5" />}
      <span className="min-w-0">{text}</span>
    </p>
  );
};
