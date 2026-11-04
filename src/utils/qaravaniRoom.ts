import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import { shuffle } from './otkheuli';
import {
  FACE_N, GRAY, INNS, KINDS, LOG_MAX, MAX_Q, MIN_Q, QARAVANI_SECS, TICKETS, TRACKS, applyPick, keyOf, newQaravani, parseLog, parseQaravani,
  payments, resultOf, roadOpen, timeUp, waitingOn,
  type Pay, type QGame, type QLine, type QPhase, type QResult,
} from './qaravani';
import { Q_CITY_COUNT } from '../data/qaravaniRoutes';

// „ქარავანი“ in a class's room (utils/gameRoom.ts): every caravan on its own phone, its cards and letters in its own seat; the
// host's phone holds the decks and applies the moves. The view tells everyone what lies on the table: the roads, the inns, the
// face-up cards and how many cards and letters each one holds; at the end every letter and the score. The room's opener may play
// too. A step not answered in time is answered by the host's phone (`timeUp`). The one phone of the hybrid shows the same view
// and seat (`qView`, `qSeat`), so both variants share their screens.

export interface QOnline { g: QGame; uids: string[]; t0: number }
export type QPubPhase =
  | { k: 'start'; kept: boolean[] }
  | { k: 'turn' }
  | { k: 'second'; face: number[]; blind: number }
  | { k: 'tickets'; n: number }
  | Extract<QPhase, { k: 'tunnel' }>
  | { k: 'end' };
export interface QView {
  v: 1;
  key: string;
  names: string[];
  /** how many cards and letters each one holds */
  cards: number[];
  tickets: number[];
  carts: number[];
  inns: number[];
  pts: number[];
  owner: number[];
  inn: number[];
  face: number[];
  deck: number;
  pile: number;
  tdeck: number;
  turn: number;
  phase: QPubPhase;
  left: number;
  waiting: number[];
  log: QLine[];
  /** when the step began, on the host's clock, and how long it waits */
  t0: number;
  secs: number;
  /** at the end: everyone's letters and the score */
  end?: { letters: number[][]; result: QResult };
}
export interface QSeat { hand: number[]; tickets: number[]; offer: number[] }
export type QOpts = Record<string, never>;

const pubPhase = (ph: QPhase): QPubPhase =>
  ph.k === 'start' ? { k: 'start', kept: ph.kept.map(Boolean) } : ph.k === 'tickets' ? { k: 'tickets', n: ph.offer.length } : ph;

export const qView = (s: QOnline): QView => {
  const g = s.g, over = g.phase.k === 'end';
  return {
    v: 1,
    key: keyOf(g),
    names: g.players.map(p => p.name),
    cards: g.players.map(p => p.hand.reduce((a, b) => a + b, 0)),
    tickets: g.players.map(p => p.tickets.length),
    carts: g.players.map(p => p.carts),
    inns: g.players.map(p => p.inns),
    pts: g.players.map(p => p.pts),
    owner: g.owner,
    inn: g.inn,
    face: g.face,
    deck: g.deck.length,
    pile: g.pile.length,
    tdeck: g.tdeck.length,
    turn: g.turn,
    phase: pubPhase(g.phase),
    left: g.left,
    waiting: waitingOn(g),
    log: g.log,
    t0: s.t0,
    secs: QARAVANI_SECS[g.phase.k],
    ...(over ? { end: { letters: g.players.map(p => p.tickets), result: resultOf(g) } } : {}),
  };
};

export const qSeat = (s: QOnline, seat: number): QSeat => {
  const g = s.g, ph = g.phase, pl = g.players[seat];
  const offer = ph.k === 'start' && !ph.kept[seat] ? ph.offer[seat] : ph.k === 'tickets' && g.turn === seat ? ph.offer : [];
  return { hand: pl?.hand ?? Array(KINDS).fill(0), tickets: pl?.tickets ?? [], offer: offer ?? [] };
};

/** what this phone's player (`me`, holding `hand`) may pay for road `t` now — asked of the view, as the screens see the game */
export const roadPays = (v: QView, hand: readonly number[], me: number, t: number): Pay[] =>
  (me >= 0 && roadOpen(v.owner, v.carts[me], v.names.length, me, t) ? payments(hand, TRACKS[t].n, TRACKS[t].color, TRACKS[t].ships) : []);
/** and for an inn in city `x` (1, 2, 3 cards of one colour) */
export const innPays = (v: QView, hand: readonly number[], me: number, x: number): Pay[] =>
  (me >= 0 && v.inns[me] > 0 && v.inn[x] === -1 ? payments(hand, INNS - v.inns[me] + 1, GRAY) : []);
/** may this player do anything but pass on their turn? */
export const canMove = (v: QView, hand: readonly number[], me: number) => v.deck + v.pile > 0 || v.face.some(c => c >= 0) || v.tdeck > 0
  || TRACKS.some((_, t) => roadPays(v, hand, me, t).length > 0) || v.inn.some((_, x) => innPays(v, hand, me, x).length > 0);

/** the step's time starts again when the step changes */
const stamp = (s: QOnline, g: QGame, now = Date.now()): QOnline => (g === s.g ? s : { ...s, g, t0: keyOf(g) === keyOf(s.g) ? s.t0 : now });

export const applyQ = (s: QOnline, seat: number, a: { key: string; pick: number | null }, now = Date.now()): QOnline =>
  (a.key !== keyOf(s.g) || a.pick === null ? s : stamp(s, applyPick(s.g, seat, a.pick), now));

export const qTimeUp = (s: QOnline, key: string, now = Date.now()): QOnline => (keyOf(s.g) === key ? stamp(s, timeUp(s.g), now) : s);

export const startQ = (players: { uid: string; name: string }[], rnd: () => number, now = Date.now()): QOnline | null => {
  if (players.length < MIN_Q || players.length > MAX_Q) return null;
  const seated = shuffle(players, rnd);
  const g = newQaravani({ names: seated.map(p => p.name), first: 0, rnd });
  return g ? { g, uids: seated.map(p => p.uid), t0: now } : null;
};

/** the same caravans once more: the one after the winner begins */
export const againQ = (s: QOnline, rnd: () => number, now = Date.now()): QOnline | null => {
  const w = s.g.phase.k === 'end' ? resultOf(s.g).order[0] : -1;
  const g = newQaravani({ names: s.g.players.map(p => p.name), first: w >= 0 ? (w + 1) % s.g.players.length : undefined, rnd });
  return g ? { g, uids: s.uids, t0: now } : null;
};

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ints = (v: unknown, lo: number, hi: number, len?: number): number[] | null =>
  (Array.isArray(v) && (len === undefined || v.length === len) && v.every(x => isInt(x, lo, hi)) ? (v as number[]) : null);
const json = (raw: unknown): unknown => { if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return null; } };
const TID = TICKETS.length - 1;

export const parseQState = (raw: unknown): QOnline | null => {
  const o = json(raw) as Partial<QOnline> | null;
  const g = o ? parseQaravani(o.g) : null;
  if (!o || !g || !Array.isArray(o.uids) || o.uids.length !== g.players.length || !o.uids.every(u => typeof u === 'string')) return null;
  return { g, uids: o.uids, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0 };
};

const parsePub = (raw: unknown, n: number): QPubPhase | null => {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  switch (o.k) {
    case 'start': return Array.isArray(o.kept) && o.kept.length === n ? { k: 'start', kept: o.kept.map(Boolean) } : null;
    case 'turn': return { k: 'turn' };
    case 'second': { const face = ints(o.face, 0, 8); return face && face.length <= 1 && isInt(o.blind, 0, 1) ? { k: 'second', face, blind: o.blind } : null; }
    case 'tickets': return isInt(o.n, 1, 3) ? { k: 'tickets', n: o.n } : null;
    case 'tunnel': {
      const drawn = ints(o.drawn, 0, 8);
      return isInt(o.t, 0, TRACKS.length - 1) && isInt(o.c, 0, 8) && isInt(o.l, 0, 8) && drawn && drawn.length <= 3 && isInt(o.extra, 1, 3)
        ? { k: 'tunnel', t: o.t, c: o.c, l: o.l, drawn, extra: o.extra } : null;
    }
    case 'end': return { k: 'end' };
    default: return null;
  }
};

const parseResult = (raw: unknown, n: number): QResult | null => {
  const o = raw as Partial<QResult> | null;
  if (!o || !Array.isArray(o.rows) || o.rows.length !== n) return null;
  const rows = o.rows.map(r => {
    const x = r as unknown as Record<string, unknown>;
    const tickets = Array.isArray(x.tickets) ? x.tickets.flatMap(t => {
      const y = t as { id?: unknown; done?: unknown };
      return isInt(y.id, 0, TID) ? [{ id: y.id, done: !!y.done }] : [];
    }) : [];
    const num = (k: string) => (isInt(x[k], -5000, 5000) ? (x[k] as number) : 0);
    return {
      roads: num('roads'), tickets, ticketPts: num('ticketPts'), done: num('done'), innsLeft: num('innsLeft'), innPts: num('innPts'),
      borrowed: ints(x.borrowed, 0, TRACKS.length - 1) ?? [], longest: num('longest'), bonus: num('bonus'), total: num('total'),
    };
  });
  const order = ints(o.order, 0, n - 1, n), winners = ints(o.winners, 0, n - 1);
  return order && winners && winners.length ? { rows, order, winners } : null;
};

export const parseQView = (raw: unknown): QView | null => {
  const o = json(raw) as Partial<QView> | null;
  if (!o || o.v !== 1 || typeof o.key !== 'string' || !Array.isArray(o.names) || o.names.length < MIN_Q || o.names.length > MAX_Q) return null;
  const n = o.names.length;
  const per = (v: unknown, hi: number) => ints(v, 0, hi, n);
  const cards = per(o.cards, 200), tickets = per(o.tickets, 46), carts = per(o.carts, 45), inns = per(o.inns, 3), pts = per(o.pts, 2000);
  const owner = ints(o.owner, -1, n - 1, TRACKS.length), inn = ints(o.inn, -1, n - 1, Q_CITY_COUNT), face = ints(o.face, -1, 8, FACE_N);
  const phase = parsePub(o.phase, n), waiting = ints(o.waiting, 0, n - 1);
  if (!cards || !tickets || !carts || !inns || !pts || !owner || !inn || !face || !phase || !waiting || !isInt(o.deck, 0, 110) || !isInt(o.pile, 0, 110)
    || !isInt(o.tdeck, 0, 46) || !isInt(o.turn, 0, n - 1) || !isInt(o.left, -1, MAX_Q) || !isInt(o.secs, 0, 600)) return null;
  let end: QView['end'];
  if (o.end) {
    const letters = Array.isArray(o.end.letters) && o.end.letters.length === n ? o.end.letters.map(x => ints(x, 0, TID) ?? []) : null;
    const result = parseResult(o.end.result, n);
    if (letters && result) end = { letters, result };
  }
  return {
    v: 1, key: o.key.slice(0, 40), names: o.names.map(x => String(x).slice(0, 120)), cards, tickets, carts, inns, pts, owner, inn, face,
    deck: o.deck, pile: o.pile, tdeck: o.tdeck, turn: o.turn, phase, left: o.left, waiting, log: parseLog(o.log, n).slice(-LOG_MAX),
    t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0, secs: o.secs, ...(end ? { end } : {}),
  };
};

export const parseQSeat = (raw: unknown): QSeat | null => {
  const o = json(raw) as Partial<QSeat> | null;
  const hand = o && ints(o.hand, 0, 200, KINDS), tickets = o && ints(o.tickets, 0, TID), offer = o && ints(o.offer, 0, TID);
  return hand && tickets && offer && offer.length <= 4 ? { hand, tickets, offer } : null;
};

export const QARAVANI_ROOM: RoomEngine<QOnline, QView, QSeat, QOpts> = {
  games: ['qaravani'],
  start: (players, _opts, rnd) => startQ(players, rnd),
  uids: s => s.uids,
  key: s => keyOf(s.g),
  apply: (s, seat, a) => applyQ(s, seat, a),
  view: qView,
  seat: qSeat,
  over: s => s.g.phase.k === 'end',
  backable: () => false,
  again: (s, rnd) => againQ(s, rnd),
  parseState: parseQState,
  parseView: parseQView,
  parseSeat: parseQSeat,
};

/** the room's store, with the host's one move: the step's time is over (named by its key: a second call does nothing) */
export const qaravaniRooms = (be: Backend) => createRooms(be, QARAVANI_ROOM, step => ({
  timeUp: (key: string) => step(s => qTimeUp(s, key), false),
}));
export type QaravaniRooms = ReturnType<typeof qaravaniRooms>;
export type QaravaniSnap = RoomSnap<QOnline, QView, QSeat>;
