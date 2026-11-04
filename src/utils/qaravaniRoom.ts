import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import { shuffle } from './otkheuli';
import { MAX_Q, MIN_Q, QARAVANI_SECS, TRADE_PICK, applyPick, keyOf, newQaravani, parseQaravani, resultOf, timeUp, type QGame } from './qaravani';

// „ქარავანი“ in a class's room (utils/gameRoom.ts): every house on its own phone, the host's phone holds the game, rolls the dice
// (the game's seed) and applies the moves. Nothing is hidden but the next rolls, so there are no seats: the view is the whole game
// without its seed. The room's opener may play too. A turn not made in time is made by the host's phone (`timeUp`: the careful
// move). The clock runs a turn, not a step: moving a die keeps it.

export interface QOnline { g: QGame; uids: string[]; t0: number }
export interface QView {
  v: 1;
  key: string;
  g: QGame;
  /** when the turn began, on the host's clock, and how long it waits */
  t0: number;
  secs: number;
}
export type QOpts = Record<string, never>;

/** a turn's own key: the clock starts again only when it changes */
const turnKey = (g: QGame) => `${g.round}.${g.turn}.${g.phase.k}`;
const stamp = (s: QOnline, g: QGame, now = Date.now()): QOnline => (g === s.g ? s : { ...s, g, t0: turnKey(g) === turnKey(s.g) ? s.t0 : now });

export const applyQ = (s: QOnline, seat: number, a: { key: string; pick: number | null }, now = Date.now()): QOnline => {
  if (a.key !== keyOf(s.g) || a.pick === null || !Number.isInteger(a.pick) || seat !== s.g.turn) return s;
  return stamp(s, applyPick(s.g, seat, a.pick), now);
};

/** the turn's time is over: the host's phone moves for the house on turn until its turn is done */
export const qTimeUp = (s: QOnline, key: string, now = Date.now()): QOnline => {
  if (keyOf(s.g) !== key || s.g.phase.k === 'end') return s;
  let g = s.g;
  const k = turnKey(g);
  for (let i = 0; i < 12 && turnKey(g) === k && g.phase.k !== 'end'; i++) g = timeUp(g);
  if (turnKey(g) === k && g.phase.k === 'turn') g = applyPick(g, g.turn, TRADE_PICK);
  return stamp(s, g, now);
};

export const qView = (s: QOnline): QView => ({ v: 1, key: keyOf(s.g), g: { ...s.g, seed: 0 }, t0: s.t0, secs: QARAVANI_SECS[s.g.phase.k] });

export const startQ = (players: { uid: string; name: string }[], rnd: () => number, now = Date.now()): QOnline | null => {
  if (players.length < MIN_Q || players.length > MAX_Q) return null;
  const seated = shuffle(players, rnd);
  const g = newQaravani({ names: seated.map(p => p.name), first: 0, rnd });
  return g ? { g, uids: seated.map(p => p.uid), t0: now } : null;
};

/** the same houses once more: the one after the last game's winner goes first */
export const againQ = (s: QOnline, rnd: () => number, now = Date.now()): QOnline | null => {
  const w = resultOf(s.g).winners[0] ?? -1;
  const g = newQaravani({ names: s.g.players.map(p => p.name), first: (w + 1) % s.g.players.length, rnd });
  return g ? { g, uids: s.uids, t0: now } : null;
};

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const json = (raw: unknown): unknown => { if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return null; } };

export const parseQState = (raw: unknown): QOnline | null => {
  const o = json(raw) as Partial<QOnline> | null;
  const g = o ? parseQaravani(o.g) : null;
  if (!o || !g || !Array.isArray(o.uids) || o.uids.length !== g.players.length || !o.uids.every(u => typeof u === 'string')) return null;
  return { g, uids: o.uids, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0 };
};

export const parseQView = (raw: unknown): QView | null => {
  const o = json(raw) as Partial<QView> | null;
  const g = o ? parseQaravani(o.g) : null;
  if (!o || o.v !== 1 || typeof o.key !== 'string' || !g || !isInt(o.secs, 0, 600)) return null;
  return { v: 1, key: o.key.slice(0, 40), g, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0, secs: o.secs };
};

export const QARAVANI_ROOM: RoomEngine<QOnline, QView, null, QOpts> = {
  games: ['qaravani'],
  start: (players, _opts, rnd) => startQ(players, rnd),
  uids: s => s.uids,
  key: s => keyOf(s.g),
  apply: (s, seat, a) => applyQ(s, seat, a),
  view: qView,
  over: s => s.g.phase.k === 'end',
  backable: () => false,
  again: (s, rnd) => againQ(s, rnd),
  parseState: parseQState,
  parseView: parseQView,
};

/** the room's store, with the host's one move: the turn's time is over (named by its key: a second call does nothing) */
export const qaravaniRooms = (be: Backend) => createRooms(be, QARAVANI_ROOM, step => ({
  timeUp: (key: string) => step(s => qTimeUp(s, key), false),
}));
export type QaravaniRooms = ReturnType<typeof qaravaniRooms>;
export type QaravaniSnap = RoomSnap<QOnline, QView, null>;
