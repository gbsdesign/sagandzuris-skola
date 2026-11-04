import React from 'react';
import { BrickWall, Castle, Coins, Grape, Store, TreePine, Wheat, type LucideIcon } from 'lucide-react';
import { GOOD_NAMES, REGION_IN, REGION_NAMES, WORKS, needCount, type Good, type OkLine, type OkOpen } from '../../../utils/okrosKhana';

// „ოქროს ხანა“'s looks, shared by the board, the play screen and the kit's colours (src/print/games/okros-khana.js keeps
// the same): the five goods' colours and marks, the four houses' colours, the chronicle's lines, a work's card.

export const GOOD_LOOK: readonly { color: string; tint: string; ink: string; Icon: LucideIcon }[] = [
  { color: '#2e6b3f', tint: '#d3e6cc', ink: '#1f4a2b', Icon: TreePine },
  { color: '#6b645c', tint: '#e2dbd1', ink: '#4a443e', Icon: BrickWall },
  { color: '#b7791f', tint: '#f3e1b6', ink: '#7a4f12', Icon: Wheat },
  { color: '#6d2a6e', tint: '#ead2e6', ink: '#4f1d50', Icon: Grape },
  { color: '#c49a1e', tint: '#f7e9ad', ink: '#7a5c0a', Icon: Coins },
];
export const MARKET = { color: '#7a2028', tint: '#fbf1e2', Icon: Store };
export const WORK_ICON = Castle;
/** the houses: their colours and names (the kit's estates and riders are printed in them) */
export const HOUSES: readonly { color: string; soft: string; name: string }[] = [
  { color: '#b8322a', soft: '#f6dcd8', name: 'წითელი' },
  { color: '#2357a8', soft: '#d9e4f5', name: 'ლურჯი' },
  { color: '#12858a', soft: '#d2ecec', name: 'ფირუზისფერი' },
  { color: '#2b2723', soft: '#e4e0db', name: 'შავი' },
];
export const GOLD = '#c9a227';
export const DEEP = '#3a2415';

/** a good's round mark (HTML) */
export const GoodDot: React.FC<{ k: Good; size?: number; className?: string }> = ({ k, size = 22, className = '' }) => {
  const L = GOOD_LOOK[k];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`} style={{ width: size, height: size, background: L.color }} aria-hidden="true">
      <L.Icon style={{ width: size * 0.6, height: size * 0.6 }} color="#fff" strokeWidth={2.2} />
    </span>
  );
};

/** goods as „🌲 2 · 🧱 1“: only the ones there are (none: `empty`) */
export const GoodsLine: React.FC<{ counts: readonly number[]; size?: number; empty?: string; className?: string }> = ({ counts, size = 20, empty = '—', className = '' }) => {
  const shown = counts.map((c, k) => [c, k] as const).filter(([c]) => c > 0);
  if (!shown.length) return <span className={`text-[#9a8b7b] ${className}`}>{empty}</span>;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {shown.map(([c, k]) => (
        <span key={k} className="inline-flex items-center gap-1 font-bold tabular-nums" title={GOOD_NAMES[k]}>
          <GoodDot k={k as Good} size={size} />{c}
        </span>
      ))}
    </span>
  );
};

export const goodsText = (counts: readonly number[]) => counts.map((c, k) => (c ? `${c} ${GOOD_NAMES[k]}` : '')).filter(Boolean).join(', ');

/** a rider's or an estate's mark: the house's colour */
export const HouseMark: React.FC<{ i: number; size?: number }> = ({ i, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <path d="M3 11 L12 3 L21 11 V21 H3 Z" fill={HOUSES[i]?.color ?? '#999'} stroke="#fffaf0" strokeWidth="1.6" strokeLinejoin="round" />
    <rect x="10" y="14" width="4" height="7" fill="#fffaf0" />
  </svg>
);
export const RiderMark: React.FC<{ i: number; size?: number }> = ({ i, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <circle cx="12" cy="7" r="4.5" fill={HOUSES[i]?.color ?? '#999'} stroke="#fffaf0" strokeWidth="1.4" />
    <path d="M5 22 C5 15 8.5 12.5 12 12.5 C15.5 12.5 19 15 19 22 Z" fill={HOUSES[i]?.color ?? '#999'} stroke="#fffaf0" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

/** a chronicle's line, „შენ“ for me */
export const lineText = (l: OkLine, names: readonly string[], me: number) => {
  const who = 'who' in l ? (l.who === me ? 'შენ' : names[l.who] ?? '') : '';
  switch (l.k) {
    case 'go': {
      const got = goodsText(l.got);
      return `${who} → ${REGION_NAMES[l.to]}${got ? `: +${got}` : ''}`;
    }
    case 'build': return `${who}: მამული ${REGION_IN[l.at]} (+2)`;
    case 'give': return `${who}: ${WORKS[l.work].name} — ${goodsText(l.gave)} (+${l.pts})${l.done ? ' · დაასრულა!' : ''}`;
    case 'feast': return `${who}: სუფრა ${REGION_IN[l.at]} (+${l.pts})${l.guests.length ? ` · სტუმრები: ${l.guests.map(i => (i === me ? 'შენ' : names[i])).join(', ')} (+1)` : ''}`;
    case 'pass': return `${who}: სვლა დაასრულა`;
    case 'year': return `წელი ${l.year}: მეფე ${REGION_IN[l.king]}ა`;
    case 'new': return `ახალი საქმე: ${WORKS[l.work].name} (${REGION_NAMES[WORKS[l.work].region]})`;
  }
};

/** a work's needs as boxes: filled ones are given */
export const NeedBoxes: React.FC<{ o: OkOpen; size?: number }> = ({ o, size = 18 }) => {
  const w = WORKS[o.id];
  return (
    <span className="inline-flex flex-wrap items-center gap-1" aria-label={w.need.map((n, k) => (n ? `${GOOD_NAMES[k]} ${o.got[k]}/${n}` : '')).filter(Boolean).join(', ')}>
      {w.need.flatMap((n, k) => Array.from({ length: n }, (_, j) => {
        const done = j < o.got[k];
        const L = GOOD_LOOK[k];
        return (
          <span key={`${k}-${j}`} className="inline-flex items-center justify-center rounded-md" style={{ width: size, height: size, background: done ? L.color : L.tint, boxShadow: done ? 'none' : `inset 0 0 0 1.5px ${L.color}66` }}>
            <L.Icon style={{ width: size * 0.62, height: size * 0.62 }} color={done ? '#fff' : L.color} strokeWidth={2.2} />
          </span>
        );
      }))}
    </span>
  );
};

/** an open work: its name, where, what it still needs, the bonus */
export const WorkCard: React.FC<{ o: OkOpen; king: number; here?: boolean; note?: boolean }> = ({ o, king, here, note }) => {
  const w = WORKS[o.id];
  const given = o.got.reduce((a, b) => a + b, 0);
  return (
    <li className={`min-w-0 rounded-2xl px-3 py-2.5 ${here ? 'bg-[#fffaf0] ring-2 ring-[#e2c27a]' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-xl" style={{ background: '#f6ecd6', color: '#8a5a1c' }}><WORK_ICON className="w-[18px] h-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-tight text-[#2b1e14] [overflow-wrap:anywhere]">{w.name}</p>
          <p className="mt-0.5 text-[12px] font-bold leading-tight text-[#75685a]">
            {REGION_NAMES[w.region]}{w.region === king && <span className="text-[#a0701a]"> · მეფე აქაა</span>}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#3a2415] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#f7e9ad]" title="ვინც დაასრულებს">+{w.bonus}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <NeedBoxes o={o} />
        <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#75685a]">{given}/{needCount(w)}</span>
      </div>
      {note && <p className="mt-1.5 text-[12px] leading-snug text-[#75685a]">{w.note}</p>}
    </li>
  );
};

export const MarketMark: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: MARKET.color }} aria-hidden="true">
    <MARKET.Icon style={{ width: size * 0.6, height: size * 0.6 }} color="#fff" strokeWidth={2.2} />
  </span>
);
