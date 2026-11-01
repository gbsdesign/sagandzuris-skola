import React from 'react';
import { Check, X } from 'lucide-react';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../../data/georgiaMapShapes';
import { KUTKHE_REGIONS } from '../../../utils/kutkhe';
import type { ChamoItem } from '../../../utils/chamotvale';

// „ჩამოთვალე!“'s board: a box for every member of the list — empty it shows its number and hint (a date, a value), named
// it shows the name (green, or the team's colour on one phone), and at the end the ones nobody named show in red. The map's
// list fills the songs map's regions too.

export type SlotState = 'empty' | 'found' | 'missed' | 'shown';

const GREEN = '#2f7d4f';
const RED = '#b23a48';

export const Slots: React.FC<{
  items: readonly ChamoItem[];
  state: (i: number) => SlotState;
  /** a found box's colour (a team's), else green */
  tint?: (i: number) => string | null;
  /** the box just named: a ring for a moment */
  fresh?: number | null;
  /** a small count in the corner (the reveal: how many named it) */
  badge?: (i: number) => React.ReactNode;
}> = ({ items, state, tint, fresh, badge }) => (
  <ol className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" aria-label="სია">
    {items.map((it, i) => {
      const s = state(i);
      const color = s === 'found' ? tint?.(i) ?? GREEN : null;
      const box = s === 'found'
        ? 'border border-transparent text-white shadow-[0_1px_3px_rgba(74,52,38,0.2)]'
        : s === 'missed' ? 'bg-[#b23a48]/[0.08] border border-[#b23a48]/30 text-[#8f2735]'
          : s === 'shown' ? 'bg-white border border-[#e8dcc8] text-[#4a3426]'
            : 'bg-white/60 border border-dashed border-[#d8c8ac] text-[#a99a86]';
      return (
        <li
          key={i}
          className={`relative min-h-[48px] rounded-xl px-2.5 py-1.5 flex flex-col justify-center transition-[box-shadow,transform] duration-300 ${box} ${fresh === i ? 'scale-[1.03] ring-2 ring-[#c9a227]' : ''}`}
          style={color ? { background: color } : undefined}
        >
          <span className={`text-[11px] font-bold leading-tight ${s === 'found' ? 'text-white/80' : s === 'empty' ? 'text-[#a99a86]' : 'text-[#8c7b66]'}`}>
            {it.hint ?? `${i + 1}`}
          </span>
          {s !== 'empty' && (
            <span className="mt-0.5 flex items-start gap-1 text-[13.5px] font-bold leading-tight break-words">
              {s === 'missed' && <X className="w-3.5 h-3.5 shrink-0 mt-px" aria-label="ვერ დაასახელეს" />}
              <span className="min-w-0">{it.name}</span>
            </span>
          )}
          {badge && <span className="absolute right-1.5 top-1">{badge(i)}</span>}
        </li>
      );
    })}
  </ol>
);

const { width, height } = GEORGIA_MAP_SIZE;
const REST = '#e9dfcd';

/** the songs map's regions, filled as they are named (the list's order = the map's) */
export const FillMap: React.FC<{ state: (i: number) => SlotState; tint?: (i: number) => string | null }> = ({ state, tint }) => {
  const fill = (i: number) => {
    const s = state(i);
    if (s === 'found') return tint?.(i) ?? GREEN;
    if (s === 'missed') return RED;
    return REST;
  };
  const tbilisi = GEORGIA_MAP_SHAPES.kalakuri.label;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#f7ecd9] via-[#f3e3c6] to-[#ead6b3] border border-[#e2c9a0] shadow-inner p-2">
      <svg viewBox={`-12 -12 ${width + 24} ${height + 24}`} className="w-full h-auto select-none" role="img" aria-label="საქართველოს რუკა">
        {KUTKHE_REGIONS.map((id, i) => (
          <path
            key={id}
            d={GEORGIA_MAP_SHAPES[id].d}
            fill={fill(i)}
            stroke="#fffaf0"
            strokeWidth={3}
            strokeLinejoin="round"
            style={{ transition: 'fill 0.35s' }}
          />
        ))}
        <circle cx={tbilisi[0]} cy={tbilisi[1]} r={9} fill="#fffaf0" stroke="#85502c" strokeWidth={3} />
        {KUTKHE_REGIONS.map((id, i) => {
          const [x, y] = GEORGIA_MAP_SHAPES[id].label;
          const s = state(i);
          if (s === 'found') {
            return (
              <g key={id} pointerEvents="none">
                <circle cx={x} cy={y} r={19} fill="#fffaf0" opacity={0.95} />
                <path d={`M${x - 9},${y} l6,7 l12,-14`} fill="none" stroke={tint?.(i) ?? GREEN} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          }
          // an empty region shows its box's number (Tbilisi's sits beside its dot)
          const tx = id === 'kalakuri' ? x + 26 : x;
          return (
            <g key={id} pointerEvents="none">
              <circle cx={tx} cy={y} r={19} fill={s === 'missed' ? '#fffaf0' : '#fffaf0'} opacity={s === 'missed' ? 0.95 : 0.8} />
              <text x={tx} y={y + 8} textAnchor="middle" fontSize={23} fontWeight={700} fill={s === 'missed' ? RED : '#8c7b66'} fontFamily="system-ui, sans-serif">{i + 1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** the count line over the board */
export const CountLine: React.FC<{ found: number; n: number; children?: React.ReactNode }> = ({ found, n, children }) => (
  <div className="flex items-center gap-3">
    <p className="flex items-center gap-1.5 font-serif-ge text-[20px] font-bold tabular-nums text-[#24603d]">
      <Check className="w-5 h-5" aria-hidden="true" />{found} / {n}
    </p>
    {children}
  </div>
);
