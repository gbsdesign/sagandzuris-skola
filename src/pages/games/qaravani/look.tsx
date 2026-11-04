import React from 'react';
import { LOCO, SCORE, TRACKS, type QLine } from '../../../utils/qaravani';
import { Q_ANIMALS, Q_ART, Q_CITIES, Q_ENVELOPE, Q_GOODS, Q_GRAY, Q_INN_ART, Q_LOCO_ART, Q_PLAYERS } from '../../../data/qaravaniMap';

// „ქარავანი“'s pieces on screen (pages/games/qaravani/): the caravan cards as the kit prints them, small — the eight goods and
// the locomotive —, the deck's back, the letters' envelope, the players' animals and inns, a road's cells, the chronicle's words.

export const NIGHT = '#2b1e14';
export const GOLD = '#c9a24b';
export const GOLD_L = '#f0d9a0';
export const PAPER = '#fbf6ec';
export const WINE = '#7a2028';
export const INK = '#3b2a1c';

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

export interface KindLook { name: string; adj: string; color: string; dark: string; frame: string; bg: string; ink: string }
/** a card's look by its kind: 0–7 the goods, 8 the locomotive */
export const KIND: readonly KindLook[] = [
  ...Q_GOODS.map(g => ({
    name: g.name, adj: g.adj, color: g.color, dark: g.dark, frame: g.k === 'white' ? g.dark : g.color,
    bg: g.k === 'white' ? '#ebe4d6' : mix(g.color, PAPER, 0.84), ink: g.k === 'yellow' ? '#7a5a0c' : g.dark,
  })),
  { name: 'ორთქლმავალი', adj: 'ნებისმიერი', color: NIGHT, dark: NIGHT, frame: GOLD, bg: NIGHT, ink: GOLD_L },
];
/** a road's look by its colour: 0–7 the goods, 8 the gray stone road */
export const roadLook = (c: number) => (c === 8 ? { name: Q_GRAY.name, adj: Q_GRAY.adj, color: Q_GRAY.color, dark: Q_GRAY.dark } : Q_GOODS[c]);
/** the card's name on a card (the locomotive's breaks in two) */
const cardName = (k: number) => (k === LOCO ? 'ორთქლ­mავალი' : KIND[k].name);
const RAINBOW = [0, 6, 1, 2, 3, 7, 5, 4];

const Art: React.FC<{ k: number; size: number }> = ({ k, size }) => (k === LOCO
  ? <svg viewBox="0 0 100 60" width={size} height={size * 0.6} aria-hidden="true" dangerouslySetInnerHTML={{ __html: Q_LOCO_ART }} />
  : <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" dangerouslySetInnerHTML={{ __html: Q_ART[Q_GOODS[k].k] }} />);

/** a caravan card: its good (or the locomotive) on its colour; `count` on a corner, `name` under the picture */
export const CardFace: React.FC<{
  k: number; w: number; name?: boolean; count?: number; sel?: boolean; off?: boolean; onClick?: () => void; label?: string;
}> = ({ k, w, name, count, sel, off, onClick, label }) => {
  const L = KIND[k], loco = k === LOCO, h = Math.round(w * 1.36);
  const body = (
    <>
      {loco && (
        <span className="absolute inset-x-[3px] top-[3px] flex h-[5px] overflow-hidden rounded-t-[6px]" aria-hidden="true">
          {RAINBOW.map(c => <span key={c} className="flex-1" style={{ background: Q_GOODS[c].color }} />)}
        </span>
      )}
      <span className="flex flex-1 items-center justify-center pt-1"><Art k={k} size={Math.round(w * (loco ? 0.82 : 0.7))} /></span>
      {name && (
        <span className="block px-0.5 pb-1 text-center text-[11px] font-bold leading-[1.1] [hyphens:manual]" style={{ color: L.ink }}>{cardName(k)}</span>
      )}
      {count !== undefined && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-[12px] font-black tabular-nums shadow-sm ring-2 ring-[#fbf6ec]" style={{ background: loco ? GOLD : L.frame, color: loco ? NIGHT : k === 5 ? NIGHT : '#fff' }}>
          {count}
        </span>
      )}
    </>
  );
  const cls = `relative flex flex-col shrink-0 rounded-[9px] transition ${sel ? '-translate-y-1.5 shadow-[0_10px_18px_-10px_rgba(43,30,20,0.9)] ring-[3px] ring-[#7a2028] ring-offset-2 ring-offset-[#fbf6ec]' : ''} ${off ? 'opacity-40' : ''}`;
  const style: React.CSSProperties = { width: w, height: h, background: L.bg, border: `2.5px solid ${L.frame}` };
  return onClick && !off ? (
    <button type="button" onClick={onClick} aria-pressed={sel} aria-label={label ?? KIND[k].name} className={`${cls} cursor-pointer active:scale-[0.97]`} style={style}>{body}</button>
  ) : <span role="img" aria-label={label ?? KIND[k].name} className={cls} style={style}>{body}</span>;
};

/** the deck's back: the night with the eight goods round a wheel */
export const CardBack: React.FC<{ w: number }> = ({ w }) => (
  <span className="relative block shrink-0 rounded-[7px]" style={{ width: w, height: Math.round(w * 1.36), background: NIGHT, border: `2px solid ${GOLD}` }} aria-hidden="true">
    <svg viewBox="0 0 40 54" className="absolute inset-0 w-full h-full">
      <circle cx="20" cy="24" r="10.5" fill="none" stroke={GOLD} strokeWidth="1" />
      {Q_GOODS.map((g, i) => {
        const a = (i / 8) * 2 * Math.PI - Math.PI / 2;
        return <circle key={g.k} cx={20 + 10.5 * Math.cos(a)} cy={24 + 10.5 * Math.sin(a)} r="2.3" fill={g.color} stroke={GOLD_L} strokeWidth=".5" />;
      })}
      <circle cx="20" cy="24" r="3.2" fill={GOLD} />
    </svg>
  </span>
);

export const Envelope: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" dangerouslySetInnerHTML={{ __html: Q_ENVELOPE }} />
);

/** a player's animal on their colour */
export const Animal: React.FC<{ p: number; size: number }> = ({ p, size }) => {
  const P = Q_PLAYERS[p] ?? Q_PLAYERS[0];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: P.color, color: P.ink }} aria-hidden="true">
      <svg viewBox="0 0 100 80" width={size * 0.72} height={size * 0.58} fill="currentColor" dangerouslySetInnerHTML={{ __html: Q_ANIMALS[P.animal] ?? '' }} />
    </span>
  );
};

export const InnMark: React.FC<{ p: number; size: number }> = ({ p, size }) => (
  <svg viewBox="-6 -6 12 12" width={size} height={size} style={{ color: Q_PLAYERS[p]?.color ?? WINE }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: Q_INN_ART }} />
);

/** a cart: one of a player's cells, as a small block of their colour */
export const CartMark: React.FC<{ p: number; size?: number }> = ({ p, size = 14 }) => (
  <span className="inline-block shrink-0 rounded-[3px]" style={{ width: size, height: Math.round(size * 0.5), background: Q_PLAYERS[p]?.color ?? WINE, boxShadow: `inset 0 0 0 1.5px ${Q_PLAYERS[p]?.ink ?? GOLD_L}55` }} aria-hidden="true" />
);

/** a road's cells drawn in a row: its colour, a mountain road's broken edges and peak, a ship's mark */
export const RoadCells: React.FC<{ t: number; owner?: number; cell?: number }> = ({ t, owner = -1, cell = 22 }) => {
  const tr = TRACKS[t], L = roadLook(tr.color);
  const ships = tr.ships === 1 ? [0] : tr.ships === 2 ? [1, tr.n - 2] : [];
  const P = owner >= 0 ? Q_PLAYERS[owner] : null;
  const h = Math.round(cell * 0.46);
  return (
    <span className="inline-flex flex-wrap items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: tr.n }, (_, i) => (
        <span
          key={i}
          className="relative inline-flex items-center justify-center rounded-[3px]"
          style={{
            width: cell, height: h, background: P ? P.color : L.color,
            border: `1.5px ${tr.mountain ? 'dashed' : 'solid'} ${P ? P.ink : tr.mountain ? INK : L.dark}`,
          }}
        >
          {ships.includes(i) && !P && <span className="block w-[9px] h-[9px] rounded-full bg-white ring-1 ring-[#3b2a1c]" />}
        </span>
      ))}
    </span>
  );
};

/** the cards a payment takes: `n` cards of colour `c` (8: locomotives only), `l` of them locomotives */
export const PayChips: React.FC<{ c: number; l: number; n: number; dark?: boolean }> = ({ c, l, n, dark }) => {
  const parts = [...(c !== LOCO && n - l > 0 ? [{ k: c, x: n - l }] : []), ...(l > 0 ? [{ k: LOCO, x: l }] : [])];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {parts.map(p => (
        <span key={p.k} className={`inline-flex items-center gap-1 rounded-full pl-1 pr-2 h-7 text-[12.5px] font-bold ${dark ? 'bg-white/15 text-white' : 'bg-white text-[#2b1e14] ring-1 ring-[#e8dcc8]'}`}>
          <span className="h-5 w-5 rounded-full shrink-0" style={{ background: p.k === LOCO ? `conic-gradient(${RAINBOW.map(c2 => Q_GOODS[c2].color).join(',')})` : KIND[p.k].color, boxShadow: p.k === 5 || p.k === LOCO ? `inset 0 0 0 1.5px ${p.k === LOCO ? NIGHT : KIND[5].dark}` : undefined }} />
          {p.x} {p.k === LOCO ? 'ორთქლმავალი' : KIND[p.k].name}
        </span>
      ))}
    </span>
  );
};

// ---------- words ----------
export const cityName = (x: number) => Q_CITIES[x]?.name ?? '';
/** „ქუთაისში“: a city's name with -ში (a last ი goes) */
export const inCity = (x: number) => { const n = cityName(x); return n.endsWith('ი') ? `${n.slice(0, -1)}ში` : `${n}ში`; };
export const roadName = (t: number) => `${cityName(TRACKS[t].a)} — ${cityName(TRACKS[t].b)}`;
export const pointsOf = (t: number) => SCORE[TRACKS[t].n];

/** a chronicle's line: present tense, „შენ“ for this phone's player */
export const lineText = (l: QLine, names: readonly string[], me: number): string => {
  if (l.k === 'wash') return 'სამი ღია ორთქლმავალი — ხუთივე გადაიყარა, ახალი ხუთი გაიშალა.';
  const you = l.p === me;
  const who = you ? 'შენ' : names[l.p];
  const v = (third: string, second: string) => `${who} ${you ? second : third}`;
  switch (l.k) {
    case 'cards': {
      const open = l.face.length ? `ღია ${l.face.length > 1 ? 'ბარათებს' : 'ბარათს'}: ${l.face.map(k => KIND[k].name).join(', ')}` : '';
      const blind = l.blind ? `${l.blind} ბარათს დასტიდან` : '';
      return `${v('იღებს', 'იღებ')} ${[open, blind].filter(Boolean).join(' და ')}`;
    }
    case 'road':
      return `${v('იკავებს', 'იკავებ')} გზას ${roadName(l.t)} · +${pointsOf(l.t)}${l.extra ? ` · მთაში +${l.extra} ბარათი` : ''}`;
    case 'tunnel':
      return `${v('ბრუნდება', 'ბრუნდები')} მთის გზიდან ${roadName(l.t)} — ამინდმა კიდევ ${l.extra} ბარათი მოითხოვა`;
    case 'tickets': return `${who} ${l.of} წერილიდან ${l.kept}-ს ${you ? 'იტოვებ' : 'იტოვებს'}`;
    case 'start': return `${who} ${you ? 'იტოვებ' : 'იტოვებს'} ${l.kept} წერილს`;
    case 'inn': return `${v('აშენებს', 'აშენებ')} ქარვასლას ${inCity(l.x)}`;
    case 'last': return `${you ? 'შენ' : `${names[l.p]}ს`} ${you ? 'ურმები გითავდება' : 'ურმები უთავდება'} — ბოლო წრეა: ყველა კიდევ ერთხელ ითამაშებს`;
    case 'pass': return `${v('სვლას ტოვებს', 'სვლას ტოვებ')} — სხვა არაფერი შეიძლებოდა`;
    default: return '';
  }
};
