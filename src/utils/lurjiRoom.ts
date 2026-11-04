import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import { shuffle } from './otkheuli';
import { LURJI_SECS, MAX_LURJI, MIN_LURJI, fromPick, keyOf, newLurji, parseLurji, take, timeUp, winnersOf, type LurjiGame } from './lurjiSupra';

// „ლურჯი სუფრა“ in a class's room (utils/gameRoom.ts): every player on their own phone, the host's phone holds the game and
// applies the takes. Nothing is hidden, so there are no seats: the view is the whole game (without the bag's random state).
// The room's opener may play too. A take not made in time is made by the host's phone (`timeUp`: the take that spills least);
// the evening's report stays a while, then the morning comes.

export interface LurjiOnline { g: LurjiGame; uids: string[]; t0: number }
export interface LurjiView {
  v: 1;
  key: string;
  g: LurjiGame;
  /** when the step began, on the host's clock, and how long it waits */
  t0: number;
  secs: number;
}
export type LurjiOpts = Record<string, never>;

/** the step's time starts again when the step changes */
const stamp = (s: LurjiOnline, g: LurjiGame, now = Date.now()): LurjiOnline => (g === s.g ? s : { ...s, g, t0: keyOf(g) === keyOf(s.g) ? s.t0 : now });

export const applyLurji = (s: LurjiOnline, seat: number, a: { key: string; pick: number | null }, now = Date.now()): LurjiOnline => {
  const g = s.g;
  if (a.key !== keyOf(g) || a.pick === null || !Number.isInteger(a.pick) || a.pick < 0 || g.phase.k !== 'take' || seat !== g.turn) return s;
  const t = fromPick(a.pick);
  return stamp(s, take(g, t.src, t.o, t.line), now);
};

export const lurjiTimeUp = (s: LurjiOnline, key: string, now = Date.now()): LurjiOnline => (keyOf(s.g) === key ? stamp(s, timeUp(s.g), now) : s);

export const lurjiView = (s: LurjiOnline): LurjiView => ({ v: 1, key: keyOf(s.g), g: { ...s.g, rng: 0 }, t0: s.t0, secs: LURJI_SECS[s.g.phase.k] });

export const startLurji = (players: { uid: string; name: string }[], rnd: () => number, now = Date.now()): LurjiOnline | null => {
  if (players.length < MIN_LURJI || players.length > MAX_LURJI) return null;
  const seated = shuffle(players, rnd);
  const g = newLurji({ names: seated.map(p => p.name), first: 0, rnd });
  return g ? { g, uids: seated.map(p => p.uid), t0: now } : null;
};

/** the same table once more: the one after the last game's winner begins */
export const againLurji = (s: LurjiOnline, rnd: () => number, now = Date.now()): LurjiOnline | null => {
  const w = winnersOf(s.g)[0] ?? -1;
  const g = newLurji({ names: s.g.names, first: (w + 1) % s.g.names.length, rnd });
  return g ? { g, uids: s.uids, t0: now } : null;
};

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const json = (raw: unknown): unknown => { if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return null; } };

export const parseLurjiState = (raw: unknown): LurjiOnline | null => {
  const o = json(raw) as Partial<LurjiOnline> | null;
  const g = o ? parseLurji(o.g) : null;
  if (!o || !g || !Array.isArray(o.uids) || o.uids.length !== g.names.length || !o.uids.every(u => typeof u === 'string')) return null;
  return { g, uids: o.uids, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0 };
};

export const parseLurjiView = (raw: unknown): LurjiView | null => {
  const o = json(raw) as Partial<LurjiView> | null;
  const g = o ? parseLurji(o.g) : null;
  if (!o || o.v !== 1 || typeof o.key !== 'string' || !g || !isInt(o.secs, 0, 600)) return null;
  return { v: 1, key: o.key.slice(0, 40), g, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0, secs: o.secs };
};

export const LURJI_ROOM: RoomEngine<LurjiOnline, LurjiView, null, LurjiOpts> = {
  games: ['lurji'],
  start: (players, _opts, rnd) => startLurji(players, rnd),
  uids: s => s.uids,
  key: s => keyOf(s.g),
  apply: (s, seat, a) => applyLurji(s, seat, a),
  view: lurjiView,
  over: s => s.g.phase.k === 'end',
  backable: () => false,
  again: (s, rnd) => againLurji(s, rnd),
  parseState: parseLurjiState,
  parseView: parseLurjiView,
};

/** the room's store, with the host's one move: the step's time is over or the host goes on (named by its key: a second call
 *  does nothing) */
export const lurjiRooms = (be: Backend) => createRooms(be, LURJI_ROOM, step => ({
  timeUp: (key: string) => step(s => lurjiTimeUp(s, key), false),
}));
export type LurjiRooms = ReturnType<typeof lurjiRooms>;
export type LurjiSnap = RoomSnap<LurjiOnline, LurjiView, null>;
