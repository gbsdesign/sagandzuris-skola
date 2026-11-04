import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import { shuffle } from './otkheuli';
import { TAKHTI_SECS, applyPick, keyOf, newTakhti, parseTakhti, publicOf, timeUp, winnersOf, type TakhtiGame } from './oriTakhti';

// „ორი ტახტი“ in a class's room (utils/gameRoom.ts): the two thrones on their own phones, the host's phone holds the game and
// applies the moves. What lies face down, the later ages, the draft's second round and the box stay on the host's phone: the
// view is `publicOf` the game, the same for both, so there are no seats. The room's opener may play too. A move not made in
// time is made by the host's phone (`timeUp`: a free card thrown away, the first of a choice).

export interface TakhtiOnline { g: TakhtiGame; uids: string[]; t0: number }
export interface TakhtiView {
  v: 1;
  key: string;
  g: TakhtiGame;
  /** when the step began, on the host's clock, and how long it waits */
  t0: number;
  secs: number;
}
export type TakhtiOpts = Record<string, never>;

/** the step's time starts again when the step changes */
const stamp = (s: TakhtiOnline, g: TakhtiGame, now = Date.now()): TakhtiOnline => (g === s.g ? s : { ...s, g, t0: keyOf(g) === keyOf(s.g) ? s.t0 : now });

export const applyTakhti = (s: TakhtiOnline, seat: number, a: { key: string; pick: number | null }, now = Date.now()): TakhtiOnline => {
  if (a.key !== keyOf(s.g) || a.pick === null || seat !== s.g.turn || s.g.phase.k === 'end') return s;
  return stamp(s, applyPick(s.g, a.pick), now);
};

export const takhtiTimeUp = (s: TakhtiOnline, key: string, now = Date.now()): TakhtiOnline => (keyOf(s.g) === key ? stamp(s, timeUp(s.g), now) : s);

export const takhtiView = (s: TakhtiOnline): TakhtiView => ({ v: 1, key: keyOf(s.g), g: publicOf(s.g), t0: s.t0, secs: TAKHTI_SECS[s.g.phase.k] });

/** two players: who is west and who begins the draft by lot */
export const startTakhti = (players: { uid: string; name: string }[], rnd: () => number, now = Date.now()): TakhtiOnline | null => {
  if (players.length !== 2) return null;
  const seated = shuffle(players, rnd);
  const g = newTakhti({ names: seated.map(p => p.name), rnd });
  return g ? { g, uids: seated.map(p => p.uid), t0: now } : null;
};

/** the same two once more: the loser begins the draft (both shared it — by lot) */
export const againTakhti = (s: TakhtiOnline, rnd: () => number, now = Date.now()): TakhtiOnline | null => {
  const w = winnersOf(s.g);
  const g = newTakhti({ names: s.g.names, first: w.length === 1 ? 1 - w[0] : undefined, rnd });
  return g ? { g, uids: s.uids, t0: now } : null;
};

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const json = (raw: unknown): unknown => { if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return null; } };

export const parseTakhtiState = (raw: unknown): TakhtiOnline | null => {
  const o = json(raw) as Partial<TakhtiOnline> | null;
  const g = o ? parseTakhti(o.g) : null;
  if (!o || !g || !Array.isArray(o.uids) || o.uids.length !== 2 || !o.uids.every(u => typeof u === 'string')) return null;
  return { g, uids: o.uids, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0 };
};

export const parseTakhtiView = (raw: unknown): TakhtiView | null => {
  const o = json(raw) as Partial<TakhtiView> | null;
  const g = o ? parseTakhti(o.g) : null;
  if (!o || o.v !== 1 || typeof o.key !== 'string' || !g || !isInt(o.secs, 0, 600)) return null;
  return { v: 1, key: o.key.slice(0, 40), g, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0, secs: o.secs };
};

export const TAKHTI_ROOM: RoomEngine<TakhtiOnline, TakhtiView, null, TakhtiOpts> = {
  games: ['takhti'],
  start: (players, _opts, rnd) => startTakhti(players, rnd),
  uids: s => s.uids,
  key: s => keyOf(s.g),
  apply: (s, seat, a) => applyTakhti(s, seat, a),
  view: takhtiView,
  over: s => s.g.phase.k === 'end',
  backable: () => false,
  again: (s, rnd) => againTakhti(s, rnd),
  parseState: parseTakhtiState,
  parseView: parseTakhtiView,
};

/** the room's store, with the host's one move: the step's time is over (named by its key: a second call does nothing) */
export const takhtiRooms = (be: Backend) => createRooms(be, TAKHTI_ROOM, step => ({
  timeUp: (key: string) => step(s => takhtiTimeUp(s, key), false),
}));
export type TakhtiRooms = ReturnType<typeof takhtiRooms>;
export type TakhtiSnap = RoomSnap<TakhtiOnline, TakhtiView, null>;
