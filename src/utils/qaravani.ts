import { Q_CITY_COUNT, Q_LONG, Q_ROUTES, Q_TICKETS } from '../data/qaravaniRoutes';

// „ქარავანი“ on phones — the rules of the printed kit №3 (scripts/print-games/games/qaravani.mjs: a Ticket to Ride: Europe on a map
// of Georgia at the end of the XIX century) for the app's two variants: one phone passed round (pages/games/qaravani/Table.tsx)
// and a class's room (utils/qaravaniRoom.ts). The map's roads and the travellers' letters come from the kit
// (data/qaravaniRoutes.ts). Cards: the eight goods 0–7 (data/qaravaniMap.ts Q_GOODS' order) and the locomotive 8; a road's colour
// 8 is the gray stone road. A move is one number (`pick`), so the room sends a number and the phone's undo keeps whole games.
// Everything random after the deal (the deck shuffled again from the discards) runs on the game's own seed, so a move is pure.

export const LOCO = 8;
export const GRAY = 8;
export const KINDS = 9;
export const GOODS_N = 8;
export const DECK_EACH = 12;
export const DECK_LOCOS = 14;
export const FACE_N = 5;
export const HAND0 = 4;
export const MIN_Q = 2;
export const MAX_Q = 5;
export const INNS = 3;
export const INN_POINTS = 4;
export const LONGEST_POINTS = 10;
/** a road's points by its cells: 1 → 1, 2 → 2, 3 → 4, 4 → 7, 5 → 10, 6 → 15, 7 → 18, 8 → 21 */
export const SCORE = [0, 1, 2, 4, 7, 10, 15, 18, 21] as const;
/** the last round begins when someone ends a turn with this many carts or fewer */
export const LAST_CARTS = 2;
export const cartsFor = (players: number) => (players >= 5 ? 35 : 40);
export const LOG_MAX = 40;

/** a track: one lane of a road (a double road has two, `twin` names the other) */
export interface Track { route: number; a: number; b: number; n: number; color: number; mountain: boolean; ships: number; twin: number }
export const TRACKS: readonly Track[] = (() => {
  const out: Track[] = [];
  Q_ROUTES.forEach(([a, b, n, color, second, m, ships], route) => {
    const t0 = out.length;
    out.push({ route, a, b, n, color, mountain: !!m, ships, twin: second >= 0 ? t0 + 1 : -1 });
    if (second >= 0) out.push({ route, a, b, n, color: second, mountain: !!m, ships, twin: t0 });
  });
  return out;
})();
/** each road's tracks (its first lane first) */
export const ROUTE_TRACKS: readonly (readonly number[])[] = Q_ROUTES.map((_, r) => TRACKS.flatMap((t, i) => (t.route === r ? [i] : [])));
/** the tracks touching each city */
export const CITY_TRACKS: readonly (readonly number[])[] = Array.from({ length: Q_CITY_COUNT }, (_, x) => TRACKS.flatMap((t, i) => (t.a === x || t.b === x ? [i] : [])));

export interface Ticket { a: number; b: number; v: number; long: boolean }
/** the 40 travellers' letters, then the 6 long journeys */
export const TICKETS: readonly Ticket[] = Q_TICKETS.map(([a, b, v], i) => ({ a, b, v, long: i >= Q_TICKETS.length - Q_LONG }));
export const SHORT_N = Q_TICKETS.length - Q_LONG;

export interface QPlayer {
  name: string;
  /** cards in hand: a count for each kind (0–7 the goods, 8 locomotives) */
  hand: number[];
  /** the letters kept */
  tickets: number[];
  carts: number;
  /** inns not yet built */
  inns: number;
  /** the roads' points so far */
  pts: number;
}

export type QPhase =
  /** the deal: everyone keeps 2, 3 or all 4 of their letters (one long journey and three) — all at once */
  | { k: 'start'; offer: number[][]; kept: (number[] | null)[] }
  | { k: 'turn' }
  /** one card taken (not a face-up locomotive): one more — `face` the kinds taken face up, `blind` from the deck */
  | { k: 'second'; face: number[]; blind: number }
  /** three letters drawn: keep 1, 2 or 3 */
  | { k: 'tickets'; offer: number[] }
  /** a mountain road: the cards (`c` the colour, 8 = locomotives only, `l` of them locomotives) are still in hand, three cards
   *  were turned up (`drawn`) and the road wants `extra` more */
  | { k: 'tunnel'; t: number; c: number; l: number; drawn: number[]; extra: number }
  | { k: 'end' };

export type QLine =
  | { k: 'cards'; p: number; face: number[]; blind: number }
  | { k: 'road'; p: number; t: number; c: number; l: number; extra: number }
  | { k: 'tunnel'; p: number; t: number; extra: number }
  | { k: 'tickets'; p: number; kept: number; of: number }
  | { k: 'start'; p: number; kept: number }
  | { k: 'inn'; p: number; x: number }
  | { k: 'wash' }
  | { k: 'last'; p: number }
  | { k: 'pass'; p: number };

export interface QGame {
  v: 1;
  players: QPlayer[];
  /** the draw pile, its top last */
  deck: number[];
  pile: number[];
  /** the five face-up cards (−1 = an empty place) */
  face: number[];
  /** the letters' pile, its top last (letters given back go under it) */
  tdeck: number[];
  /** each track's owner, −1 free */
  owner: number[];
  /** each city's inn: its owner, −1 none */
  inn: number[];
  turn: number;
  first: number;
  phase: QPhase;
  /** −1, or the turns left in the last round */
  left: number;
  /** turns passed in a row (everyone passing ends the game) */
  idle: number;
  step: number;
  seed: number;
  log: QLine[];
}

// ---------- the seeded shuffles ----------
const rand = (g: { seed: number }) => {
  let t = (g.seed = (g.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffleBy = <T,>(xs: T[], r: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const clone = (g: QGame): QGame => JSON.parse(JSON.stringify(g)) as QGame;
const bits = (m: number) => { let k = 0; for (let x = m; x; x &= x - 1) k++; return k; };
const push = (g: QGame, line: QLine) => { g.log = [...g.log, line].slice(-LOG_MAX); };

/** a card from the deck (the discards shuffled into a new deck when it is empty), −1 when there is none */
const drawCard = (g: QGame) => {
  if (!g.deck.length) {
    if (!g.pile.length) return -1;
    g.deck = shuffleBy(g.pile, () => rand(g));
    g.pile = [];
  }
  return g.deck.pop() as number;
};
const fillFace = (g: QGame) => {
  for (let i = 0; i < FACE_N; i++) if (g.face[i] < 0) { const c = drawCard(g); if (c < 0) return; g.face[i] = c; }
};
/** three face-up locomotives: all five go and five new are laid (at most three times in a row) */
const washFace = (g: QGame) => {
  for (let k = 0; k < 3 && g.face.filter(c => c === LOCO).length >= 3; k++) {
    g.pile.push(...g.face.filter(c => c >= 0));
    g.face = g.face.map(() => -1);
    fillFace(g);
    push(g, { k: 'wash' });
  }
};

export const newQaravani = ({ names, first, rnd }: { names: string[]; first?: number; rnd: () => number }): QGame | null => {
  const n = names.length;
  if (n < MIN_Q || n > MAX_Q) return null;
  const deck = shuffleBy([...Array.from({ length: GOODS_N * DECK_EACH }, (_, i) => i % GOODS_N), ...Array(DECK_LOCOS).fill(LOCO)], rnd);
  const shorts = shuffleBy(Array.from({ length: SHORT_N }, (_, i) => i), rnd);
  const longs = shuffleBy(Array.from({ length: Q_LONG }, (_, i) => SHORT_N + i), rnd);
  const players: QPlayer[] = names.map(name => {
    const hand = Array(KINDS).fill(0);
    for (const c of deck.splice(-HAND0)) hand[c]++;
    return { name, hand, tickets: [], carts: cartsFor(n), inns: INNS, pts: 0 };
  });
  const offer = names.map(() => [longs.pop() as number, ...shorts.splice(-3)]);
  const f0 = first !== undefined && first >= 0 && first < n ? first : Math.floor(rnd() * n);
  const g: QGame = {
    v: 1, players, deck, pile: [], face: Array(FACE_N).fill(-1), tdeck: shorts, owner: TRACKS.map(() => -1), inn: Array(Q_CITY_COUNT).fill(-1),
    turn: f0, first: f0, phase: { k: 'start', offer, kept: names.map(() => null) }, left: -1, idle: 0, step: 0,
    seed: Math.floor(rnd() * 2147483647), log: [],
  };
  fillFace(g);
  washFace(g);
  return g;
};

/** a step's key: the deal is one step for everyone (they answer at once), every move after it a new one */
export const keyOf = (g: QGame) => (g.phase.k === 'start' ? 'start' : String(g.step));
/** who the game waits on */
export const waitingOn = (g: QGame): number[] => {
  const ph = g.phase;
  if (ph.k === 'end') return [];
  if (ph.k === 'start') return ph.kept.flatMap((k, i) => (k ? [] : [i]));
  return [g.turn];
};

// ---------- the moves as numbers ----------
export const FACE_PICK = 100; // + the place 0–4
export const DECK_PICK = 105;
export const TICKETS_PICK = 106;
export const PASS_PICK = 107;
/** the letters kept: a mask over the offer */
export const keepPick = (mask: number) => 200 + mask;
/** a mountain road's extra cards, `l` of them locomotives */
export const tunnelPick = (l: number) => 300 + l;
export const QUIT_PICK = 399;
/** a road: its track, the cards' colour (8 = locomotives only) and how many locomotives */
export const claimPick = (t: number, c: number, l: number) => 10000 + t * 100 + c * 10 + l;
export const innPick = (x: number, c: number, l: number) => 30000 + x * 100 + c * 10 + l;
const unpay = (p: number, base: number) => ({ id: Math.floor((p - base) / 100), c: Math.floor(((p - base) % 100) / 10), l: (p - base) % 10 });

// ---------- what may be paid ----------
export interface Pay { c: number; l: number }
/** the ways to pay `n` cards of `color` (8 = any one colour, as a gray road or an inn wants) with at least `locos` locomotives,
 *  from `hand`; c = 8 means locomotives only. The fewest locomotives first for each colour. */
export const payments = (hand: readonly number[], n: number, color: number, locos = 0): Pay[] => {
  const out: Pay[] = [];
  const colours = color === GRAY ? Array.from({ length: GOODS_N }, (_, i) => i) : [color];
  for (const c of colours) for (let l = Math.max(locos, n - hand[c]); l < n && l <= hand[LOCO]; l++) if (n - l >= 1) out.push({ c, l });
  if (hand[LOCO] >= n && n >= Math.max(1, locos)) out.push({ c: LOCO, l: n });
  return out;
};
const pays = (hand: readonly number[], n: number, color: number, locos: number, c: number, l: number) =>
  payments(hand, n, color, locos).some(p => p.c === c && p.l === l);
const spend = (g: QGame, p: number, c: number, l: number, n: number) => {
  const h = g.players[p].hand;
  if (c !== LOCO) { h[c] -= n - l; for (let i = 0; i < n - l; i++) g.pile.push(c); }
  h[LOCO] -= l;
  for (let i = 0; i < l; i++) g.pile.push(LOCO);
};

/** may `p` (with `carts` left, in a game of `players`) take track `t` (not counting the cards)? The screens ask it of the view */
export const roadOpen = (owner: readonly number[], carts: number, players: number, p: number, t: number) => {
  const tr = TRACKS[t];
  if (!tr || owner[t] !== -1 || carts < tr.n) return false;
  if (tr.twin >= 0 && (owner[tr.twin] === p || (players <= 3 && owner[tr.twin] !== -1))) return false;
  return true;
};
export const trackOpen = (g: QGame, p: number, t: number) => roadOpen(g.owner, g.players[p].carts, g.players.length, p, t);
/** the ways `p` can pay for track `t` now (empty: not now) */
export const trackPayments = (g: QGame, p: number, t: number): Pay[] =>
  trackOpen(g, p, t) ? payments(g.players[p].hand, TRACKS[t].n, TRACKS[t].color, TRACKS[t].ships) : [];
/** an inn costs 1, then 2, then 3 cards of one colour */
export const innCost = (pl: QPlayer) => INNS - pl.inns + 1;
export const innPayments = (g: QGame, p: number, x: number): Pay[] =>
  g.players[p].inns > 0 && g.inn[x] === -1 ? payments(g.players[p].hand, innCost(g.players[p]), GRAY) : [];
/** a mountain road's extra cards from `hand`: `l` of them locomotives (only locomotives when the road was paid with locomotives
 *  only) */
export const tunnelOptions = (ph: Extract<QPhase, { k: 'tunnel' }>, hand: readonly number[]): number[] => {
  const n = TRACKS[ph.t].n;
  const left = ph.c === LOCO ? 0 : hand[ph.c] - (n - ph.l), locos = hand[LOCO] - ph.l;
  const out: number[] = [];
  for (let l = 0; l <= ph.extra; l++) if (l <= locos && ph.extra - l <= left && (ph.c !== LOCO || l === ph.extra)) out.push(l);
  return out;
};
export const tunnelPayments = (g: QGame): number[] => (g.phase.k === 'tunnel' ? tunnelOptions(g.phase, g.players[g.turn].hand) : []);
const canSecond = (g: QGame) => g.deck.length + g.pile.length > 0 || g.face.some(c => c >= 0 && c !== LOCO);
const canDraw = (g: QGame) => g.deck.length + g.pile.length > 0 || g.face.some(c => c >= 0);
/** can `p` do anything but pass? */
const canAct = (g: QGame, p: number) => canDraw(g) || g.tdeck.length > 0
  || TRACKS.some((_, t) => trackPayments(g, p, t).length > 0) || g.inn.some((_, x) => innPayments(g, p, x).length > 0);

// ---------- the turn's end ----------
const endTurn = (g: QGame, passed = false) => {
  const p = g.turn, n = g.players.length;
  g.idle = passed ? g.idle + 1 : 0;
  if (g.left > 0) g.left--;
  else if (g.left < 0 && g.players[p].carts <= LAST_CARTS) { g.left = n; push(g, { k: 'last', p }); }
  if (g.left === 0 || g.idle >= n) { g.phase = { k: 'end' }; return; }
  g.turn = (p + 1) % n;
  g.phase = { k: 'turn' };
};
const cardsDone = (g: QGame, face: number[], blind: number) => { push(g, { k: 'cards', p: g.turn, face, blind }); endTurn(g); };
const claimDone = (g: QGame, t: number, c: number, l: number, extra: number) => {
  const p = g.turn, tr = TRACKS[t];
  g.owner[t] = p;
  g.players[p].carts -= tr.n;
  g.players[p].pts += SCORE[tr.n];
  push(g, { k: 'road', p, t, c, l, extra });
  endTurn(g);
};

/** the game after `seat`'s move, or the same game when the move is not allowed now */
export const applyPick = (g0: QGame, seat: number, pick: number): QGame => {
  const ph0 = g0.phase;
  if (ph0.k === 'end' || !Number.isInteger(pick) || seat < 0 || seat >= g0.players.length) return g0;
  if (ph0.k === 'start') {
    const offer = ph0.offer[seat], mask = pick - 200;
    if (ph0.kept[seat] || mask < 0 || mask >= 1 << offer.length || bits(mask) < 2) return g0;
    const g = clone(g0), ph = g.phase as Extract<QPhase, { k: 'start' }>;
    const kept = offer.filter((_, i) => mask & (1 << i));
    ph.kept[seat] = kept;
    g.players[seat].tickets = kept;
    push(g, { k: 'start', p: seat, kept: kept.length });
    if (ph.kept.every(Boolean)) { g.phase = { k: 'turn' }; g.turn = g.first; }
    g.step++;
    return g;
  }
  if (seat !== g0.turn) return g0;
  const g = clone(g0), ph = g.phase, p = seat, me = g.players[p];

  if (ph.k === 'turn' || ph.k === 'second') {
    const first = ph.k === 'turn';
    if (pick >= FACE_PICK && pick < FACE_PICK + FACE_N) {
      const i = pick - FACE_PICK, c = g.face[i];
      if (c < 0 || (!first && c === LOCO)) return g0;
      me.hand[c]++;
      g.face[i] = -1;
      fillFace(g);
      washFace(g);
      const face = first ? [c] : [...(ph as { face: number[] }).face, c], blind = first ? 0 : (ph as { blind: number }).blind;
      if (!first || c === LOCO || !canSecond(g)) cardsDone(g, face, blind);
      else g.phase = { k: 'second', face, blind };
    } else if (pick === DECK_PICK) {
      const c = drawCard(g);
      if (c < 0) return g0;
      me.hand[c]++;
      const face = first ? [] : (ph as { face: number[] }).face, blind = (first ? 0 : (ph as { blind: number }).blind) + 1;
      if (!first || !canSecond(g)) cardsDone(g, face, blind);
      else g.phase = { k: 'second', face, blind };
    } else if (!first) {
      return g0;
    } else if (pick === TICKETS_PICK) {
      if (!g.tdeck.length) return g0;
      g.phase = { k: 'tickets', offer: g.tdeck.splice(-3).reverse() };
    } else if (pick === PASS_PICK) {
      if (canAct(g, p)) return g0;
      push(g, { k: 'pass', p });
      endTurn(g, true);
    } else if (pick >= 10000 && pick < 20000) {
      const { id: t, c, l } = unpay(pick, 10000), tr = TRACKS[t];
      if (!tr || !trackOpen(g, p, t) || !pays(me.hand, tr.n, tr.color, tr.ships, c, l)) return g0;
      if (!tr.mountain) { spend(g, p, c, l, tr.n); claimDone(g, t, c, l, 0); }
      else {
        const drawn: number[] = [];
        for (let k = 0; k < 3; k++) { const d = drawCard(g); if (d < 0) break; drawn.push(d); }
        const extra = drawn.filter(d => d === LOCO || (c !== LOCO && d === c)).length;
        if (!extra) { g.pile.push(...drawn); spend(g, p, c, l, tr.n); claimDone(g, t, c, l, 0); }
        else g.phase = { k: 'tunnel', t, c, l, drawn, extra };
      }
    } else if (pick >= 30000 && pick < 40000) {
      const { id: x, c, l } = unpay(pick, 30000);
      if (x >= Q_CITY_COUNT || !innPayments(g, p, x).some(q => q.c === c && q.l === l)) return g0;
      spend(g, p, c, l, innCost(me));
      g.inn[x] = p;
      me.inns--;
      push(g, { k: 'inn', p, x });
      endTurn(g);
    } else return g0;
  } else if (ph.k === 'tickets') {
    const mask = pick - 200;
    if (mask < 1 || mask >= 1 << ph.offer.length) return g0;
    const kept = ph.offer.filter((_, i) => mask & (1 << i));
    me.tickets.push(...kept);
    g.tdeck.unshift(...ph.offer.filter((_, i) => !(mask & (1 << i))));
    push(g, { k: 'tickets', p, kept: kept.length, of: ph.offer.length });
    endTurn(g);
  } else if (ph.k === 'tunnel') {
    const tr = TRACKS[ph.t];
    if (pick === QUIT_PICK) {
      g.pile.push(...ph.drawn);
      push(g, { k: 'tunnel', p, t: ph.t, extra: ph.extra });
      endTurn(g);
    } else {
      const xl = pick - 300;
      if (!tunnelPayments(g).includes(xl)) return g0;
      g.pile.push(...ph.drawn);
      spend(g, p, ph.c, ph.l, tr.n);
      if (ph.c === LOCO) spend(g, p, LOCO, ph.extra, ph.extra);
      else spend(g, p, ph.c, xl, ph.extra);
      claimDone(g, ph.t, ph.c, ph.l, ph.extra);
    }
  }
  g.step++;
  return g;
};

/** every move `seat` may make now (the tests' random games, and the late player's fallback) */
export const legalPicks = (g: QGame, seat: number): number[] => {
  const ph = g.phase;
  if (ph.k === 'end') return [];
  if (ph.k === 'start') {
    if (ph.kept[seat]) return [];
    const n = ph.offer[seat].length;
    return Array.from({ length: 1 << n }, (_, m) => m).filter(m => bits(m) >= 2).map(keepPick);
  }
  if (seat !== g.turn) return [];
  if (ph.k === 'tickets') return Array.from({ length: (1 << ph.offer.length) - 1 }, (_, m) => keepPick(m + 1));
  if (ph.k === 'tunnel') return [...tunnelPayments(g).map(tunnelPick), QUIT_PICK];
  const out: number[] = [];
  g.face.forEach((c, i) => { if (c >= 0 && (ph.k === 'turn' || c !== LOCO)) out.push(FACE_PICK + i); });
  if (g.deck.length + g.pile.length) out.push(DECK_PICK);
  if (ph.k === 'second') return out;
  if (g.tdeck.length) out.push(TICKETS_PICK);
  TRACKS.forEach((_, t) => { for (const q of trackPayments(g, seat, t)) out.push(claimPick(t, q.c, q.l)); });
  g.inn.forEach((_, x) => { for (const q of innPayments(g, seat, x)) out.push(innPick(x, q.c, q.l)); });
  if (!out.length) out.push(PASS_PICK);
  return out;
};

/** time is up (the room): the deal keeps the two cheapest letters, a turn takes two cards from the deck (or what lies face up),
 *  a second card the same, new letters keep the cheapest one, a mountain road is given up */
export const timeUp = (g: QGame): QGame => {
  const ph = g.phase;
  if (ph.k === 'end') return g;
  if (ph.k === 'start') {
    let x = g;
    ph.offer.forEach((o, s) => {
      if (ph.kept[s]) return;
      const two = o.map((id, i) => ({ id, i })).filter(e => !TICKETS[e.id].long).sort((a, b) => TICKETS[a.id].v - TICKETS[b.id].v).slice(0, 2);
      x = applyPick(x, s, keepPick(two.reduce((m, e) => m | (1 << e.i), 0)));
    });
    return x;
  }
  const p = g.turn;
  if (ph.k === 'tickets') {
    const i = ph.offer.reduce((b, id, k) => (TICKETS[id].v < TICKETS[ph.offer[b]].v ? k : b), 0);
    return applyPick(g, p, keepPick(1 << i));
  }
  if (ph.k === 'tunnel') return applyPick(g, p, QUIT_PICK);
  const cardPick = (x: QGame) => (x.deck.length + x.pile.length ? DECK_PICK
    : FACE_PICK + Math.max(0, x.face.findIndex(c => c >= 0 && (x.phase.k === 'turn' || c !== LOCO))));
  let x = applyPick(g, p, cardPick(g));
  if (x === g) {
    const h = clone(g);
    push(h, { k: 'pass', p });
    endTurn(h, true);
    h.step++;
    return h;
  }
  if (x.phase.k === 'second') {
    const y = applyPick(x, p, cardPick(x));
    if (y !== x) return y;
    const h = clone(x), s = h.phase as Extract<QPhase, { k: 'second' }>;
    cardsDone(h, s.face, s.blind);
    h.step++;
    x = h;
  }
  return x;
};

/** how long a step waits in the room (s) */
export const QARAVANI_SECS: Record<QPhase['k'], number> = { start: 150, turn: 90, second: 45, tickets: 75, tunnel: 45, end: 0 };

// ---------- the score ----------
const root = (up: number[], x: number): number => { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
const linked = (tracks: readonly number[]) => {
  const up = Array.from({ length: Q_CITY_COUNT }, (_, i) => i);
  for (const t of tracks) up[root(up, TRACKS[t].a)] = root(up, TRACKS[t].b);
  return (a: number, b: number) => root(up, a) === root(up, b);
};
export const ownedBy = (owner: readonly number[], p: number) => owner.flatMap((o, t) => (o === p ? [t] : []));
export const tracksOf = (g: QGame, p: number) => ownedBy(g.owner, p);
/** is a letter done by `p`'s own roads (the inns are counted only at the end) */
export const doneBy = (owner: readonly number[], p: number, id: number) => linked(ownedBy(owner, p))(TICKETS[id].a, TICKETS[id].b);
export const ticketDone = (g: QGame, p: number, id: number) => doneBy(g.owner, p, id);
/** the longest chain of one's own roads, in cells (a road once; a city may be passed again) */
export const longestOf = (tracks: readonly number[]) => {
  const adj = new Map<number, number[]>();
  tracks.forEach((t, i) => { for (const x of [TRACKS[t].a, TRACKS[t].b]) adj.set(x, [...(adj.get(x) ?? []), i]); });
  const used = tracks.map(() => false);
  let best = 0, budget = 400000;
  const walk = (x: number, len: number) => {
    if (len > best) best = len;
    if (--budget < 0) return;
    for (const i of adj.get(x) ?? []) {
      if (used[i]) continue;
      used[i] = true;
      const tr = TRACKS[tracks[i]];
      walk(tr.a === x ? tr.b : tr.a, len + tr.n);
      used[i] = false;
    }
  };
  for (const x of adj.keys()) walk(x, 0);
  return best;
};

export interface QRow {
  roads: number;
  tickets: { id: number; done: boolean }[];
  ticketPts: number;
  done: number;
  /** inns not built, and their points */
  innsLeft: number;
  innPts: number;
  /** the opponents' tracks the inns lend (the best choice for the letters) */
  borrowed: number[];
  longest: number;
  bonus: number;
  total: number;
}
export interface QResult { rows: QRow[]; order: number[]; winners: number[] }

/** the inns' best loans: each inn lends one of the opponents' roads out of its city (or none), the same for every letter */
const bestLoans = (g: QGame, p: number, own: number[]) => {
  const cities = g.inn.flatMap((o, x) => (o === p ? [x] : []));
  const options = cities.map(x => [-1, ...CITY_TRACKS[x].filter(t => g.owner[t] >= 0 && g.owner[t] !== p)]);
  const tickets = g.players[p].tickets;
  const value = (loan: number[]) => {
    const ok = linked([...own, ...loan.filter(t => t >= 0)]);
    return tickets.reduce((s, id) => s + (ok(TICKETS[id].a, TICKETS[id].b) ? TICKETS[id].v : -TICKETS[id].v), 0);
  };
  let best = options.map(() => -1), bestV = value(best);
  const walk = (i: number, cur: number[]) => {
    if (i === options.length) { const v = value(cur); if (v > bestV) { bestV = v; best = [...cur]; } return; }
    for (const t of options[i]) walk(i + 1, [...cur, t]);
  };
  walk(0, []);
  return best.filter(t => t >= 0);
};

export const resultOf = (g: QGame): QResult => {
  const rows = g.players.map((pl, p): QRow => {
    const own = tracksOf(g, p), borrowed = bestLoans(g, p, own), ok = linked([...own, ...borrowed]);
    const tickets = pl.tickets.map(id => ({ id, done: ok(TICKETS[id].a, TICKETS[id].b) }));
    const ticketPts = tickets.reduce((s, t) => s + (t.done ? TICKETS[t.id].v : -TICKETS[t.id].v), 0);
    return {
      roads: pl.pts, tickets, ticketPts, done: tickets.filter(t => t.done).length, innsLeft: pl.inns, innPts: pl.inns * INN_POINTS,
      borrowed, longest: longestOf(own), bonus: 0, total: 0,
    };
  });
  const top = Math.max(...rows.map(r => r.longest));
  for (const r of rows) {
    r.bonus = top > 0 && r.longest === top ? LONGEST_POINTS : 0;
    r.total = r.roads + r.ticketPts + r.innPts + r.bonus;
  }
  const rank = (a: QRow, b: QRow) => b.total - a.total || b.done - a.done || b.innsLeft - a.innsLeft || b.bonus - a.bonus;
  const order = rows.map((_, i) => i).sort((a, b) => rank(rows[a], rows[b]) || a - b);
  const winners = order.filter(i => rank(rows[i], rows[order[0]]) === 0);
  return { rows, order, winners };
};

// ---------- reading a kept game ----------
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ints = (v: unknown, lo: number, hi: number, len?: number): number[] | null =>
  (Array.isArray(v) && (len === undefined || v.length === len) && v.every(x => isInt(x, lo, hi)) ? (v as number[]) : null);
const TID = TICKETS.length - 1;

export const parseLine = (raw: unknown, n: number): QLine | null => {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  const p = isInt(o.p, 0, n - 1) ? o.p : -1;
  switch (o.k) {
    case 'cards': { const face = ints(o.face, 0, 8); return p >= 0 && face && face.length <= 2 && isInt(o.blind, 0, 2) ? { k: 'cards', p, face, blind: o.blind } : null; }
    case 'road': return p >= 0 && isInt(o.t, 0, TRACKS.length - 1) && isInt(o.c, 0, 8) && isInt(o.l, 0, 8) && isInt(o.extra, 0, 3) ? { k: 'road', p, t: o.t, c: o.c, l: o.l, extra: o.extra } : null;
    case 'tunnel': return p >= 0 && isInt(o.t, 0, TRACKS.length - 1) && isInt(o.extra, 0, 3) ? { k: 'tunnel', p, t: o.t, extra: o.extra } : null;
    case 'tickets': return p >= 0 && isInt(o.kept, 1, 3) && isInt(o.of, 1, 3) ? { k: 'tickets', p, kept: o.kept, of: o.of } : null;
    case 'start': return p >= 0 && isInt(o.kept, 2, 4) ? { k: 'start', p, kept: o.kept } : null;
    case 'inn': return p >= 0 && isInt(o.x, 0, Q_CITY_COUNT - 1) ? { k: 'inn', p, x: o.x } : null;
    case 'wash': return { k: 'wash' };
    case 'last': return p >= 0 ? { k: 'last', p } : null;
    case 'pass': return p >= 0 ? { k: 'pass', p } : null;
    default: return null;
  }
};
export const parseLog = (raw: unknown, n: number): QLine[] => (Array.isArray(raw) ? raw.map(x => parseLine(x, n)).filter((x): x is QLine => !!x).slice(-LOG_MAX) : []);

export const parsePhase = (raw: unknown, n: number): QPhase | null => {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  switch (o.k) {
    case 'start': {
      if (!Array.isArray(o.offer) || o.offer.length !== n || !Array.isArray(o.kept) || o.kept.length !== n) return null;
      const offer = o.offer.map(x => ints(x, 0, TID));
      const kept = o.kept.map(x => (x === null ? null : ints(x, 0, TID) ?? undefined));
      if (offer.some(x => !x || x.length < 2 || x.length > 4) || kept.some(x => x === undefined)) return null;
      return { k: 'start', offer: offer as number[][], kept: kept as (number[] | null)[] };
    }
    case 'turn': return { k: 'turn' };
    case 'second': { const face = ints(o.face, 0, 8); return face && face.length <= 1 && isInt(o.blind, 0, 1) ? { k: 'second', face, blind: o.blind } : null; }
    case 'tickets': { const offer = ints(o.offer, 0, TID); return offer && offer.length >= 1 && offer.length <= 3 ? { k: 'tickets', offer } : null; }
    case 'tunnel': {
      const drawn = ints(o.drawn, 0, 8);
      return isInt(o.t, 0, TRACKS.length - 1) && isInt(o.c, 0, 8) && isInt(o.l, 0, 8) && drawn && drawn.length <= 3 && isInt(o.extra, 1, 3)
        ? { k: 'tunnel', t: o.t, c: o.c, l: o.l, drawn, extra: o.extra } : null;
    }
    case 'end': return { k: 'end' };
    default: return null;
  }
};

export const parseQaravani = (raw: unknown): QGame | null => {
  const o = raw as Partial<QGame> | null;
  if (!o || typeof o !== 'object' || o.v !== 1 || !Array.isArray(o.players) || o.players.length < MIN_Q || o.players.length > MAX_Q) return null;
  const n = o.players.length;
  const players: QPlayer[] = [];
  for (const x of o.players as unknown[]) {
    const pl = x as Partial<QPlayer> | null;
    const hand = pl && ints(pl.hand, 0, 200, KINDS), tickets = pl && ints(pl.tickets, 0, TID);
    if (!pl || typeof pl.name !== 'string' || !hand || !tickets || !isInt(pl.carts, 0, 45) || !isInt(pl.inns, 0, INNS) || !isInt(pl.pts, 0, 2000)) return null;
    players.push({ name: pl.name.slice(0, 40), hand, tickets, carts: pl.carts, inns: pl.inns, pts: pl.pts });
  }
  const deck = ints(o.deck, 0, 8), pile = ints(o.pile, 0, 8), face = ints(o.face, -1, 8, FACE_N), tdeck = ints(o.tdeck, 0, TID);
  const owner = ints(o.owner, -1, n - 1, TRACKS.length), inn = ints(o.inn, -1, n - 1, Q_CITY_COUNT), phase = parsePhase(o.phase, n);
  if (!deck || !pile || !face || !tdeck || !owner || !inn || !phase || !isInt(o.turn, 0, n - 1) || !isInt(o.first, 0, n - 1)
    || !isInt(o.left, -1, MAX_Q) || !isInt(o.step, 0, 1e7) || !isInt(o.seed, -2147483648, 2147483647)) return null;
  return {
    v: 1, players, deck, pile, face, tdeck, owner, inn, turn: o.turn, first: o.first, phase, left: o.left,
    idle: isInt(o.idle, 0, MAX_Q) ? o.idle : 0, step: o.step, seed: o.seed, log: parseLog(o.log, n),
  };
};

/** every card of the game is somewhere (the tests' check): 110 */
export const cardsIn = (g: QGame) => g.deck.length + g.pile.length + g.face.filter(c => c >= 0).length
  + g.players.reduce((s, p) => s + p.hand.reduce((a, b) => a + b, 0), 0) + (g.phase.k === 'tunnel' ? g.phase.drawn.length : 0);
