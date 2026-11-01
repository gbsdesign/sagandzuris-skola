import React from 'react';
import { Check, X, Zap } from 'lucide-react';
import { softBreaks } from '../../../utils/tsqvilebi';
import type { Side, Team } from '../../../utils/saidumlo';
import { triggerHaptic } from '../../../utils/haptics';

// „საიდუმლო სახელები“'s pieces (2026-11-01): the two teams' looks, a word's tile and the board of 25 — shared by the game
// alone, the class's board and the captain's key.

export const TEAM: Record<Team, { label: string; of: string; color: string; soft: string }> = {
  blue: { label: 'ლურჯები', of: 'ლურჯებმა', color: '#2b5f8a', soft: '#e3edf5' },
  red: { label: 'წითლები', of: 'წითლებმა', color: '#b23a48', soft: '#f7e4e6' },
};
export const SIDE_LOOK: Record<Side, { bg: string; fg: string; label: string }> = {
  blue: { bg: TEAM.blue.color, fg: '#fff', label: 'ლურჯი' },
  red: { bg: TEAM.red.color, fg: '#fff', label: 'წითელი' },
  none: { bg: '#e6dccb', fg: '#6f6253', label: 'არავისი' },
  trap: { bg: '#2a211b', fg: '#f0d9a0', label: 'ხაფანგი' },
};

/** how a tile looks: closed (a word to touch), opened as a side, or (alone) found / missed; `hint` = shown faintly after the end */
export type TileLook = { kind: 'closed' } | { kind: 'side'; side: Side; faint?: boolean } | { kind: 'found' } | { kind: 'miss' } | { kind: 'trap' } | { kind: 'missed' };

/** md = the game alone, lg = the class's board, fill = as tall as a row of a board that fills the screen (a phone on its side) */
export type TileSize = 'md' | 'lg' | 'fill';
const SIZE: Record<TileSize, string> = {
  md: 'min-h-[54px] sm:min-h-[64px] text-[12px] sm:text-[14px]',
  lg: 'min-h-[64px] sm:min-h-[76px] text-[13px] sm:text-[16px] lg:text-[18px]',
  fill: 'h-full min-h-[44px] text-[14px]',
};

export const Tile: React.FC<{ word: string; look: TileLook; onTap?: () => void; size?: TileSize }> = ({ word, look, onTap, size = 'md' }) => {
  const text = softBreaks(word, 7);
  const base = `relative w-full rounded-xl px-1 flex items-center justify-center text-center font-bold leading-[1.15] [hyphens:manual] select-none transition-[background-color,transform] ${SIZE[size]}`;
  if (look.kind === 'closed') {
    return (
      <button
        type="button"
        onClick={() => { triggerHaptic(8); onTap?.(); }}
        disabled={!onTap}
        className={`${base} bg-white text-[#4a3426] ring-1 ring-[#e0d2bb] shadow-[0_1px_0_#e0d2bb] cursor-pointer active:scale-[0.96] hover:bg-[#fbf6ec] disabled:cursor-default disabled:hover:bg-white`}
      >
        {text}
      </button>
    );
  }
  if (look.kind === 'side') {
    const l = SIDE_LOOK[look.side];
    return (
      <div className={base} style={look.faint ? { background: '#fff', color: look.side === 'none' ? '#75685a' : l.bg, boxShadow: `inset 0 0 0 2px ${l.bg}` } : { background: l.bg, color: l.fg }} aria-label={`${word} — ${l.label}`}>
        {look.side === 'trap' && !look.faint && <Zap className="absolute top-1 right-1 w-3 h-3 opacity-80" aria-hidden="true" />}
        <span className={look.faint ? '' : 'opacity-95'}>{text}</span>
      </div>
    );
  }
  const map = {
    found: { cls: 'bg-[#2b5f8a] text-white', Icon: Check },
    miss: { cls: 'bg-[#e6dccb] text-[#8a7b6b] line-through decoration-[#8a7b6b]/60', Icon: X },
    trap: { cls: 'bg-[#2a211b] text-[#f0d9a0]', Icon: Zap },
    missed: { cls: 'bg-white text-[#2b5f8a] border-2 border-dashed border-[#2b5f8a]/70', Icon: null },
  } as const;
  const m = map[look.kind];
  return (
    <div className={`${base} ${m.cls}`} aria-label={word}>
      {m.Icon && <m.Icon className="absolute top-1 right-1 w-3 h-3 opacity-75" aria-hidden="true" />}
      <span>{text}</span>
    </div>
  );
};

export const Board: React.FC<{ children: React.ReactNode; label?: string; fill?: boolean }> = ({ children, label = 'ბადე', fill }) => (
  <div className={`grid grid-cols-5 gap-1.5 sm:gap-2 ${fill ? 'grid-rows-5 h-full' : ''}`} role="group" aria-label={label}>{children}</div>
);

/** the two teams with how many words each still has; the one whose turn it is stands out */
export const TeamsLeft: React.FC<{ left: Record<Team, number>; turn?: Team | null; wins?: Record<Team, number>; stack?: boolean }> = ({ left, turn, wins, stack }) => (
  <div className={`grid gap-2 ${stack ? 'grid-cols-1' : 'grid-cols-2'}`}>
    {(['blue', 'red'] as const).map(t => {
      const on = turn === t;
      return (
        <div
          key={t}
          className={`rounded-2xl px-3 py-2 flex items-center gap-2 transition-shadow ${on ? 'text-white' : ''}`}
          style={on ? { background: TEAM[t].color, boxShadow: `0 6px 16px -8px ${TEAM[t].color}` } : { background: TEAM[t].soft, color: TEAM[t].color }}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold leading-tight">{TEAM[t].label}</span>
            <span className={`block text-[12px] leading-tight ${on ? 'text-white/85' : 'opacity-80'}`}>{on ? 'ჯერია' : 'ელოდება'}{wins && (wins.blue || wins.red) ? ` · მოგება ${wins[t]}` : ''}</span>
          </span>
          <span className="text-[24px] font-bold tabular-nums leading-none" aria-label={`დარჩა ${left[t]}`}>{left[t]}</span>
        </div>
      );
    })}
  </div>
);
