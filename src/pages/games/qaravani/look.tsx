import React from 'react';
import { CARGO_N, CITY_CARGO, CITY_VALUE, GUEST, TRACKS, TRADE, type QLine } from '../../../utils/qaravani';
import { Q_ANIMALS, Q_BADGES, Q_CITIES, Q_GOODS, Q_INN_ART, Q_PLAYERS } from '../../../data/qaravaniMap';

// „ქარავანი“'s pieces on screen (pages/games/qaravani/): the houses' animals, carts and caravanserais, the goods' marks as the kit
// prints them, the dice, a road's cells, the abazi, the chronicle's words.

export const NIGHT = '#2b1e14';
export const GOLD = '#c9a24b';
export const GOLD_L = '#f0d9a0';
export const PAPER = '#fbf6ec';
export const WINE = '#7a2028';
export const INK = '#3b2a1c';
/** a free road's stone, as the kit prints it */
export const ROAD = { color: '#e9dfca', dark: '#8a7558' };

export const houseOf = (p: number) => Q_PLAYERS[p] ?? Q_PLAYERS[0];

/** a house's animal on its colour */
export const Animal: React.FC<{ p: number; size: number }> = ({ p, size }) => {
  const P = houseOf(p);
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: P.color, color: P.ink }} aria-hidden="true">
      <svg viewBox="0 0 100 80" width={size * 0.72} height={size * 0.58} fill="currentColor" dangerouslySetInnerHTML={{ __html: Q_ANIMALS[P.animal] ?? '' }} />
    </span>
  );
};

/** a caravanserai in a house's colour */
export const InnMark: React.FC<{ p: number; size: number }> = ({ p, size }) => (
  <svg viewBox="-6 -6 12 12" width={size} height={size} style={{ color: houseOf(p).color }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: Q_INN_ART }} />
);

/** a cart: one of a house's cells, as a small block of its colour */
export const CartMark: React.FC<{ p: number; size?: number }> = ({ p, size = 14 }) => (
  <span className="inline-block shrink-0 rounded-[3px]" style={{ width: size, height: Math.round(size * 0.5), background: houseOf(p).color, boxShadow: `inset 0 0 0 1.5px ${houseOf(p).ink}55` }} aria-hidden="true" />
);

/** an abazi: a small silver coin */
export const Coin: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true" className="shrink-0">
    <circle r="9.2" fill="#d9d4cb" stroke="#7d756a" strokeWidth="1.2" />
    <circle r="6.6" fill="none" stroke="#9a9184" strokeWidth=".8" />
    <text y=".6" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="#5e574d">ა</text>
  </svg>
);

/** a good's mark (0–7): a disc of its colour with its picture */
export const GoodBadge: React.FC<{ k: number; size: number; off?: boolean }> = ({ k, size, off }) => (
  <svg viewBox="-10.5 -10.5 21 21" width={size} height={size} aria-hidden="true" className={`shrink-0 ${off ? 'opacity-25 grayscale' : ''}`} dangerouslySetInnerHTML={{ __html: Q_BADGES[Q_GOODS[k]?.k] ?? '' }} />
);
export const goodName = (k: number) => Q_GOODS[k]?.name ?? '';

const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[20, 20]],
  2: [[12, 12], [28, 28]],
  3: [[12, 12], [20, 20], [28, 28]],
  4: [[12, 12], [28, 12], [12, 28], [28, 28]],
  5: [[12, 12], [28, 12], [20, 20], [12, 28], [28, 28]],
  6: [[12, 11], [28, 11], [12, 20], [28, 20], [12, 29], [28, 29]],
};
/** a die's face; `moved` when an abazi turned it */
export const Die: React.FC<{ v: number; size: number; moved?: boolean; label?: string }> = ({ v, size, moved, label }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={label ?? `კამათელი: ${v}`} className="shrink-0 drop-shadow-[0_3px_4px_rgba(43,30,20,0.25)]">
    <rect x="1.5" y="1.5" width="37" height="37" rx="8" fill={moved ? '#fff4d6' : '#fffdf7'} stroke={moved ? GOLD : INK} strokeWidth={moved ? 2.6 : 1.6} />
    {(PIPS[v] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" fill={v === 1 ? WINE : NIGHT} />)}
  </svg>
);

/** a road's cells in a row: a stone road, a mountain road's broken edges, a ship at sea; taken — its owner's colour */
export const RoadCells: React.FC<{ t: number; owner?: number; cell?: number }> = ({ t, owner = -1, cell = 22 }) => {
  const tr = TRACKS[t];
  const P = owner >= 0 ? houseOf(owner) : null;
  const h = Math.round(cell * 0.46);
  return (
    <span className="inline-flex flex-wrap items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: tr.n }, (_, i) => (
        <span
          key={i}
          className="relative inline-flex items-center justify-center rounded-[3px]"
          style={{ width: cell, height: h, background: P ? P.color : tr.water ? '#cfe1ea' : ROAD.color, border: `1.5px ${tr.mountain ? 'dashed' : 'solid'} ${P ? P.ink : tr.mountain ? INK : tr.water ? '#4f7d93' : ROAD.dark}` }}
        />
      ))}
    </span>
  );
};

// ---------- words ----------
export const cityName = (x: number) => Q_CITIES[x]?.name ?? '';
/** „ქუთაისში“: a city's name with -ში (a last ი goes) */
export const inCity = (x: number) => { const n = cityName(x); return n.endsWith('ი') ? `${n.slice(0, -1)}ში` : `${n}ში`; };
export const roadName = (t: number) => `${cityName(TRACKS[t].a)} — ${cityName(TRACKS[t].b)}`;
export const worthOf = (x: number) => CITY_VALUE[x] ?? 0;
export const cargoOf = (x: number) => CITY_CARGO[x] ?? -1;
export const ALL_GOODS = Array.from({ length: CARGO_N }, (_, k) => k);
/** „1 აბაზი“, „3 ურემი“ — Georgian keeps the noun singular after a number */
export const abazi = (n: number) => `${n} აბაზი`;

/** a chronicle's line: present tense, „შენ“ for this phone's house */
export const lineText = (l: QLine, names: readonly string[], me: number): string => {
  if (l.k === 'round') return `მოგზაურობა ${l.r} დაიწყო`;
  const you = l.p === me;
  const who = you ? 'შენ' : names[l.p];
  const v = (third: string, second: string) => `${who} ${you ? second : third}`;
  const spent = 'spent' in l && l.spent ? ` · კამათელზე ${abazi(l.spent)}` : '';
  switch (l.k) {
    case 'road': return `${v('იკავებს', 'იკავებ')} გზას ${roadName(l.t)} (${TRACKS[l.t].n} უჯრა)${spent}`;
    case 'trade': return `${v('ვაჭრობს', 'ვაჭრობ')}: +${abazi(TRADE)}${spent}`;
    case 'inn': return `${v('დგამს', 'დგამ')} ქარვასლას ${inCity(l.x)}`;
    case 'guest': return `ქარვასლა ${inCity(l.x)}: სტუმარი — ${l.from === me ? 'შენ' : names[l.from]}, ${who} +${abazi(GUEST)}`;
    default: return '';
  }
};
