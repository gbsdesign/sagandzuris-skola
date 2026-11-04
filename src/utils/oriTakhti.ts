import { mulberry32, shuffle } from './otkheuli';
import { CARDS, TOKENS, WONDERS, type CType, type Chain, type GuildKind, type Res, type Sci } from '../data/takhtiCards';

// „ორი ტახტი“ on phones (2026-11-04): the printed kit's 7 Wonders Duel (scripts/print-games/games/ori-takhti.mjs, its pieces in
// data/takhtiCards.ts) as rules. Two thrones — the west (ქუთაისი, seat 0) and the east (თბილისი, seat 1) — draft four monuments
// each, then take the free cards of three ages' layouts in turn: build one (its price: coins, resources made at home, the rest
// bought from the bank at 2 + what the other kingdom's brown and grey cards make), throw it away for coins, or tuck it under a
// monument. Shields move the rider on „ლიხის გზა“ (−9 … +9, + toward Tbilisi); the rider in a capital wins at once, six kinds
// of wisdom win at once, else the glory points after age III. One engine for both variants: online (utils/takhtiRoom.ts) the
// host's phone holds the game and every phone sees `publicOf` (face-down cards, the later ages and the box hidden); on one
// phone the same. Every change of step moves `step` on (the room's key). Pure, tested in tests/oriTakhti.test.ts.

export const RES_IDS: readonly Res[] = ['W', 'S', 'K', 'G', 'P'];
export const START_COINS = 7;
/** both kingdoms together build seven monuments at most: the eighth leaves the game */
export const MAX_WONDERS = 7;
export const ARMY_WIN = 9;
export const SCI_WIN = 6;
/** the tokens of knowledge by their place in TOKENS */
export const TK = { AGRI: 0, ARCH: 1, ECON: 2, LAW: 3, MASON: 4, MATH: 5, PHIL: 6, STRAT: 7, THEO: 8, URBAN: 9 } as const;
export const SIDES = ['დასავლეთი', 'აღმოსავლეთი'] as const;
export const CAPITALS = ['ქუთაისი', 'თბილისი'] as const;
export const ROMAN = ['', 'I', 'II', 'III'] as const;

// ---------- the three layouts (rows from the top; x in half a card's width; up = face up from the start) ----------
const ROWS: Record<1 | 2 | 3, [number, boolean][]> = {
  1: [[2, true], [3, false], [4, true], [5, false], [6, true]],
  2: [[6, true], [5, false], [4, true], [3, false], [2, true]],
  // age III's fourth row has only the two outer places of a row of three
  3: [[2, true], [3, false], [4, true], [-2, false], [4, true], [3, false], [2, true]],
};
export interface Place { row: number; x: number; up: boolean }
const placesOf = (age: 1 | 2 | 3): Place[] => ROWS[age].flatMap(([n, up], row) =>
  (n === -2 ? [-2, 2] : Array.from({ length: n }, (_, i) => 2 * i - (n - 1))).map(x => ({ row, x, up })));
export const PLACES: Record<1 | 2 | 3, Place[]> = { 1: placesOf(1), 2: placesOf(2), 3: placesOf(3) };
export const ROW_COUNT: Record<1 | 2 | 3, number> = { 1: 5, 2: 5, 3: 7 };
/** the places of the next row that lie over a place (half over it) */
export const COVERS: Record<1 | 2 | 3, number[][]> = {
  1: PLACES[1].map(p => PLACES[1].flatMap((q, j) => (q.row === p.row + 1 && Math.abs(q.x - p.x) === 1 ? [j] : []))),
  2: PLACES[2].map(p => PLACES[2].flatMap((q, j) => (q.row === p.row + 1 && Math.abs(q.x - p.x) === 1 ? [j] : []))),
  3: PLACES[3].map(p => PLACES[3].flatMap((q, j) => (q.row === p.row + 1 && Math.abs(q.x - p.x) === 1 ? [j] : []))),
};
export const SLOTS = 20;

// ---------- the game ----------
export interface TWonder { w: number; /** the card tucked under it (-1: not built) */ under: number; /** the eighth, out of the game */ out?: boolean }
export interface TCity { coins: number; cards: number[]; wonders: TWonder[]; tokens: number[] }
export type Pending = { k: 'token' } | { k: 'library' } | { k: 'ruin'; type: 'brown' | 'grey' } | { k: 'revive' };
export type Why = 'army' | 'science' | 'civil';
export type TPhase =
  | { k: 'draft'; offer: number[] }
  | { k: 'play' }
  /** a token of knowledge to pick: from the board (a pair of wisdom) or three from the box (ფაზისის აკადემია) */
  | { k: 'token'; from: number[]; lib: boolean }
  | { k: 'ruin'; type: 'brown' | 'grey' }
  | { k: 'revive' }
  /** `turn` says who begins the age that is laid out */
  | { k: 'start' }
  | { k: 'end'; why: Why; winners: number[] };
export type LineKind = 'build' | 'discard' | 'wonder' | 'token' | 'ruin' | 'revive' | 'draft' | 'begin';
export interface TLine {
  n: number; who: number; k: LineKind;
  /** card, monument, token, age (what the line is about) */
  c?: number; w?: number; t?: number; age?: number;
  /** coins gained (a discard, a card's coins) or paid */
  coins?: number; paid?: number;
  /** built free by the master's mark */
  chain?: boolean;
  /** the rider's move (+ toward Tbilisi) and the tribute the other side paid */
  army?: number; tribute?: number;
}
export interface TakhtiGame {
  v: 1;
  /** west, east */
  names: string[];
  cities: TCity[];
  age: 1 | 2 | 3;
  /** the age's cards by place (-1: face down, in a view) */
  slots: number[];
  /** the places taken, as bits */
  gone: number;
  /** the later ages' cards (hidden in a view) */
  next: number[][];
  /** the monuments of the draft's second round (hidden in a view until offered) */
  draft: number[];
  /** who began the draft (and begins age I) */
  first: number;
  pawn: number;
  /** the tribute tokens taken, as bits: 1 west's −2, 2 west's −5, 4 east's −2, 8 east's −5 */
  loot: number;
  board: number[];
  /** the five tokens out of the game (hidden in a view) */
  box: number[];
  discard: number[];
  turn: number;
  /** the player on turn plays again once the pending choices are made */
  again: boolean;
  pending: Pending[];
  phase: TPhase;
  step: number;
  rng: number;
  log: TLine[];
}

export const keyOf = (g: TakhtiGame) => `t${g.step}`;
const seedOf = (r: () => number) => Math.floor(r() * 0x7fffffff);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const LOG_MAX = 40;
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);

export const newTakhti = ({ names, first, rnd }: { names: string[]; first?: number; rnd: () => number }): TakhtiGame | null => {
  if (names.length !== 2) return null;
  const r = mulberry32(seedOf(rnd));
  const wonders = shuffle(range(0, 12), r).slice(0, 8);
  const tokens = shuffle(range(0, 10), r);
  const age1 = shuffle(range(0, 23), r).slice(0, 20);
  const age2 = shuffle(range(23, 46), r).slice(0, 20);
  const age3 = shuffle([...shuffle(range(46, 66), r).slice(0, 17), ...shuffle(range(66, 73), r).slice(0, 3)], r);
  const start = first === 0 || first === 1 ? first : Math.floor(rnd() * 2);
  return {
    v: 1, names: [...names], cities: [0, 1].map(() => ({ coins: START_COINS, cards: [], wonders: [], tokens: [] })),
    age: 1, slots: age1, gone: 0, next: [age2, age3], draft: wonders.slice(4), first: start, pawn: 0, loot: 0,
    board: tokens.slice(0, 5), box: tokens.slice(5), discard: [], turn: start, again: false, pending: [],
    phase: { k: 'draft', offer: wonders.slice(0, 4) }, step: 0, rng: seedOf(r), log: [],
  };
};

// ---------- the layout ----------
export const isGone = (g: Pick<TakhtiGame, 'gone'>, s: number) => !!(g.gone & (1 << s));
export const isCovered = (g: Pick<TakhtiGame, 'gone' | 'age'>, s: number) => COVERS[g.age][s].some(t => !isGone(g, t));
/** face up: from the start, or once nothing lies over it */
export const isUp = (g: Pick<TakhtiGame, 'gone' | 'age'>, s: number) => PLACES[g.age][s].up || !isCovered(g, s);
/** the places that may be taken now */
export const freeSlots = (g: Pick<TakhtiGame, 'gone' | 'age'>) => range(0, SLOTS).filter(s => !isGone(g, s) && !isCovered(g, s));
export const leftInAge = (g: Pick<TakhtiGame, 'gone'>) => range(0, SLOTS).filter(s => !isGone(g, s)).length;

// ---------- a kingdom ----------
const cardsOf = (c: TCity, t: CType) => c.cards.filter(id => CARDS[id].t === t);
export const countOf = (c: TCity, t: CType) => cardsOf(c, t).length;
export const builtWonders = (c: TCity) => c.wonders.filter(w => w.under >= 0);
export const wondersBuilt = (g: Pick<TakhtiGame, 'cities'>) => g.cities.reduce((a, c) => a + builtWonders(c).length, 0);
/** what the brown and grey cards make every turn (the bank's price for the other side follows it) */
export const prodOf = (c: TCity): Record<Res, number> => {
  const p: Record<Res, number> = { W: 0, S: 0, K: 0, G: 0, P: 0 };
  for (const id of c.cards) for (const ch of CARDS[id].eff.prod ?? '') p[ch as Res]++;
  return p;
};
/** the sources that make one of a few every turn (ბაზარი, ქარვასლა, გონიო, სამშვილდე) */
export const flexOf = (c: TCity): string[] => [
  ...c.cards.map(id => CARDS[id].eff.one ?? '').filter(Boolean),
  ...builtWonders(c).map(w => WONDERS[w.w].eff.one ?? '').filter(Boolean),
];
export const tradesOf = (c: TCity) => new Set(c.cards.flatMap(id => [...(CARDS[id].eff.trade ?? '')]));
export const symbolsOf = (c: TCity): Sci[] => {
  const s = new Set<Sci>();
  for (const id of c.cards) { const x = CARDS[id].eff.sci; if (x) s.add(x); }
  if (c.tokens.includes(TK.LAW)) s.add('samartali');
  return [...s];
};
export const shieldsOf = (c: TCity) => c.cards.reduce((a, id) => a + (CARDS[id].eff.shields ?? 0), 0);

/** one resource bought from the bank: 1 with a store, else 2 + what the other side's brown and grey cards make of it */
export const tradePrice = (g: Pick<TakhtiGame, 'cities'>, who: number, r: Res) =>
  (tradesOf(g.cities[who]).has(r) ? 1 : 2 + prodOf(g.cities[1 - who])[r]);

const parseCost = (cost: string) => {
  const res: Record<Res, number> = { W: 0, S: 0, K: 0, G: 0, P: 0 };
  for (const ch of cost.replace(/\d+/g, '')) res[ch as Res]++;
  return { coins: Number((cost.match(/\d+/) ?? ['0'])[0]), res };
};
export const costParts = parseCost;

export interface Price {
  /** the coins the cost asks */
  coins: number;
  /** what is bought from the bank */
  buy: { r: Res; n: number; each: number }[];
  trade: number;
  total: number;
  /** free by the master's mark */
  chain: boolean;
  ok: boolean;
}

/** the cheapest way to pay a cost: home production first, then the sources of one (every way tried), then `discount` units
 *  dropped (the dearest — არსუკისძის სკოლა, ქვისმთლელები), the rest bought */
export const priceFor = (g: Pick<TakhtiGame, 'cities'>, who: number, cost: string, discount = 0, from?: Chain): Price => {
  const me = g.cities[who];
  if (from && me.cards.some(id => CARDS[id].to === from)) return { coins: 0, buy: [], trade: 0, total: 0, chain: true, ok: true };
  const { coins, res } = parseCost(cost);
  const prod = prodOf(me);
  const each = RES_IDS.map(r => tradePrice(g, who, r));
  const left = RES_IDS.map((r) => Math.max(0, res[r] - prod[r]));
  const flex = flexOf(me);
  let best: number[] = left.slice(), bestCost = Infinity;
  const cut = (l: number[]) => {
    const units = l.flatMap((n, i) => Array<number>(n).fill(i)).sort((a, b) => each[b] - each[a]);
    const after = l.slice();
    for (const i of units.slice(0, discount)) after[i]--;
    return after;
  };
  const walk = (i: number, l: number[]) => {
    if (i === flex.length) {
      const after = cut(l);
      const c = after.reduce((a, n, k) => a + n * each[k], 0);
      if (c < bestCost) { bestCost = c; best = after; }
      return;
    }
    let used = false;
    for (const ch of flex[i]) {
      const k = RES_IDS.indexOf(ch as Res);
      if (l[k] > 0) { used = true; l[k]--; walk(i + 1, l); l[k]++; }
    }
    if (!used) walk(i + 1, l);
  };
  walk(0, left);
  const buy = best.flatMap((n, k) => (n > 0 ? [{ r: RES_IDS[k], n, each: each[k] }] : []));
  const trade = buy.reduce((a, b) => a + b.n * b.each, 0);
  const total = coins + trade;
  return { coins, buy, trade, total, chain: false, ok: total <= me.coins };
};
export const cardPrice = (g: Pick<TakhtiGame, 'cities'>, who: number, id: number) => {
  const d = CARDS[id];
  return priceFor(g, who, d.cost, d.t === 'blue' && g.cities[who].tokens.includes(TK.MASON) ? 2 : 0, d.from);
};
export const wonderPrice = (g: Pick<TakhtiGame, 'cities'>, who: number, w: number) =>
  priceFor(g, who, WONDERS[w].cost, g.cities[who].tokens.includes(TK.ARCH) ? 2 : 0);
/** a card thrown away: 2 coins + 1 for each yellow card */
export const sellValue = (c: TCity) => 2 + countOf(c, 'yellow');
/** may monument i of the player be built now (unbuilt, still in the game, fewer than seven built, paid) */
export const wonderOk = (g: TakhtiGame, who: number, i: number) => {
  const w = g.cities[who].wonders[i];
  return !!w && w.under < 0 && !w.out && wondersBuilt(g) < MAX_WONDERS && wonderPrice(g, who, w.w).ok;
};

// ---------- effects (on a copy) ----------
const gain = (x: TakhtiGame, who: number, n: number) => { x.cities[who].coins += n; };
const lose = (x: TakhtiGame, who: number, n: number) => { const c = x.cities[who]; const p = Math.min(c.coins, n); c.coins -= p; return p; };
const win = (x: TakhtiGame, why: Why, winners: number[]) => { x.phase = { k: 'end', why, winners }; x.pending = []; };
const over = (x: TakhtiGame) => x.phase.k === 'end';

/** shields move the rider toward the other capital; a tribute token passed makes that side pay; a capital reached wins */
const army = (x: TakhtiGame, who: number, shields: number, line: TLine) => {
  if (!shields) return;
  const from = x.pawn;
  x.pawn = Math.max(-ARMY_WIN, Math.min(ARMY_WIN, x.pawn + (who === 0 ? shields : -shields)));
  line.army = x.pawn - from;
  const toll = (bit: number, side: number, n: number, hit: boolean) => {
    if (!hit || x.loot & bit) return;
    x.loot |= bit;
    line.tribute = (line.tribute ?? 0) + lose(x, side, n);
  };
  toll(4, 1, 2, x.pawn >= 3); toll(8, 1, 5, x.pawn >= 6);
  toll(1, 0, 2, x.pawn <= -3); toll(2, 0, 5, x.pawn <= -6);
  if (Math.abs(x.pawn) >= ARMY_WIN) win(x, 'army', [who]);
};

const guildCount = (x: Pick<TakhtiGame, 'cities'>, k: GuildKind) => Math.max(...x.cities.map(c =>
  k === 'brownGrey' ? countOf(c, 'brown') + countOf(c, 'grey') : k === 'wonder' ? builtWonders(c).length
    : k === 'coins' ? Math.floor(c.coins / 3) : countOf(c, k)));

/** a card goes into the kingdom: its coins, shields, wisdom */
const addCard = (x: TakhtiGame, who: number, id: number, line: TLine) => {
  const c = x.cities[who], e = CARDS[id].eff;
  c.cards.push(id);
  let coins = 0;
  if (e.per) coins = (e.coins ?? 0) * (e.per === 'wonder' ? builtWonders(c).length : countOf(c, e.per));
  else if (e.coins) coins = e.coins;
  if (e.guild && e.guild !== 'wonder' && e.guild !== 'coins') coins = guildCount(x, e.guild);
  if (line.chain && c.tokens.includes(TK.URBAN)) coins += 4;
  if (coins) { gain(x, who, coins); line.coins = (line.coins ?? 0) + coins; }
  if (e.shields) army(x, who, e.shields + (c.tokens.includes(TK.STRAT) ? 1 : 0), line);
  if (over(x) || !e.sci) return;
  if (c.cards.filter(k => CARDS[k].eff.sci === e.sci).length === 2) x.pending.push({ k: 'token' });
  if (symbolsOf(c).length >= SCI_WIN) win(x, 'science', [who]);
};

const push = (x: TakhtiGame, line: TLine) => { x.log = [...x.log, line].slice(-LOG_MAX); };

/** after a move or a choice: the next choice, else the next turn (again: the same player), else the age's end */
const resolve = (x: TakhtiGame): TakhtiGame => {
  if (over(x)) return x;
  while (x.pending.length) {
    const p = x.pending.shift()!;
    const opp = x.cities[1 - x.turn];
    if (p.k === 'token' && x.board.length) { x.phase = { k: 'token', from: [...x.board], lib: false }; return x; }
    if (p.k === 'library' && x.box.length) {
      const r = mulberry32(x.rng);
      const from = shuffle([...x.box], r).slice(0, 3);
      x.rng = seedOf(r);
      x.phase = { k: 'token', from, lib: true };
      return x;
    }
    if (p.k === 'ruin' && cardsOf(opp, p.type).length) { x.phase = { k: 'ruin', type: p.type }; return x; }
    if (p.k === 'revive' && x.discard.length) { x.phase = { k: 'revive' }; return x; }
  }
  if (!leftInAge(x)) return endAge(x);
  if (!x.again) x.turn = 1 - x.turn;
  x.again = false;
  x.phase = { k: 'play' };
  return x;
};

/** the age's last card taken: age III ends the game, else the weaker side (the rider on its half; even — the one who took
 *  the last card) says who begins the next */
const endAge = (x: TakhtiGame): TakhtiGame => {
  x.again = false;
  if (x.age === 3) return civil(x);
  const chooser = x.pawn > 0 ? 1 : x.pawn < 0 ? 0 : x.turn;
  x.age = (x.age + 1) as 2 | 3;
  x.slots = x.next.shift() ?? [];
  x.gone = 0;
  x.turn = chooser;
  x.phase = { k: 'start' };
  return x;
};

// ---------- the glory points ----------
export interface TScore { blue: number; green: number; yellow: number; guild: number; wonder: number; token: number; coins: number; army: number; total: number }
export const armyPoints = (pawn: number, who: number) => {
  const d = who === 0 ? pawn : -pawn;
  return d >= 6 ? 10 : d >= 3 ? 5 : d >= 1 ? 2 : 0;
};
export const scoreOf = (g: Pick<TakhtiGame, 'cities' | 'pawn'>, who: number): TScore => {
  const c = g.cities[who];
  const vp = (t: CType) => cardsOf(c, t).reduce((a, id) => a + (CARDS[id].eff.vp ?? 0), 0);
  const guild = cardsOf(c, 'guild').reduce((a, id) => {
    const k = CARDS[id].eff.guild!;
    return a + (k === 'wonder' ? 2 : 1) * guildCount(g, k);
  }, 0);
  const wonder = builtWonders(c).reduce((a, w) => a + (WONDERS[w.w].eff.vp ?? 0), 0);
  const token = (c.tokens.includes(TK.AGRI) ? 4 : 0) + (c.tokens.includes(TK.PHIL) ? 7 : 0) + (c.tokens.includes(TK.MATH) ? 3 * c.tokens.length : 0);
  const s = { blue: vp('blue'), green: vp('green'), yellow: vp('yellow'), guild, wonder, token, coins: Math.floor(c.coins / 3), army: armyPoints(g.pawn, who) };
  return { ...s, total: Object.values(s).reduce((a, b) => a + b, 0) };
};
const civil = (x: TakhtiGame): TakhtiGame => {
  const sc = [0, 1].map(i => scoreOf(x, i));
  const top = Math.max(...sc.map(s => s.total));
  let winners = [0, 1].filter(i => sc[i].total === top);
  const blue = Math.max(...winners.map(i => sc[i].blue));
  winners = winners.filter(i => sc[i].blue === blue);
  win(x, 'civil', winners);
  return x;
};
export const winnersOf = (g: TakhtiGame) => (g.phase.k === 'end' ? g.phase.winners : []);

// ---------- the moves ----------
/** the draft: 4 on the table, A takes 1, B 2, A the last; then 4 more with B first */
const DRAFT = [0, 1, 1, 0, 1, 0, 0, 1];
const drafter = (g: TakhtiGame, held: number) => (DRAFT[held] === 0 ? g.first : 1 - g.first);
export const pickWonder = (g: TakhtiGame, w: number): TakhtiGame => {
  if (g.phase.k !== 'draft' || !g.phase.offer.includes(w)) return g;
  const x = clone(g);
  const give = (who: number, id: number) => {
    x.cities[who].wonders.push({ w: id, under: -1 });
    push(x, { n: x.step, who, k: 'draft', w: id });
  };
  const offer = (x.phase as { offer: number[] }).offer.filter(o => o !== w);
  give(x.turn, w);
  let held = x.cities[0].wonders.length + x.cities[1].wonders.length;
  if (offer.length === 1) { give(drafter(x, held), offer[0]); offer.length = 0; held++; }
  x.step++;
  if (held >= 8) { x.turn = x.first; x.phase = { k: 'play' }; return x; }
  const next = offer.length ? offer : x.draft.splice(0, 4);
  x.turn = drafter(x, held);
  x.phase = { k: 'draft', offer: next };
  return x;
};

export type Act = 'build' | 'discard' | 'wonder';
/** a free card taken: built (paid), thrown away for coins, or tucked under monument `wi` (paid) */
export const play = (g: TakhtiGame, slot: number, act: Act, wi = -1): TakhtiGame => {
  if (g.phase.k !== 'play' || !freeSlots(g).includes(slot)) return g;
  const who = g.turn, id = g.slots[slot], me = g.cities[who];
  if (id < 0) return g;
  const line: TLine = { n: g.step, who, k: act === 'wonder' ? 'wonder' : act, c: id };
  const x = clone(g);
  x.gone |= 1 << slot;
  x.step++;
  if (act === 'build') {
    const p = cardPrice(g, who, id);
    if (!p.ok) return g;
    if (p.chain) line.chain = true;
    pay(x, who, p);
    if (p.total) line.paid = p.total;
    addCard(x, who, id, line);
  } else if (act === 'discard') {
    const n = sellValue(me);
    gain(x, who, n);
    line.coins = n;
    x.discard.push(id);
  } else {
    if (!wonderOk(g, who, wi)) return g;
    const W = x.cities[who].wonders[wi], e = WONDERS[W.w].eff;
    const p = wonderPrice(g, who, W.w);
    pay(x, who, p);
    if (p.total) line.paid = p.total;
    W.under = id;
    line.w = W.w;
    if (e.coins) { gain(x, who, e.coins); line.coins = e.coins; }
    if (e.steal) line.tribute = lose(x, 1 - who, e.steal);
    if (e.shields) army(x, who, e.shields, line);
    if (!over(x)) {
      if (e.again || x.cities[who].tokens.includes(TK.THEO)) x.again = true;
      if (e.token) x.pending.push({ k: 'library' });
      if (e.discard) x.pending.push({ k: 'revive' });
      if (e.ruin) x.pending.push({ k: 'ruin', type: e.ruin });
      if (wondersBuilt(x) >= MAX_WONDERS) for (const c of x.cities) for (const w of c.wonders) if (w.under < 0) w.out = true;
    }
  }
  push(x, line);
  return resolve(x);
};

/** the price paid: the cost's coins and the purchase to the bank — or the purchase to the other side with აბრეშუმის გზა */
const pay = (x: TakhtiGame, who: number, p: Price) => {
  lose(x, who, p.total);
  if (p.trade && x.cities[1 - who].tokens.includes(TK.ECON)) gain(x, 1 - who, p.trade);
};

export const takeToken = (g: TakhtiGame, t: number): TakhtiGame => {
  if (g.phase.k !== 'token' || !g.phase.from.includes(t)) return g;
  const x = clone(g), who = x.turn;
  const lib = g.phase.lib;
  if (lib) x.box = x.box.filter(b => b !== t);
  else x.board = x.board.filter(b => b !== t);
  x.cities[who].tokens.push(t);
  x.step++;
  const line: TLine = { n: g.step, who, k: 'token', t };
  if (t === TK.AGRI || t === TK.URBAN) { gain(x, who, 6); line.coins = 6; }
  push(x, line);
  if (t === TK.LAW && symbolsOf(x.cities[who]).length >= SCI_WIN) { win(x, 'science', [who]); return x; }
  return resolve(x);
};

/** უშგულის კოშკები / შატილი: one of the other side's brown or grey cards goes to the discard */
export const ruinCard = (g: TakhtiGame, id: number): TakhtiGame => {
  if (g.phase.k !== 'ruin') return g;
  const opp = g.cities[1 - g.turn];
  if (!opp.cards.includes(id) || CARDS[id].t !== g.phase.type) return g;
  const x = clone(g);
  const o = x.cities[1 - x.turn];
  o.cards = o.cards.filter(c => c !== id);
  x.discard.push(id);
  x.step++;
  push(x, { n: g.step, who: x.turn, k: 'ruin', c: id });
  return resolve(x);
};

/** ბირთვისი: a card of the discard built for free */
export const revive = (g: TakhtiGame, id: number): TakhtiGame => {
  if (g.phase.k !== 'revive' || !g.discard.includes(id)) return g;
  const x = clone(g), who = x.turn;
  x.discard = x.discard.filter(c => c !== id);
  x.step++;
  const line: TLine = { n: g.step, who, k: 'revive', c: id };
  addCard(x, who, id, line);
  push(x, line);
  return resolve(x);
};

/** the weaker side says who begins the age just laid out */
export const begin = (g: TakhtiGame, who: number): TakhtiGame => {
  if (g.phase.k !== 'start' || (who !== 0 && who !== 1)) return g;
  const x = clone(g);
  push(x, { n: g.step, who: x.turn, k: 'begin', t: who, age: x.age });
  x.turn = who;
  x.step++;
  x.phase = { k: 'play' };
  return x;
};

// ---------- one number a move (an answer's `pick` in the room) ----------
export const ACT_CODE: Record<Act, number> = { build: 0, discard: 1, wonder: 2 };
export const playPick = (slot: number, act: Act, wi = -1) => slot * 8 + (act === 'wonder' ? 2 + wi : ACT_CODE[act]);
/** a pick of the phase on turn applied (unknown or wrong ones change nothing) */
export const applyPick = (g: TakhtiGame, pick: number): TakhtiGame => {
  if (!Number.isInteger(pick) || pick < 0) return g;
  switch (g.phase.k) {
    case 'draft': return pickWonder(g, pick);
    case 'play': {
      const slot = Math.floor(pick / 8), a = pick % 8;
      return a === 0 ? play(g, slot, 'build') : a === 1 ? play(g, slot, 'discard') : a <= 5 ? play(g, slot, 'wonder', a - 2) : g;
    }
    case 'token': return takeToken(g, pick);
    case 'ruin': return ruinCard(g, pick);
    case 'revive': return revive(g, pick);
    case 'start': return begin(g, pick);
    default: return g;
  }
};

/** how long a step waits online (s) */
export const TAKHTI_SECS: Record<TPhase['k'], number> = { draft: 60, play: 120, token: 60, ruin: 45, revive: 60, start: 45, end: 0 };
/** the step's time is over: the phone moves for the player on turn — the first monument, a free card thrown away, the first
 *  token / card, the chooser begins */
export const timeUp = (g: TakhtiGame): TakhtiGame => {
  const ph = g.phase;
  switch (ph.k) {
    case 'draft': return pickWonder(g, ph.offer[0]);
    case 'play': { const s = freeSlots(g)[0]; return s === undefined ? g : play(g, s, 'discard'); }
    case 'token': return takeToken(g, ph.from[0]);
    case 'ruin': return ruinCard(g, g.cities[1 - g.turn].cards.find(id => CARDS[id].t === ph.type) ?? -1);
    case 'revive': return revive(g, g.discard[0] ?? -1);
    case 'start': return begin(g, g.turn);
    default: return g;
  }
};

/** what every phone may see: the face-down cards, the later ages, the draft's second round and the box hidden */
export const publicOf = (g: TakhtiGame): TakhtiGame => ({
  ...g, slots: g.slots.map((c, s) => (isGone(g, s) || isUp(g, s) ? c : -1)), next: [], draft: [], box: [], rng: 0,
});

// ---------- reading a kept or sent game ----------
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ints = (v: unknown, lo: number, hi: number, max: number): number[] | null =>
  (Array.isArray(v) && v.length <= max && v.every(x => isInt(x, lo, hi)) ? (v as number[]) : null);
const parseCity = (raw: unknown): TCity | null => {
  const c = raw as Partial<TCity> | null;
  if (!c || !isInt(c.coins, 0, 9999)) return null;
  const cards = ints(c.cards, 0, CARDS.length - 1, 73);
  const tokens = ints(c.tokens, 0, TOKENS.length - 1, 10);
  if (!cards || !tokens || !Array.isArray(c.wonders) || c.wonders.length > 4) return null;
  const wonders: TWonder[] = [];
  for (const w of c.wonders as Partial<TWonder>[]) {
    if (!w || !isInt(w.w, 0, WONDERS.length - 1) || !isInt(w.under, -1, CARDS.length - 1)) return null;
    wonders.push(w.out ? { w: w.w, under: w.under, out: true } : { w: w.w, under: w.under });
  }
  return { coins: c.coins, cards: [...cards], wonders, tokens: [...tokens] };
};
const parsePhase = (raw: unknown): TPhase | null => {
  const p = raw as { k?: unknown; offer?: unknown; from?: unknown; lib?: unknown; type?: unknown; why?: unknown; winners?: unknown } | null;
  if (!p) return null;
  switch (p.k) {
    case 'draft': { const offer = ints(p.offer, 0, 11, 4); return offer && offer.length ? { k: 'draft', offer: [...offer] } : null; }
    case 'play': return { k: 'play' };
    case 'token': { const from = ints(p.from, 0, 9, 5); return from && from.length ? { k: 'token', from: [...from], lib: p.lib === true } : null; }
    case 'ruin': return p.type === 'brown' || p.type === 'grey' ? { k: 'ruin', type: p.type } : null;
    case 'revive': return { k: 'revive' };
    case 'start': return { k: 'start' };
    case 'end': {
      const winners = ints(p.winners, 0, 1, 2);
      return winners && (p.why === 'army' || p.why === 'science' || p.why === 'civil') ? { k: 'end', why: p.why, winners: [...winners] } : null;
    }
    default: return null;
  }
};
const LINE_KINDS: readonly LineKind[] = ['build', 'discard', 'wonder', 'token', 'ruin', 'revive', 'draft', 'begin'];
const parseLog = (raw: unknown): TLine[] => (Array.isArray(raw) ? raw : []).filter((l): l is TLine => {
  const x = l as Partial<TLine> | null;
  return !!x && isInt(x.n, 0, 100000) && isInt(x.who, 0, 1) && LINE_KINDS.includes(x.k as LineKind)
    && (x.c === undefined || isInt(x.c, 0, CARDS.length - 1)) && (x.w === undefined || isInt(x.w, 0, WONDERS.length - 1))
    && (x.t === undefined || isInt(x.t, 0, 9));
}).slice(-LOG_MAX);
const parsePending = (raw: unknown): Pending[] => (Array.isArray(raw) ? raw : []).flatMap((p): Pending[] => {
  const k = (p as { k?: unknown })?.k, type = (p as { type?: unknown })?.type;
  if (k === 'token' || k === 'library' || k === 'revive') return [{ k }];
  if (k === 'ruin' && (type === 'brown' || type === 'grey')) return [{ k, type }];
  return [];
}).slice(0, 4);

export const parseTakhti = (raw: unknown): TakhtiGame | null => {
  const g = raw as Partial<TakhtiGame> | null;
  if (!g || g.v !== 1 || !Array.isArray(g.names) || g.names.length !== 2 || !g.names.every(n => typeof n === 'string' && n.length <= 60)) return null;
  if (!Array.isArray(g.cities) || g.cities.length !== 2) return null;
  const cities = g.cities.map(parseCity);
  if (cities.some(c => !c)) return null;
  if (g.age !== 1 && g.age !== 2 && g.age !== 3) return null;
  const slots = ints(g.slots, -1, CARDS.length - 1, SLOTS);
  const next = Array.isArray(g.next) && g.next.length <= 2 ? g.next.map(a => ints(a, 0, CARDS.length - 1, SLOTS)) : null;
  const draft = ints(g.draft, 0, 11, 4), board = ints(g.board, 0, 9, 5), box = ints(g.box, 0, 9, 5), discard = ints(g.discard, 0, CARDS.length - 1, 73);
  const phase = parsePhase(g.phase);
  if (!slots || slots.length !== SLOTS || !next || next.some(a => !a) || !draft || !board || !box || !discard || !phase) return null;
  if (!isInt(g.gone, 0, (1 << SLOTS) - 1) || !isInt(g.first, 0, 1) || !isInt(g.pawn, -ARMY_WIN, ARMY_WIN) || !isInt(g.loot, 0, 15)
    || !isInt(g.turn, 0, 1) || !isInt(g.step, 0, 100000) || !isInt(g.rng, 0, 0x7fffffff)) return null;
  return {
    v: 1, names: [...g.names], cities: cities as TCity[], age: g.age, slots: [...slots], gone: g.gone, next: (next as number[][]).map(a => [...a]),
    draft: [...draft], first: g.first, pawn: g.pawn, loot: g.loot, board: [...board], box: [...box], discard: [...discard], turn: g.turn,
    again: g.again === true, pending: parsePending(g.pending), phase, step: g.step, rng: g.rng, log: parseLog(g.log),
  };
};
