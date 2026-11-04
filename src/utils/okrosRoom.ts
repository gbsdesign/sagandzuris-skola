import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import { shuffle } from './otkheuli';
import { MAX_OK, MIN_OK, applyPick, botPick, keyOf, newOkros, parseOkros, rank, type OkrosGame } from './okrosKhana';

// „ოქროს ხანა“ in a class's room (utils/gameRoom.ts): every house on its own phone, the host's phone holds the game and applies
// the moves. Nothing is hidden but the next draws (the random seed), so there are no seats: the view is the whole game. The
// room's opener may play too. A move not made in time is made by the host's phone (`timeUp`: the careful bot's move).

export interface OkrosOnline { g: OkrosGame; uids: string[]; t0: number }
export interface OkrosView {
  v: 1;
  key: string;
  g: OkrosGame;
  /** when the step began, on the host's clock, and how long it waits */
  t0: number;
  secs: number;
}
export type OkrosOpts = Record<string, never>;
/** a step's time: the ride, the deed (0: none) */
export const OKROS_SECS = { move: 75, act: 60, end: 0 } as const;

const stamp = (s: OkrosOnline, g: OkrosGame, now = Date.now()): OkrosOnline => (g === s.g ? s : { ...s, g, t0: keyOf(g) === keyOf(s.g) ? s.t0 : now });

export const applyOkros = (s: OkrosOnline, seat: number, a: { key: string; pick: number | null }, now = Date.now()): OkrosOnline => {
  if (a.key !== keyOf(s.g) || a.pick === null || !Number.isInteger(a.pick) || seat !== s.g.turn) return s;
  return stamp(s, applyPick(s.g, seat, a.pick), now);
};

/** the step's time is over: the host's phone moves for the house on turn */
export const okrosTimeUp = (s: OkrosOnline, key: string, now = Date.now()): OkrosOnline => {
  if (keyOf(s.g) !== key || s.g.phase.k === 'end') return s;
  return stamp(s, applyPick(s.g, s.g.turn, botPick(s.g)), now);
};

export const okrosView = (s: OkrosOnline): OkrosView => ({ v: 1, key: keyOf(s.g), g: { ...s.g, rng: 0 }, t0: s.t0, secs: OKROS_SECS[s.g.phase.k] });

export const startOkros = (players: { uid: string; name: string }[], rnd: () => number, now = Date.now()): OkrosOnline | null => {
  if (players.length < MIN_OK || players.length > MAX_OK) return null;
  const seated = shuffle(players, rnd);
  const g = newOkros({ names: seated.map(p => p.name), first: 0, rnd });
  return g ? { g, uids: seated.map(p => p.uid), t0: now } : null;
};

/** the same houses once more: the one after the last game's winner rides first */
export const againOkros = (s: OkrosOnline, rnd: () => number, now = Date.now()): OkrosOnline | null => {
  const w = rank(s.g).winners[0] ?? -1;
  const g = newOkros({ names: s.g.players.map(p => p.name), first: (w + 1) % s.g.players.length, rnd });
  return g ? { g, uids: s.uids, t0: now } : null;
};

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const json = (raw: unknown): unknown => { if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return null; } };

export const parseOkrosState = (raw: unknown): OkrosOnline | null => {
  const o = json(raw) as Partial<OkrosOnline> | null;
  const g = o ? parseOkros(o.g) : null;
  if (!o || !g || !Array.isArray(o.uids) || o.uids.length !== g.players.length || !o.uids.every(u => typeof u === 'string')) return null;
  return { g, uids: o.uids, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0 };
};

export const parseOkrosView = (raw: unknown): OkrosView | null => {
  const o = json(raw) as Partial<OkrosView> | null;
  const g = o ? parseOkros(o.g) : null;
  if (!o || o.v !== 1 || typeof o.key !== 'string' || !g || !isInt(o.secs, 0, 600)) return null;
  return { v: 1, key: o.key.slice(0, 40), g, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0, secs: o.secs };
};

export const OKROS_ROOM: RoomEngine<OkrosOnline, OkrosView, null, OkrosOpts> = {
  games: ['okros'],
  start: (players, _opts, rnd) => startOkros(players, rnd),
  uids: s => s.uids,
  key: s => keyOf(s.g),
  apply: (s, seat, a) => applyOkros(s, seat, a),
  view: okrosView,
  over: s => s.g.phase.k === 'end',
  backable: () => false,
  again: (s, rnd) => againOkros(s, rnd),
  parseState: parseOkrosState,
  parseView: parseOkrosView,
};

/** the room's store, with the host's one move: the step's time is over (named by its key: a second call does nothing) */
export const okrosRooms = (be: Backend) => createRooms(be, OKROS_ROOM, step => ({
  timeUp: (key: string) => step(s => okrosTimeUp(s, key), false),
}));
export type OkrosRooms = ReturnType<typeof okrosRooms>;
export type OkrosSnap = RoomSnap<OkrosOnline, OkrosView, null>;
