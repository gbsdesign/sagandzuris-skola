import { Q_CITY_CARGO, Q_CITY_COUNT, Q_CITY_VALUE, Q_ROUTES } from '../data/qaravaniRoutes';

// „ქარავანი“ — the school's own game of caravan roads (series №3; since 2026-11-04 on its own rules, no longer a Ticket to Ride).
// Each house first places a caravanserai in a town (the house before the first one chooses first). A journey (round) = every house
// once: it rolls three dice and opens one free road touching its caravan's cities whose cells some of its dice add up to — a
// mountain road wants a pair among the dice (good weather in the pass), a water road a six (calm water); an abazi moves a die by
// one; a turn without a road is a trade (two abazi). Three abazi build another caravanserai in a city of one's caravan (a guest's
// road into it brings its owner an abazi). After the last journey every city goes to the house with most roads into it (a
// caravanserai counts as two; a tie shares its worth, rounded down), the kinds of cargo one's caravan reaches count by CARGO_PTS,
// and every caravanserai is two points. Played on one phone (pages/games/qaravani/Table.tsx), in a class's room
// (utils/qaravaniRoom.ts) and on paper (scripts/print-games/games/qaravani.mjs reads these numbers). A move is one number (`pick`);
// the dice fall on the game's own seed, so a move is pure and the phone's undo keeps whole games.

export const MIN_Q = 2;
export const MAX_Q = 5;
export const DICE_N = 3;
/** a house's caravanserais, their price in abazi, and what one counts for in its city */
export const INNS = 3;
export const INN_COST = 3;
export const INN_WEIGHT = 2;
export const INN_PTS = 2;
/** a turn without a road: this many abazi; a guest's road into one's caravanserai's city: one */
export const TRADE = 2;
export const GUEST = 1;
export const COINS0 = 1;
export const COINS_MAX = 30;
/** the journeys (rounds) a game has, and each house's carts */
export const roundsFor = (players: number) => [0, 0, 12, 10, 9, 8][players] ?? 8;
export const cartsFor = (players: number) => [0, 0, 20, 18, 16, 15][players] ?? 15;
/** the kinds of cargo one's caravan reaches (0–8) → points */
export const CARGO_PTS = [0, 1, 3, 5, 8, 11, 15, 20, 25] as const;
export const CARGO_N = 8;
/** a start caravanserai stands in a town (worth ≤ START_MAX), not next to another caravanserai */
export const START_MAX = 2;
export const LOG_MAX = 40;

/** each city's worth (the house with most roads into it takes it at the end; a tie shares it, rounded down) and its cargo (0–7 as
 *  data/qaravaniMap.ts Q_GOODS: ღვინო, თაფლი, ჩაი, ლურჯი სუფრა, ნაბადი, სულგუნი, სპილენძი, აბრეშუმი; −1 none) — the kit's map
 *  sets both (scripts/print-games/games/qaravani.mjs) */
export const CITY_VALUE: readonly number[] = Q_CITY_VALUE;
export const CITY_CARGO: readonly number[] = Q_CITY_CARGO;

/** a track: one lane of a road (a double road has two, `twin` names the other) */
export interface Track { route: number; a: number; b: number; n: number; mountain: boolean; water: boolean; twin: number }
export const TRACKS: readonly Track[] = (() => {
  const out: Track[] = [];
  Q_ROUTES.forEach(([a, b, n, double, m, ships], route) => {
    const t0 = out.length;
    out.push({ route, a, b, n, mountain: !!m, water: ships > 0, twin: double ? t0 + 1 : -1 });
    if (double) out.push({ route, a, b, n, mountain: !!m, water: ships > 0, twin: t0 });
  });
  return out;
})();
/** each road's tracks (its first lane first) */
export const ROUTE_TRACKS: readonly (readonly number[])[] = Q_ROUTES.map((_, r) => TRACKS.flatMap((t, i) => (t.route === r ? [i] : [])));
/** the tracks touching each city */
export const CITY_TRACKS: readonly (readonly number[])[] = Array.from({ length: Q_CITY_COUNT }, (_, x) => TRACKS.flatMap((t, i) => (t.a === x || t.b === x ? [i] : [])));

/** the cities next to each city */
export const NEXT: readonly (readonly number[])[] = Array.from({ length: Q_CITY_COUNT }, (_, x) =>
  [...new Set(CITY_TRACKS[x].map(t => (TRACKS[t].a === x ? TRACKS[t].b : TRACKS[t].a)))]);

export interface QPlayer {
  name: string;
  carts: number;
  coins: number;
  /** caravanserais not yet built */
  inns: number;
}

export type QPhase =
  /** each house places its first caravanserai, the house before the first one first */
  | { k: 'start' }
  /** the dice are rolled: abazi may move them and a caravanserai may be built, then a road or a trade ends the turn */
  | { k: 'turn' }
  | { k: 'end' };

export type QLine =
  | { k: 'road'; p: number; t: number; spent: number }
  | { k: 'trade'; p: number; spent: number }
  | { k: 'inn'; p: number; x: number }
  | { k: 'guest'; p: number; x: number; from: number }
  | { k: 'round'; r: number };

export interface QGame {
  v: 2;
  players: QPlayer[];
  /** the turn's dice as they stand (an abazi moves one) and as they fell */
  dice: number[];
  rolled: number[];
  /** abazi spent on the dice this turn */
  spent: number;
  /** each track's owner, −1 free */
  owner: number[];
  /** each city's caravanserais: a mask of the houses */
  inn: number[];
  turn: number;
  first: number;
  phase: QPhase;
  /** the journey (round) now, from 1 */
  round: number;
  step: number;
  seed: number;
  log: QLine[];
}

// ---------- the dice ----------
const rand = (g: { seed: number }) => {
  let t = (g.seed = (g.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const roll = (g: QGame) => {
  g.dice = Array.from({ length: DICE_N }, () => 1 + Math.floor(rand(g) * 6));
  g.rolled = [...g.dice];
  g.spent = 0;
};
const clone = (g: QGame): QGame => JSON.parse(JSON.stringify(g)) as QGame;
const push = (g: QGame, line: QLine) => { g.log = [...g.log, line].slice(-LOG_MAX); };
const has = (mask: number, p: number) => (mask & (1 << p)) !== 0;

/** what some of the dice (one, two or all three) add up to */
export const sumsOf = (dice: readonly number[]): number[] => {
  const out = new Set<number>();
  for (let m = 1; m < 1 << dice.length; m++) out.add(dice.reduce((s, d, i) => (m & (1 << i) ? s + d : s), 0));
  return [...out].sort((a, b) => a - b);
};
export const hasPair = (dice: readonly number[]) => dice.some((d, i) => dice.indexOf(d) !== i);
export const hasSix = (dice: readonly number[]) => dice.includes(6);
/** the dice that add up to `n` (the first such choice, the fewest dice first), or null */
export const diceFor = (dice: readonly number[], n: number): number[] | null => {
  let best: number[] | null = null;
  for (let m = 1; m < 1 << dice.length; m++) {
    const idx = dice.flatMap((_, i) => (m & (1 << i) ? [i] : []));
    if (idx.reduce((s, i) => s + dice[i], 0) === n && (!best || idx.length < best.length)) best = idx;
  }
  return best;
};

/** may `p` (with `carts` left, in a game of `players`) take track `t`, the dice aside? The screens ask it of the view too */
export const roadOpen = (owner: readonly number[], carts: number, players: number, p: number, t: number) => {
  const tr = TRACKS[t];
  if (!tr || owner[t] !== -1 || carts < tr.n) return false;
  if (tr.twin >= 0 && (owner[tr.twin] === p || (players <= 3 && owner[tr.twin] !== -1))) return false;
  return true;
};
/** the cities `p`'s caravan reaches: its roads' ends and its caravanserais */
export const netOf = (owner: readonly number[], inn: readonly number[], p: number) => {
  const out = new Set<number>();
  owner.forEach((o, t) => { if (o === p) { out.add(TRACKS[t].a); out.add(TRACKS[t].b); } });
  inn.forEach((m, x) => { if (has(m, p)) out.add(x); });
  return out;
};
/** does track `t` join `p`'s caravan? It may start elsewhere only when no free road touches `p`'s cities */
export const joins = (owner: readonly number[], inn: readonly number[], carts: number, players: number, p: number, t: number) => {
  const mine = netOf(owner, inn, p);
  if (!mine.size) return true;
  const tr = TRACKS[t];
  if (mine.has(tr.a) || mine.has(tr.b)) return true;
  return !TRACKS.some((u, i) => (mine.has(u.a) || mine.has(u.b)) && roadOpen(owner, carts, players, p, i));
};
/** do these dice open track `t` (its cells, the pass's pair, the water's six)? */
export const diceOpen = (dice: readonly number[], t: number) => {
  const tr = TRACKS[t];
  return !!tr && sumsOf(dice).includes(tr.n) && (!tr.mountain || hasPair(dice)) && (!tr.water || hasSix(dice));
};
export const canTake = (g: QGame, p: number, t: number) =>
  g.phase.k === 'turn' && p === g.turn && roadOpen(g.owner, g.players[p].carts, g.players.length, p, t) && diceOpen(g.dice, t)
  && joins(g.owner, g.inn, g.players[p].carts, g.players.length, p, t);
/** the tracks `p` may take with the dice as they stand */
export const takeable = (g: QGame, p = g.turn) => TRACKS.flatMap((_, t) => (canTake(g, p, t) ? [t] : []));
/** where `p` may build a caravanserai now: at the start any city without one (free), later a city of its caravan (three abazi) */
export const innSpots = (g: QGame, p = g.turn): number[] => {
  const pl = g.players[p];
  if (!pl || p !== g.turn) return [];
  if (g.phase.k === 'start') return g.inn.flatMap((m, x) => (m === 0 && CITY_VALUE[x] <= START_MAX && !NEXT[x].some(y => g.inn[y]) ? [x] : []));
  if (g.phase.k !== 'turn' || pl.inns <= 0 || pl.coins < INN_COST) return [];
  return [...netOf(g.owner, g.inn, p)].filter(x => !has(g.inn[x], p)).sort((a, b) => a - b);
};

export const newQaravani = ({ names, first, rnd }: { names: string[]; first?: number; rnd: () => number }): QGame | null => {
  const n = names.length;
  if (n < MIN_Q || n > MAX_Q) return null;
  const f0 = first !== undefined && first >= 0 && first < n ? first : Math.floor(rnd() * n);
  return {
    v: 2, players: names.map(name => ({ name: name.slice(0, 40), carts: cartsFor(n), coins: COINS0, inns: INNS })),
    dice: [], rolled: [], spent: 0, owner: TRACKS.map(() => -1), inn: Array(Q_CITY_COUNT).fill(0),
    // the caravanserais of the start are placed backwards: the house before the first one chooses first
    turn: (f0 + n - 1) % n, first: f0, phase: { k: 'start' }, round: 1, step: 0, seed: Math.floor(rnd() * 2147483647), log: [],
  };
};

/** a step's key: every move a new one */
export const keyOf = (g: QGame) => String(g.step);

// ---------- the moves as numbers ----------
/** an abazi moves die `d` up or down by one */
export const tweakPick = (d: number, up: boolean) => 100 + d * 2 + (up ? 1 : 0);
export const TRADE_PICK = 110;
export const claimPick = (t: number) => 1000 + t;
export const innPick = (x: number) => 2000 + x;

// ---------- the turn's end ----------
const endTurn = (g: QGame) => {
  const p = g.turn, n = g.players.length;
  g.turn = (p + 1) % n;
  if (g.turn === g.first) {
    if (g.round >= roundsFor(n)) { g.phase = { k: 'end' }; g.dice = []; g.rolled = []; g.spent = 0; return; }
    g.round++;
    push(g, { k: 'round', r: g.round });
  }
  g.phase = { k: 'turn' };
  roll(g);
};

/** the game after `seat`'s move, or the same game when the move is not allowed now */
export const applyPick = (g0: QGame, seat: number, pick: number): QGame => {
  const ph = g0.phase;
  if (ph.k === 'end' || !Number.isInteger(pick) || seat !== g0.turn) return g0;
  const g = clone(g0), p = seat, me = g.players[p];
  if (ph.k === 'turn' && pick >= 100 && pick < 100 + 2 * DICE_N) {
    const d = (pick - 100) >> 1, up = (pick - 100) % 2 === 1, v = g.dice[d] + (up ? 1 : -1);
    if (me.coins < 1 || v < 1 || v > 6) return g0;
    g.dice[d] = v;
    me.coins--;
    g.spent++;
  } else if (ph.k === 'turn' && pick === TRADE_PICK) {
    me.coins = Math.min(COINS_MAX, me.coins + TRADE);
    push(g, { k: 'trade', p, spent: g.spent });
    endTurn(g);
  } else if (ph.k === 'turn' && pick >= 1000 && pick < 1000 + TRACKS.length) {
    const t = pick - 1000, tr = TRACKS[t];
    if (!canTake(g, p, t)) return g0;
    g.owner[t] = p;
    me.carts -= tr.n;
    push(g, { k: 'road', p, t, spent: g.spent });
    for (const x of new Set([tr.a, tr.b])) {
      g.players.forEach((pl, q) => {
        if (q !== p && has(g.inn[x], q)) { pl.coins = Math.min(COINS_MAX, pl.coins + GUEST); push(g, { k: 'guest', p: q, x, from: p }); }
      });
    }
    endTurn(g);
  } else if (pick >= 2000 && pick < 2000 + Q_CITY_COUNT) {
    const x = pick - 2000;
    if (!innSpots(g, p).includes(x)) return g0;
    if (ph.k === 'turn') me.coins -= INN_COST;
    me.inns--;
    g.inn[x] |= 1 << p;
    push(g, { k: 'inn', p, x });
    if (ph.k === 'start') {
      if (p === g.first) { g.phase = { k: 'turn' }; roll(g); } else g.turn = (p + g.players.length - 1) % g.players.length;
    }
  } else return g0;
  g.step++;
  return g;
};

/** every move the house on turn may make now (the tests' random games) */
export const legalPicks = (g: QGame, seat = g.turn): number[] => {
  if (g.phase.k === 'end' || seat !== g.turn) return [];
  const out: number[] = [];
  if (g.phase.k === 'start') return innSpots(g, seat).map(innPick);
  if (g.players[seat].coins > 0) g.dice.forEach((d, i) => { if (d > 1) out.push(tweakPick(i, false)); if (d < 6) out.push(tweakPick(i, true)); });
  out.push(...takeable(g, seat).map(claimPick), TRADE_PICK, ...innSpots(g, seat).map(innPick));
  return out;
};

// ---------- the score ----------
export interface QRow {
  /** the cells of one's roads */
  roads: number;
  /** the cities taken (their numbers) and their worth */
  cities: number[];
  cityPts: number;
  /** the kinds of cargo one's roads reach */
  cargo: number[];
  cargoPts: number;
  /** the caravanserais standing */
  inns: number;
  total: number;
}
export interface QResult { rows: QRow[]; order: number[]; winners: number[] }

/** each house's weight in a city: its roads into it, a caravanserai two more */
export const weightIn = (owner: readonly number[], inn: readonly number[], n: number, x: number) => {
  const w = Array(n).fill(0);
  for (const t of CITY_TRACKS[x]) if (owner[t] >= 0) w[owner[t]]++;
  for (let p = 0; p < n; p++) if (has(inn[x], p)) w[p] += INN_WEIGHT;
  return w;
};
/** who takes city `x` now: the houses with most weight there (none while nobody is there) */
export const holdersOf = (owner: readonly number[], inn: readonly number[], n: number, x: number) => {
  const w = weightIn(owner, inn, n, x), top = Math.max(...w);
  return top > 0 ? w.flatMap((v, p) => (v === top ? [p] : [])) : [];
};

export const scoreOf = (owner: readonly number[], inn: readonly number[], n: number): QRow[] => {
  const rows: QRow[] = Array.from({ length: n }, () => ({ roads: 0, cities: [], cityPts: 0, cargo: [], cargoPts: 0, inns: 0, total: 0 }));
  owner.forEach((o, t) => { if (o >= 0) rows[o].roads += TRACKS[t].n; });
  for (let x = 0; x < Q_CITY_COUNT; x++) {
    const hs = holdersOf(owner, inn, n, x);
    const pts = Math.floor(CITY_VALUE[x] / hs.length);
    for (const p of hs) { rows[p].cities.push(x); rows[p].cityPts += pts; }
  }
  rows.forEach((r, p) => {
    r.cargo = [...new Set([...netOf(owner, inn, p)].map(x => CITY_CARGO[x]).filter(c => c >= 0))].sort((a, b) => a - b);
    r.cargoPts = CARGO_PTS[r.cargo.length];
    r.inns = inn.reduce((c, m) => c + (has(m, p) ? 1 : 0), 0);
    r.total = r.cityPts + r.cargoPts + r.inns * INN_PTS;
  });
  return rows;
};

export const resultOf = (g: Pick<QGame, 'owner' | 'inn' | 'players'>): QResult => {
  const rows = scoreOf(g.owner, g.inn, g.players.length);
  const rank = (a: number, b: number) => rows[b].total - rows[a].total || rows[b].cities.length - rows[a].cities.length
    || g.players[b].coins - g.players[a].coins;
  const order = rows.map((_, i) => i).sort((a, b) => rank(a, b) || a - b);
  const winners = order.filter(i => rank(i, order[0]) === 0);
  return { rows, order, winners };
};

// ---------- the careful move (the late player's in the room, the tests' games) ----------
const W_CART = 0.6, W_TRADE = 1, W_TWEAK = 1, W_INN = 1.5;
const gainOf = (g: QGame, p: number, owner: number[], inn: number[]) => {
  const before = scoreOf(g.owner, g.inn, g.players.length), after = scoreOf(owner, inn, g.players.length);
  const mine = after[p].total - before[p].total;
  const theirs = after.reduce((s, r, q) => (q === p ? s : s + r.total - before[q].total), 0);
  return mine - theirs / Math.max(1, g.players.length - 1) / 2;
};
/** how much of the game is still ahead (1 at the start, ~0 at the last turn) */
const ahead = (g: QGame) => {
  const n = g.players.length, done = (g.round - 1) * n + ((g.turn - g.first + n) % n);
  return Math.max(0, 1 - done / (roundsFor(n) * n));
};
const roadGain = (g: QGame, p: number, t: number) => {
  const owner = [...g.owner];
  owner[t] = p;
  const left = g.players[p].carts, per = left / Math.max(1, ahead(g) * roundsFor(g.players.length));
  return gainOf(g, p, owner, g.inn) - W_CART * TRACKS[t].n * Math.min(1.5, cartsFor(g.players.length) / roundsFor(g.players.length) / Math.max(0.5, per)) * ahead(g);
};
const innGain = (g: QGame, p: number, x: number) => {
  const inn = [...g.inn];
  inn[x] |= 1 << p;
  return gainOf(g, p, g.owner, inn);
};
/** the best road for these dice, and what it gains */
const bestRoad = (g: QGame, p: number, dice: readonly number[]): [number, number] => {
  let best = -1, bestV = -Infinity;
  for (let t = 0; t < TRACKS.length; t++) {
    if (!roadOpen(g.owner, g.players[p].carts, g.players.length, p, t) || !diceOpen(dice, t) || !joins(g.owner, g.inn, g.players[p].carts, g.players.length, p, t)) continue;
    const v = roadGain(g, p, t);
    if (v > bestV) { bestV = v; best = t; }
  }
  return [best, bestV];
};

/** how good a start city is: its worth and cargo and its neighbours', less where another caravan already stands near */
const startValue = (g: QGame, x: number) => {
  const near = (y: number) => CITY_VALUE[y] / 2 + (CITY_CARGO[y] >= 0 ? 1 : 0) - (g.inn[y] ? 2 : 0);
  return CITY_VALUE[x] + (CITY_CARGO[x] >= 0 ? 1.5 : 0) + NEXT[x].reduce((s, y) => s + near(y), 0) / 1.5;
};

export const botPick = (g: QGame): number => {
  const p = g.turn, me = g.players[p];
  if (g.phase.k === 'end' || !me) return -1;
  if (g.phase.k === 'start') {
    const spots = innSpots(g, p);
    return innPick(spots.reduce((b, x) => (startValue(g, x) > startValue(g, b) ? x : b), spots[0]));
  }
  const spots = innSpots(g, p);
  const bestInn = spots.reduce<[number, number]>((b, x) => { const v = innGain(g, p, x); return v > b[1] ? [x, v] : b; }, [-1, 0]);
  if (bestInn[0] >= 0 && bestInn[1] >= (W_INN * INN_COST / 2) * ahead(g) + 0.5) return innPick(bestInn[0]);
  const [road, gain] = bestRoad(g, p, g.dice);
  const tradeV = W_TRADE * ahead(g);
  const now = road >= 0 ? Math.max(gain, tradeV) : tradeV;
  // an abazi on a die, when it opens a clearly better road
  if (me.coins > 0) {
    let tweak = -1, tweakV = now + W_TWEAK;
    g.dice.forEach((d, i) => {
      for (const up of [false, true]) {
        const v = d + (up ? 1 : -1);
        if (v < 1 || v > 6) continue;
        const dice = g.dice.map((x, j) => (j === i ? v : x)), [t, val] = bestRoad(g, p, dice);
        if (t >= 0 && val > tweakV) { tweakV = val; tweak = tweakPick(i, up); }
      }
    });
    if (tweak >= 0) return tweak;
  }
  return road >= 0 && gain >= tradeV ? claimPick(road) : TRADE_PICK;
};

/** time is up (the room): the careful move */
export const timeUp = (g: QGame): QGame => {
  if (g.phase.k === 'end') return g;
  const x = applyPick(g, g.turn, botPick(g));
  if (x !== g) return x;
  return applyPick(g, g.turn, TRADE_PICK);
};

/** how long a step waits in the room (s) */
export const QARAVANI_SECS: Record<QPhase['k'], number> = { start: 60, turn: 75, end: 0 };

// ---------- reading a kept game ----------
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ints = (v: unknown, lo: number, hi: number, len?: number): number[] | null =>
  (Array.isArray(v) && (len === undefined || v.length === len) && v.every(x => isInt(x, lo, hi)) ? (v as number[]) : null);

export const parseLine = (raw: unknown, n: number): QLine | null => {
  const o = raw as Record<string, unknown> | null;
  if (o && typeof o === 'object' && o.k === 'round') return isInt(o.r, 1, 99) ? { k: 'round', r: o.r } : null;
  if (!o || typeof o !== 'object' || !isInt(o.p, 0, n - 1)) return null;
  const p = o.p;
  switch (o.k) {
    case 'road': return isInt(o.t, 0, TRACKS.length - 1) && isInt(o.spent, 0, 99) ? { k: 'road', p, t: o.t, spent: o.spent } : null;
    case 'trade': return isInt(o.spent, 0, 99) ? { k: 'trade', p, spent: o.spent } : null;
    case 'inn': return isInt(o.x, 0, Q_CITY_COUNT - 1) ? { k: 'inn', p, x: o.x } : null;
    case 'guest': return isInt(o.x, 0, Q_CITY_COUNT - 1) && isInt(o.from, 0, n - 1) ? { k: 'guest', p, x: o.x, from: o.from } : null;
    default: return null;
  }
};
export const parseLog = (raw: unknown, n: number): QLine[] => (Array.isArray(raw) ? raw.map(x => parseLine(x, n)).filter((x): x is QLine => !!x).slice(-LOG_MAX) : []);
const parsePhase = (raw: unknown): QPhase | null => {
  const k = (raw as { k?: unknown } | null)?.k;
  return k === 'start' || k === 'turn' || k === 'end' ? { k } : null;
};

export const parseQaravani = (raw: unknown): QGame | null => {
  const o = raw as Partial<QGame> | null;
  if (!o || typeof o !== 'object' || o.v !== 2 || !Array.isArray(o.players) || o.players.length < MIN_Q || o.players.length > MAX_Q) return null;
  const n = o.players.length;
  const players: QPlayer[] = [];
  for (const x of o.players as unknown[]) {
    const pl = x as Partial<QPlayer> | null;
    if (!pl || typeof pl.name !== 'string' || !isInt(pl.carts, 0, 30) || !isInt(pl.coins, 0, COINS_MAX) || !isInt(pl.inns, 0, INNS)) return null;
    players.push({ name: pl.name.slice(0, 40), carts: pl.carts, coins: pl.coins, inns: pl.inns });
  }
  const phase = parsePhase(o.phase);
  const over = phase?.k !== 'turn';
  const dice = ints(o.dice, 1, 6, over ? undefined : DICE_N), rolled = ints(o.rolled, 1, 6, over ? undefined : DICE_N);
  const owner = ints(o.owner, -1, n - 1, TRACKS.length), inn = ints(o.inn, 0, (1 << n) - 1, Q_CITY_COUNT);
  if (!phase || !dice || !rolled || !owner || !inn || !isInt(o.spent, 0, 99) || !isInt(o.turn, 0, n - 1) || !isInt(o.first, 0, n - 1)
    || !isInt(o.round, 1, roundsFor(n)) || !isInt(o.step, 0, 1e7) || !isInt(o.seed, -2147483648, 2147483647)) return null;
  return {
    v: 2, players, dice, rolled, spent: o.spent, owner, inn, turn: o.turn, first: o.first, phase, round: o.round,
    step: o.step, seed: o.seed, log: parseLog(o.log, n),
  };
};
