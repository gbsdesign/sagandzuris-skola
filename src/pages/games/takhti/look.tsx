import React from 'react';
import {
  Amphora, Anvil, Axe, Bath, BedDouble, Bell, Bomb, BookA, BookOpen, BookText, BowArrow, BrickWall, BrickWallFire, Castle, Cog, Coins, Crown,
  DoorOpen, Drama, DraftingCompass, Droplet, Feather, Fence, Flag, Flame, Flower2, Gavel, Gem, Globe, GraduationCap, Grape, Hammer, HandCoins,
  Handshake, House, Image as ImageIcon, Key, Lamp, Landmark, Layers, Library, Map as MapIcon, Medal, Moon, Mountain, MountainSnow, Music,
  NotebookPen, Paintbrush, Pickaxe, RotateCw, Route, Sailboat, Scale, School, Scroll, ScrollText, Shield, ShieldHalf, ShoppingBasket, Shovel,
  Sparkles, Sprout, Stamp, Star, Stethoscope, Store, Sun, Sword, Swords, Target, Telescope, Tent, Theater, TowerControl, TreeDeciduous, TreePine,
  Trees, Trophy, Volleyball, Warehouse, Waves, type LucideProps,
} from 'lucide-react';
import { CARDS, TOKENS, WONDERS, type CType, type Chain, type Eff, type Res, type Sci } from '../../../data/takhtiCards';
import { costParts, type Price } from '../../../utils/oriTakhti';
import { AGE_INFO, RES_INFO, TYPE_INFO } from './words';

// „ორი ტახტი“'s pieces drawn as the printed kit draws them (scripts/print-games/games/ori-takhti.mjs): resource chips, coins,
// laurels, shields, wisdom marks, the masters' marks, a card's face and back, a token, a monument. An effect is one SVG of
// items laid side by side (the kit's `items`), scaled down when its place is narrow.

type LI = React.ComponentType<LucideProps>;
type Custom = 'enamel' | 'horseshoe' | 'letter' | 'bridge' | 'lighthouse' | 'uremi' | 'knight';
const GOLD = '#c9a24b', GOLD_L = '#f1d793', NIGHT = '#2b1e14', PAPER = '#fffaf0';

const CUSTOM: Record<Custom, (c: string) => React.ReactNode> = {
  enamel: c => (<><circle cx="12" cy="12" r="9" /><path d="M12 6.2c1.7 2.3 1.7 4.1 0 5.8c-1.7-1.7-1.7-3.5 0-5.8ZM12 17.8c1.7-2.3 1.7-4.1 0-5.8c-1.7 1.7-1.7 3.5 0 5.8ZM6.2 12c2.3-1.7 4.1-1.7 5.8 0c-1.7 1.7-3.5 1.7-5.8 0ZM17.8 12c-2.3-1.7-4.1-1.7-5.8 0c1.7 1.7 3.5 1.7 5.8 0Z" fill={c} fillOpacity={0.35} /></>),
  horseshoe: c => (<><path d="M7.2 20.5C3.4 16.2 3.6 7.6 12 4.4C20.4 7.6 20.6 16.2 16.8 20.5" /><path d="M5.2 20.5h4M14.8 20.5h4" /><g fill={c} stroke="none"><circle cx="6.6" cy="12.4" r=".9" /><circle cx="8.3" cy="8.2" r=".9" /><circle cx="17.4" cy="12.4" r=".9" /><circle cx="15.7" cy="8.2" r=".9" /></g></>),
  letter: c => <text x="12" y="18.6" textAnchor="middle" fontWeight={800} fontSize={19} fill={c} stroke="none">ა</text>,
  // the kit's own drawings for the cards' pictures lucide has not
  bridge: () => (<><path d="M2 18.5h20" /><path d="M3 18.5V15a9 6.5 0 0 1 18 0v3.5" /><path d="M2 9.5h20" /><path d="M7 9.5v2.6M12 9.5v1.4M17 9.5v2.6" /></>),
  lighthouse: () => (<><path d="M8.8 21.5l1.6-12.5h3.2l1.6 12.5Z" /><path d="M7 21.5h10" /><path d="M9.6 9h4.8" /><path d="M10.2 9V6.2a1.8 1.8 0 0 1 3.6 0V9" /><path d="M4.5 4.5l3 1.6M19.5 4.5l-3 1.6M3.5 9h3M20.5 9h-3" /><path d="M10 14.5h4" /></>),
  uremi: c => (<><path d="M2.5 6.5h15l-1.4 6.2H3.9Z" /><path d="M6.5 6.5v6.2M10 6.5v6.2M13.5 6.5v6.2" /><circle cx="9.5" cy="16.6" r="4.4" /><circle cx="9.5" cy="16.6" r=".9" fill={c} /><path d="M9.5 12.2v8.8M5.1 16.6h8.8" /><path d="M17.2 11.4l5.3 3.1" /></>),
  knight: c => <path fill={c} stroke="none" d={KNIGHT_PATH} />,
};
/** the cards' pictures (the kit's `pic`; a green card shows its wisdom instead) */
const PIC: Record<string, LI | Custom> = {
  amphora: Amphora, anvil: Anvil, axe: Axe, bath: Bath, 'bed-double': BedDouble, bomb: Bomb, 'book-text': BookText, 'bow-arrow': BowArrow,
  'brick-wall': BrickWall, 'brick-wall-fire': BrickWallFire, bridge: 'bridge', coins: Coins, crown: Crown, 'door-open': DoorOpen, feather: Feather,
  fence: Fence, flame: Flame, 'flower-2': Flower2, gavel: Gavel, globe: Globe, 'graduation-cap': GraduationCap, hammer: Hammer,
  'hand-coins': HandCoins, handshake: Handshake, image: ImageIcon, knight: 'knight', library: Library, lighthouse: 'lighthouse', medal: Medal,
  mountain: Mountain, 'mountain-snow': MountainSnow, 'notebook-pen': NotebookPen, paintbrush: Paintbrush, pickaxe: Pickaxe, sailboat: Sailboat,
  school: School, 'scroll-text': ScrollText, shield: Shield, 'shield-half': ShieldHalf, 'shopping-basket': ShoppingBasket, shovel: Shovel,
  stamp: Stamp, stethoscope: Stethoscope, store: Store, swords: Swords, telescope: Telescope, tent: Tent, theater: Theater,
  'tower-control': TowerControl, 'tree-pine': TreePine, trees: Trees, uremi: 'uremi', volleyball: Volleyball, warehouse: Warehouse, waves: Waves,
};
const RES_ICON: Record<Res, LI | Custom> = { W: TreeDeciduous, S: BrickWall, K: Amphora, G: 'enamel', P: Scroll };
export const SCI_ICON: Record<Sci, LI | Custom> = { anbani: 'letter', karabadini: Sprout, astronomia: Star, khuroba: DraftingCompass, ruka: MapIcon, galoba: Music, samartali: Scale };
const CHAIN_ICON: Record<Chain, LI | Custom> = {
  nali: 'horseshoe', khmali: Sword, koshki: Castle, tsigni: BookOpen, borbali: Cog, nighabi: Drama, mtvare: Moon, tsveti: Droplet, gasaghebi: Key,
  samizne: Target, drosha: Flag, zari: Bell, lampari: Lamp, sveti: Landmark, mze: Sun, tvali: Gem, tasi: Trophy,
};
/** the tokens' marks, in TOKENS' order */
export const TOKEN_ICON: LI[] = [Grape, DraftingCompass, Route, Scale, Hammer, BookA, Feather, Swords, Mountain, House];

/** an icon in a 24-unit box drawn at (x, y) with size s inside an SVG */
const ic = (I: LI | Custom, x: number, y: number, s: number, color: string, w = 2.2) => (typeof I === 'string'
  ? <svg x={x} y={y} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{CUSTOM[I](color)}</svg>
  : <I x={x} y={y} size={s} color={color} strokeWidth={w} />);

// ---------- the pieces, in an SVG's units ----------
const resChip = (k: Res, x: number, y: number, s: number) => (<>
  <rect x={x} y={y} width={s} height={s} rx={s * 0.2} fill={RES_INFO[k].color} stroke={PAPER} strokeWidth={s * 0.05} />
  {ic(RES_ICON[k], x + s * 0.15, y + s * 0.15, s * 0.7, '#fff', 2.2)}
</>);
const coin = (n: number | string, cx: number, cy: number, s: number, neg = false) => {
  const t = String(n), fs = s * (t.length > 2 ? 0.4 : t.length > 1 ? 0.5 : 0.62);
  return (<>
    <circle cx={cx} cy={cy} r={s / 2} fill="#d8aa45" stroke="#a37a2c" strokeWidth={s * 0.06} />
    <circle cx={cx} cy={cy} r={s * 0.37} fill="none" stroke="#f3d98c" strokeWidth={s * 0.035} />
    <text x={cx} y={cy + fs * 0.36} textAnchor="middle" fontWeight={900} fontSize={fs} fill={neg ? '#8e2430' : '#4a3010'}>{t}</text>
  </>);
};
const wreath = (n: number | string, cx: number, cy: number, s: number) => {
  const r = s * 0.39, leaves: React.ReactNode[] = [];
  for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
    const a = ((side < 0 ? 112 + k * 25 : 68 - k * 25) * Math.PI) / 180;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), rot = (a * 180) / Math.PI + 90 + side * 22;
    leaves.push(<ellipse key={`${side}${k}`} cx={x} cy={y} rx={s * 0.11} ry={s * 0.05} transform={`rotate(${rot} ${x} ${y})`} fill="#4f7a3a" />);
  }
  const t = String(n), fs = s * (t.length > 1 ? 0.46 : 0.56);
  return (<>
    <circle cx={cx} cy={cy} r={s * 0.5} fill="#fbf6e4" stroke="#c9b77a" strokeWidth={s * 0.03} />
    {leaves}
    <text x={cx} y={cy + fs * 0.36} textAnchor="middle" fontWeight={900} fontSize={fs} fill="#2f4f22">{t}</text>
  </>);
};
const SHIELD_PATH = 'M12 1.8l8.6 3v6.4c0 5.6-3.6 9.6-8.6 11.2C7 20.8 3.4 16.8 3.4 11.2V4.8Z';
const shield = (cx: number, cy: number, s: number) => (
  <g transform={`translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 24})`}>
    <path d={SHIELD_PATH} fill="#c0434a" stroke={GOLD_L} strokeWidth={1.7} strokeLinejoin="round" />
    <path d="M12 6.4v11M7.6 10.6h8.8" stroke={GOLD_L} strokeWidth={2} strokeLinecap="round" />
  </g>
);
const sciMark = (k: Sci, cx: number, cy: number, s: number) => (<>
  <circle cx={cx} cy={cy} r={s * 0.48} fill="#fbf7ea" stroke="#d6c286" strokeWidth={s * 0.06} />
  {ic(SCI_ICON[k], cx - s * 0.31, cy - s * 0.31, s * 0.62, '#1f4d33', 2.1)}
</>);
const chainBadge = (c: Chain, cx: number, cy: number, s: number) => (<>
  <rect x={cx - s * 0.35} y={cy - s * 0.35} width={s * 0.7} height={s * 0.7} rx={s * 0.07} transform={`rotate(45 ${cx} ${cy})`} fill={PAPER} stroke={GOLD} strokeWidth={s * 0.07} />
  {ic(CHAIN_ICON[c], cx - s * 0.26, cy - s * 0.26, s * 0.52, '#3b2a1c', 2.3)}
</>);
const cardGlyph = (t: CType, cx: number, cy: number, h: number) => (<>
  <rect x={cx - h * 0.36} y={cy - h / 2} width={h * 0.72} height={h} rx={h * 0.12} fill={PAPER} stroke={PAPER} strokeWidth={h * 0.16} />
  <rect x={cx - h * 0.36} y={cy - h / 2} width={h * 0.72} height={h} rx={h * 0.12} fill={TYPE_INFO[t].color} stroke={NIGHT} strokeOpacity={0.55} strokeWidth={h * 0.05} />
</>);
export const WONDER_PATH = 'M4.5 21.5V12.8l3.2-1.9V8.6h2.1V7.1c0-1.3 1-2.4 2.2-2.6V2.5h.8v2c1.2.2 2.2 1.3 2.2 2.6v1.5h2.1v2.3l3.2 1.9v8.7h-4.6v-3.6a2.7 2.7 0 0 0-5.4 0v3.6Z';
const wonderGlyph = (cx: number, cy: number, s: number) => (
  <g transform={`translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 24})`}><path d={WONDER_PATH} fill={GOLD} stroke={PAPER} strokeWidth={1.1} strokeLinejoin="round" /></g>
);
const dark = (cx: number, cy: number, s: number, inner: React.ReactNode) => (<><circle cx={cx} cy={cy} r={s / 2} fill={NIGHT} stroke={GOLD_L} strokeWidth={s * 0.05} />{inner}</>);
const slash = (cx: number, cy: number, s: number, color: string) => <path d={`M${cx + s * 0.16} ${cy - s * 0.3}L${cx - s * 0.16} ${cy + s * 0.3}`} stroke={color} strokeWidth={s * 0.09} strokeLinecap="round" />;
const eqMark = (cx: number, cy: number, s: number, color: string) => <path d={`M${cx - s * 0.2} ${cy - s * 0.1}h${s * 0.4}M${cx - s * 0.2} ${cy + s * 0.1}h${s * 0.4}`} stroke={color} strokeWidth={s * 0.08} strokeLinecap="round" />;

interface Item { w: number; draw: (x: number, cy: number) => React.ReactNode }
/** an effect as a row of items (the kit's order), in units of the row's height */
const itemsOf = (eff: Eff, ink: string): Item[] => {
  const it: Item[] = [];
  const add = (w: number, draw: Item['draw']) => it.push({ w, draw });
  const res = (k: Res, s = 0.84) => add(s, (x, cy) => resChip(k, x, cy - s / 2, s));
  if (eff.prod) [...eff.prod].forEach(k => res(k as Res));
  if (eff.one) [...eff.one].forEach((k, i) => { if (i) add(0.38, (x, cy) => slash(x + 0.19, cy, 0.8, ink)); res(k as Res, 0.7); });
  if (eff.shields) for (let i = 0; i < eff.shields; i++) add(0.9, (x, cy) => shield(x + 0.45, cy, 0.9));
  if (eff.sci) { const s = eff.sci; add(1.06, (x, cy) => sciMark(s, x + 0.53, cy, 1.06)); }
  if (eff.trade) { [...eff.trade].forEach(k => res(k as Res)); add(0.42, (x, cy) => eqMark(x + 0.21, cy, 1, ink)); add(0.72, (x, cy) => coin(1, x + 0.36, cy, 0.72)); }
  if (eff.token) add(0.92, (x, cy) => (<><circle cx={x + 0.46} cy={cy} r={0.46} fill="#2f6b45" stroke={GOLD_L} strokeWidth={0.064} />{ic(Sparkles, x + 0.19, cy - 0.27, 0.54, PAPER, 2.1)}</>));
  if (eff.discard) add(0.92, (x, cy) => dark(x + 0.46, cy, 0.92, ic(Layers, x + 0.19, cy - 0.27, 0.54, GOLD_L, 2.2)));
  if (eff.ruin) {
    const t = eff.ruin;
    add(0.82, (x, cy) => (<>{cardGlyph(t, x + 0.41, cy, 0.75)}<path d={`M${x + 0.17} ${cy - 0.25}L${x + 0.65} ${cy + 0.25}M${x + 0.65} ${cy - 0.25}L${x + 0.17} ${cy + 0.25}`} stroke="#c0262f" strokeWidth={0.09} strokeLinecap="round" /></>));
  }
  if (eff.per) {
    const p = eff.per;
    add(0.86, (x, cy) => coin(eff.coins ?? 0, x + 0.43, cy, 0.86));
    add(0.3, (x, cy) => slash(x + 0.15, cy, 0.7, ink));
    add(0.66, (x, cy) => (p === 'wonder' ? wonderGlyph(x + 0.33, cy, 0.72) : cardGlyph(p, x + 0.33, cy, 0.66)));
  } else if (eff.coins) { const n = eff.coins; add(0.9, (x, cy) => coin(n, x + 0.45, cy, 0.9)); }
  if (eff.steal) { const n = eff.steal; add(0.9, (x, cy) => coin(`−${n}`, x + 0.45, cy, 0.9, true)); }
  if (eff.guild) {
    const g = eff.guild;
    if (g !== 'wonder' && g !== 'coins') add(0.8, (x, cy) => coin(1, x + 0.4, cy, 0.8));
    add(0.9, (x, cy) => wreath(g === 'wonder' ? 2 : 1, x + 0.45, cy, 0.9));
    add(0.3, (x, cy) => slash(x + 0.15, cy, 0.7, ink));
    if (g === 'wonder') add(0.7, (x, cy) => wonderGlyph(x + 0.35, cy, 0.76));
    else if (g === 'coins') add(0.76, (x, cy) => coin(3, x + 0.38, cy, 0.76));
    else if (g === 'brownGrey') { add(0.5, (x, cy) => cardGlyph('brown', x + 0.25, cy, 0.62)); add(0.5, (x, cy) => cardGlyph('grey', x + 0.25, cy, 0.62)); }
    else add(0.5, (x, cy) => cardGlyph(g, x + 0.25, cy, 0.62));
  }
  if (eff.again) add(0.86, (x, cy) => dark(x + 0.43, cy, 0.86, ic(RotateCw, x + 0.17, cy - 0.26, 0.52, GOLD_L, 2.6)));
  if (eff.vp) { const n = eff.vp; add(1, (x, cy) => wreath(n, x + 0.5, cy, 1)); }
  return it;
};

/** an effect's row of marks: `h` px high, narrower than `maxW` (scaled down to fit) */
export const Effect: React.FC<{ eff: Eff; h: number; maxW?: number; ink?: string }> = ({ eff, h, maxW, ink = PAPER }) => {
  const list = itemsOf(eff, ink);
  if (!list.length) return null;
  const gap = 0.1;
  const W = list.reduce((a, b) => a + b.w, 0) + gap * (list.length - 1);
  const width = Math.min(maxW ?? Infinity, W * h);
  let x = 0;
  return (
    <svg viewBox={`-0.04 -0.04 ${W + 0.08} 1.08`} width={width} height={(width / W) * 1.08} className="block shrink-0" aria-hidden>
      {list.map((i, k) => { const node = <g key={k}>{i.draw(x, 0.5)}</g>; x += i.w + gap; return node; })}
    </svg>
  );
};

// ---------- small marks as their own SVG (in HTML rows) ----------
export const ResMark: React.FC<{ r: Res; size: number; faint?: boolean }> = ({ r, size, faint }) => (
  <svg viewBox="-0.05 -0.05 1.1 1.1" width={size} height={size} className={`block shrink-0 ${faint ? 'opacity-30' : ''}`} aria-hidden>{resChip(r, 0, 0, 1)}</svg>
);
export const CoinMark: React.FC<{ n: number | string; size: number; neg?: boolean }> = ({ n, size, neg }) => (
  <svg viewBox="-0.05 -0.05 1.1 1.1" width={size} height={size} className="block shrink-0" aria-hidden>{coin(n, 0.5, 0.5, 1, neg)}</svg>
);
export const LaurelMark: React.FC<{ n: number | string; size: number }> = ({ n, size }) => (
  <svg viewBox="-0.05 -0.05 1.1 1.1" width={size} height={size} className="block shrink-0" aria-hidden>{wreath(n, 0.5, 0.5, 1)}</svg>
);
export const ShieldMark: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 1 1" width={size} height={size} className="block shrink-0" aria-hidden>{shield(0.5, 0.5, 1)}</svg>
);
export const SciMark: React.FC<{ s: Sci; size: number; faint?: boolean }> = ({ s, size, faint }) => (
  <svg viewBox="-0.05 -0.05 1.1 1.1" width={size} height={size} className={`block shrink-0 ${faint ? 'opacity-25' : ''}`} aria-hidden>{sciMark(s, 0.5, 0.5, 1)}</svg>
);
export const ChainMark: React.FC<{ c: Chain; size: number }> = ({ c, size }) => (
  <svg viewBox="0 0 1 1" width={size} height={size} className="block shrink-0" aria-hidden>{chainBadge(c, 0.5, 0.5, 1)}</svg>
);
export const TypeMark: React.FC<{ t: CType; size: number }> = ({ t, size }) => (
  <svg viewBox="-0.1 -0.1 0.92 1.2" width={size * 0.72} height={size} className="block shrink-0" aria-hidden>{cardGlyph(t, 0.36, 0.5, 1)}</svg>
);
export const WonderMark: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={`block shrink-0 ${className ?? ''}`} aria-hidden><path d={WONDER_PATH} fill={GOLD} stroke={PAPER} strokeWidth={1.1} strokeLinejoin="round" /></svg>
);
/** the rider: a chess knight (in Georgian chess the knight is მხედარი), facing left */
export const KNIGHT_PATH = 'M6.2 21.6h12.6v-1.4c0-.7-.5-1.2-1.2-1.2H7.4c-.7 0-1.2.5-1.2 1.2ZM8.3 18.2h8.4c.2-2.2.9-4.3 1.6-6.3c.8-2.3.6-4.6-.5-6.4c-1-1.5-2.6-2.5-4.3-2.8l-.4-1.5l-1.4 1.3l-1.2-1.1l-.2 1.8C8 4.1 6.3 6.4 5.2 9.2L3.8 12c-.3.7 0 1.4.6 1.7l.8.4c.5.2 1 .1 1.4-.2l1.7-1.4c.9-.7 2.1-.9 3.1-.5C9.7 13.9 8.6 15.9 8.3 18.2Z';

/** a token of knowledge: a green disc with its mark */
export const TokenDisc: React.FC<{ t: number; size: number; faint?: boolean }> = ({ t, size, faint }) => {
  const I = TOKEN_ICON[t] ?? Sparkles;
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-[#2f6b45] ring-2 ring-[#f1d793] text-[#fffaf0] ${faint ? 'opacity-30' : ''}`} style={{ width: size, height: size }} aria-hidden>
      <I style={{ width: size * 0.56, height: size * 0.56 }} strokeWidth={2.1} />
    </span>
  );
};

/** a cost as chips: the coins, then each resource (rows of `perRow`), a master's mark first when the card has one */
export const CostChips: React.FC<{ cost: string; from?: Chain; size: number; perRow?: number }> = ({ cost, from, size, perRow }) => {
  const { coins, res } = costParts(cost);
  const chips: React.ReactNode[] = [];
  if (from) chips.push(<ChainMark key="from" c={from} size={size * 1.08} />);
  if (coins) chips.push(<CoinMark key="c" n={coins} size={size * 1.08} />);
  (Object.keys(res) as Res[]).forEach(r => { for (let i = 0; i < res[r]; i++) chips.push(<ResMark key={`${r}${i}`} r={r} size={size} />); });
  if (!chips.length) return null;
  return <span className="flex flex-wrap items-center justify-center gap-px" style={perRow ? { maxWidth: perRow * (size + 1) + size * 0.1 } : undefined}>{chips}</span>;
};

/** a price for the player on turn: free, coins, or not enough */
export const PricePill: React.FC<{ p: Price; size?: 'sm' | 'md' }> = ({ p, size = 'sm' }) => {
  const big = size === 'md';
  if (p.chain || !p.total) {
    return <span className={`inline-flex items-center rounded-full bg-[#2f7d4f] text-white font-bold leading-none ${big ? 'h-7 px-3 text-[13px]' : 'h-[17px] px-1.5 text-[11px]'}`}>უფასო</span>;
  }
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-bold tabular-nums leading-none ${big ? 'h-7 pl-1 pr-2.5 text-[13px]' : 'h-[17px] pl-px pr-1.5 text-[11.5px]'} ${p.ok ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-[#f3d7d3] text-[#8e2430] ring-1 ring-[#e0a9a2]'}`}>
      <CoinMark n="" size={big ? 22 : 15} />{p.total}
    </span>
  );
};

// ---------- a card ----------
export const cardH = (w: number) => Math.round(w * 1.36);

/** an age card's face: the effect on its colour band (a master's mark at its end), the cost under it, the price on turn */
export const CardFace: React.FC<{
  id: number; w: number; price?: Price | null; free?: boolean; selected?: boolean; onClick?: () => void; title?: string;
}> = ({ id, w, price, free, selected, onClick, title }) => {
  const d = CARDS[id], T = TYPE_INFO[d.t];
  const h = cardH(w), band = Math.round(h * 0.33), chip = Math.max(11, Math.round(w * 0.22));
  const art = Math.round(w * 0.5), artTop = Math.round(band + (h - band - art) / 2 + h * 0.05);
  const P = d.t === 'green' ? null : PIC[d.pic];
  const inner = (
    <>
      <span className="pointer-events-none absolute inset-x-0 flex justify-center opacity-[0.22]" style={{ top: artTop }} aria-hidden>
        {P ? <svg viewBox="0 0 24 24" width={art} height={art}>{ic(P, 0, 0, 24, T.color, 1.7)}</svg>
          : d.eff.sci ? <svg viewBox="-0.05 -0.05 1.1 1.1" width={art} height={art}>{sciMark(d.eff.sci, 0.5, 0.5, 1)}</svg> : null}
      </span>
      <span className="absolute inset-x-0 top-0 flex items-center justify-center rounded-t-[7px]" style={{ height: band, background: T.color, paddingRight: d.to ? band * 0.62 : 0 }}>
        <Effect eff={d.eff} h={band * 0.7} maxW={w - 8 - (d.to ? band * 0.6 : 0)} />
        {d.to && <span className="absolute right-[3px] top-1/2 -translate-y-1/2"><ChainMark c={d.to} size={band * 0.62} /></span>}
      </span>
      <span className="absolute inset-x-[3px] flex justify-center" style={{ top: band + 2 }}>
        <CostChips cost={d.cost} from={d.from} size={chip} perRow={Math.max(2, Math.floor((w - 6) / (chip + 1)))} />
      </span>
      {price && free && <span className="absolute inset-x-0 bottom-[4px] flex justify-center"><PricePill p={price} /></span>}
    </>
  );
  const cls = `relative block shrink-0 rounded-[8px] bg-[#fffaf0] text-left ${selected ? 'ring-[3px] ring-[#c9a24b]' : free ? 'ring-2 ring-[#c9a24b]/80' : 'ring-1 ring-black/15'} ${free ? 'shadow-[0_8px_16px_-8px_rgba(43,30,20,0.7)]' : 'shadow-[0_2px_5px_-3px_rgba(43,30,20,0.5)]'}`;
  const style: React.CSSProperties = { width: w, height: h };
  return onClick
    ? <button type="button" onClick={onClick} title={title ?? d.n} aria-label={title ?? d.n} className={`${cls} cursor-pointer`} style={style}>{inner}</button>
    : <span className={cls} style={style} title={title ?? d.n}>{inner}</span>;
};

/** a card face down: its age's colour, rosettes, the age's numeral */
export const CardBack: React.FC<{ age: 1 | 2 | 3; w: number }> = ({ age, w }) => {
  const A = AGE_INFO[age], h = cardH(w);
  return (
    <span className="relative block shrink-0 rounded-[8px] ring-1 ring-black/25 shadow-[0_2px_5px_-3px_rgba(43,30,20,0.5)] overflow-hidden" style={{
      width: w, height: h, backgroundColor: A.bg,
      backgroundImage: `radial-gradient(circle at 50% 50%, ${A.fg}33 0 18%, transparent 19%), radial-gradient(circle at 0 0, ${A.fg}22 0 14%, transparent 15%), radial-gradient(circle at 100% 100%, ${A.fg}22 0 14%, transparent 15%)`,
      backgroundSize: `${w / 2}px ${w / 2}px`,
    }} aria-label="პირქვე ბარათი">
      <span className="absolute inset-[3px] rounded-[6px] border" style={{ borderColor: `${A.fg}66` }} />
      {/* in the upper half: on the table the next row covers the lower one */}
      <span className="absolute inset-x-0 flex justify-center" style={{ top: Math.round(h / 4 - w * 0.21) }}>
        <span className="flex items-center justify-center rounded-full font-serif-ge font-black leading-none" style={{ width: Math.round(w * 0.42), height: Math.round(w * 0.42), background: NIGHT, color: A.fg, boxShadow: `0 0 0 1.5px ${A.fg}aa`, fontSize: Math.max(11, Math.round(w * 0.2)) }}>{['', 'I', 'II', 'III'][age]}</span>
      </span>
    </span>
  );
};

/** a monument as a wide tile: name, cost, effect, the kit's words */
export const WonderTile: React.FC<{
  w: number; built?: boolean; out?: boolean; selected?: boolean; price?: Price | null; onClick?: () => void; compact?: boolean;
}> = ({ w, built, out, selected, price, onClick, compact }) => {
  const W = WONDERS[w];
  const body = (
    <>
      <span className={`flex items-center gap-2 px-2.5 py-1.5 ${built ? 'bg-gradient-to-r from-[#a37a2c] to-[#c9a24b] text-[#2b1e14]' : 'bg-[#2b1e14] text-[#f1d793]'}`}>
        <WonderMark size={18} />
        <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-tight">{W.n}</span>
        {built && <span className="text-[11px] font-black uppercase">აშენდა</span>}
        {out && <span className="text-[11px] font-bold text-[#f1d793]/70">გავიდა</span>}
      </span>
      <span className="flex items-center gap-2 px-2.5 pt-1.5">
        <Effect eff={W.eff} h={22} maxW={150} ink="#4a3426" />
        <span className="ml-auto"><CostChips cost={W.cost} size={14} /></span>
      </span>
      {!compact && <span className="block px-2.5 pt-1 pb-2 text-[12px] leading-snug text-[#5b4a3c]">{W.text}</span>}
      {compact && <span className="block h-1.5" />}
      {price && !built && !out && <span className="flex justify-end px-2.5 pb-2 -mt-1"><PricePill p={price} /></span>}
    </>
  );
  const cls = `block w-full overflow-hidden rounded-2xl bg-[#fffaf0] text-left ring-1 ${selected ? 'ring-[3px] ring-[#c9a24b]' : 'ring-[#e3d5bd]'} ${out ? 'opacity-55' : ''}`;
  return onClick ? <button type="button" onClick={onClick} className={`${cls} cursor-pointer hover:ring-[#c9a24b]`}>{body}</button> : <div className={cls}>{body}</div>;
};

/** a token as a tile: disc, name, what it does */
export const TokenTile: React.FC<{ t: number; selected?: boolean; onClick?: () => void }> = ({ t, selected, onClick }) => {
  const T = TOKENS[t];
  const body = (
    <>
      <TokenDisc t={t} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold leading-tight text-[#2b1e14]">{T.n}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#5b4a3c]">{T.text}</span>
      </span>
    </>
  );
  const cls = `flex w-full items-center gap-2.5 rounded-2xl bg-[#fffaf0] px-3 py-2.5 text-left ring-1 ${selected ? 'ring-[3px] ring-[#c9a24b]' : 'ring-[#e3d5bd]'}`;
  return onClick ? <button type="button" onClick={onClick} className={`${cls} cursor-pointer hover:ring-[#c9a24b]`}>{body}</button> : <div className={cls}>{body}</div>;
};
