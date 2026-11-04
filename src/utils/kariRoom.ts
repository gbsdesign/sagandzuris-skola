import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import { shuffle } from './otkheuli';
import {
  ACTS, KARI_SECS, LOG_MAX, MAX_KARI, MIN_KARI, block, declare, doubt, keep, keyOf, lose, newKari, parseClaim, parseKari, parseLog, parsePhase, pass,
  timeUp, waitingOn, winnerOf,
  type Claim, type KariGame, type Line, type Phase, type Role,
} from './mepisKari';

// „მეფის კარი“ in a class's room (utils/gameRoom.ts): every player on their own phone, their two cards in their own seat; the
// host's phone holds the deck and applies the answers. The room's opener may play too (their phone shows them only their own
// cards). A step that waits on somebody is answered by the phone when its time is over (`timeUp`, KARI_SECS); the host never
// goes back — a card shown stays shown.

export interface KariOnline { g: KariGame; uids: string[]; t0: number }
export type PubPhase = Exclude<Phase, { k: 'swap' }> | { k: 'swap' };
export interface KariView {
  v: 1;
  key: string;
  names: string[];
  coins: number[];
  /** the cards each one still holds face down */
  cards: number[];
  shown: Role[][];
  turn: number;
  n: number;
  claim: Claim | null;
  phase: PubPhase;
  /** who is still to answer the window on now */
  waiting: number[];
  deck: number;
  log: Line[];
  /** when the step began, on the host's clock, and how long it waits */
  t0: number;
  secs: number;
  /** at the end: everyone's cards, the face-down ones turned */
  hands?: Role[][];
}
export interface KariSeat { hand: Role[]; drawn: Role[] }
export type KariOpts = Record<string, never>;

/** an answer's `pick`: an action at a seat (9 = nobody), a doubt or a pass, a block as a courtier, a card, the cards kept */
export const actPick = (act: number, target = -1) => act * 10 + (target < 0 ? 9 : target);
export const PASS = 0;
export const DOUBT = 1;
export const blockPick = (role: Role) => role + 1;

/** the step's time starts again when the step changes */
const stamp = (s: KariOnline, g: KariGame, now = Date.now()): KariOnline => (g === s.g ? s : { ...s, g, t0: keyOf(g) === keyOf(s.g) ? s.t0 : now });

export const applyKari = (s: KariOnline, seat: number, a: { key: string; pick: number | null }, now = Date.now()): KariOnline => {
  const g = s.g, ph = g.phase, p = a.pick;
  if (a.key !== keyOf(g) || p === null || !Number.isInteger(p)) return s;
  let next = g;
  if (ph.k === 'turn' && seat === g.turn) next = declare(g, Math.floor(p / 10), p % 10 === 9 ? -1 : p % 10);
  else if (ph.k === 'doubt') next = p === DOUBT ? doubt(g, seat) : p === PASS ? pass(g, seat) : g;
  else if (ph.k === 'block') next = p === PASS ? pass(g, seat) : block(g, seat, p - 1);
  else if (ph.k === 'lose') next = lose(g, seat, p);
  else if (ph.k === 'swap' && seat === g.turn) next = keep(g, p);
  return stamp(s, next, now);
};

export const kariTimeUp = (s: KariOnline, key: string, now = Date.now()): KariOnline => (keyOf(s.g) === key ? stamp(s, timeUp(s.g), now) : s);

export const kariView = (s: KariOnline): KariView => {
  const g = s.g, ph = g.phase;
  const over = ph.k === 'end';
  return {
    v: 1,
    key: keyOf(g),
    names: g.players.map(p => p.name),
    coins: g.players.map(p => p.coins),
    cards: g.players.map(p => p.hand.length),
    shown: g.players.map(p => p.shown),
    turn: g.turn,
    n: g.n,
    claim: g.claim,
    phase: ph.k === 'swap' ? { k: 'swap' } : ph,
    waiting: waitingOn(g),
    deck: g.deck.length,
    log: g.log,
    t0: s.t0,
    secs: KARI_SECS[ph.k],
    ...(over ? { hands: g.players.map(p => [...p.shown, ...(p.hand as Role[])]) } : {}),
  };
};

export const kariSeat = (s: KariOnline, seat: number): KariSeat => {
  const g = s.g, ph = g.phase;
  return { hand: (g.players[seat]?.hand ?? []) as Role[], drawn: ph.k === 'swap' && seat === g.turn ? ph.drawn : [] };
};

export const startKari = (players: { uid: string; name: string }[], rnd: () => number, now = Date.now()): KariOnline | null => {
  if (players.length < MIN_KARI || players.length > MAX_KARI) return null;
  const seated = shuffle(players, rnd);
  const g = newKari({ names: seated.map(p => p.name), rnd });
  return g ? { g, uids: seated.map(p => p.uid), t0: now } : null;
};

/** the same court once more: the winner begins (as the kit says) */
export const againKari = (s: KariOnline, rnd: () => number, now = Date.now()): KariOnline | null => {
  const w = winnerOf(s.g);
  const g = newKari({ names: s.g.players.map(p => p.name), first: w >= 0 ? w : undefined, rnd });
  return g ? { g, uids: s.uids, t0: now } : null;
};

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const roles = (v: unknown, max: number): Role[] | null => (Array.isArray(v) && v.length <= max && v.every(x => isInt(x, 0, 4)) ? (v as Role[]) : null);
const json = (raw: unknown): unknown => { if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch { return null; } };

export const parseKariState = (raw: unknown): KariOnline | null => {
  const o = json(raw) as Partial<KariOnline> | null;
  const g = o && !o.g?.paper ? parseKari(o.g) : null;
  if (!o || !g || !Array.isArray(o.uids) || o.uids.length !== g.players.length || !o.uids.every(u => typeof u === 'string')) return null;
  return { g, uids: o.uids, t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0 };
};

export const parseKariView = (raw: unknown): KariView | null => {
  const o = json(raw) as Partial<KariView> | null;
  if (!o || o.v !== 1 || typeof o.key !== 'string' || !Array.isArray(o.names) || o.names.length < MIN_KARI || o.names.length > MAX_KARI) return null;
  const n = o.names.length;
  const nums = (v: unknown, hi: number) => (Array.isArray(v) && v.length === n && v.every(x => isInt(x, 0, hi)) ? (v as number[]) : null);
  const coins = nums(o.coins, 1000), cards = nums(o.cards, 2);
  const shown = Array.isArray(o.shown) && o.shown.length === n ? o.shown.map(x => roles(x, 2)) : null;
  const phase = o.phase && (o.phase as { k?: string }).k === 'swap' ? { k: 'swap' as const } : parsePhase(o.phase, n);
  const claim = o.claim == null ? null : parseClaim(o.claim, n);
  const waiting = Array.isArray(o.waiting) && o.waiting.every(x => isInt(x, 0, n - 1)) ? o.waiting : null;
  if (!coins || !cards || !shown || shown.some(x => !x) || !phase || phase.k === 'proof' || (o.claim != null && !claim) || !waiting
    || !isInt(o.turn, 0, n - 1) || !isInt(o.n, 1, 100000) || !isInt(o.deck, 0, 20) || !isInt(o.secs, 0, 600)) return null;
  const hands = Array.isArray(o.hands) && o.hands.length === n ? o.hands.map(x => roles(x, 2) ?? []) : undefined;
  return {
    v: 1, key: o.key.slice(0, 40), names: o.names.map(x => String(x).slice(0, 120)), coins, cards, shown: shown as Role[][], turn: o.turn, n: o.n, claim,
    phase: phase as PubPhase, waiting, deck: o.deck, log: parseLog(o.log).slice(-LOG_MAX), t0: isInt(o.t0, 0, Number.MAX_SAFE_INTEGER) ? o.t0 : 0, secs: o.secs,
    ...(hands ? { hands } : {}),
  };
};

export const parseKariSeat = (raw: unknown): KariSeat | null => {
  const o = json(raw) as Partial<KariSeat> | null;
  const hand = o && roles(o.hand, 2), drawn = o && roles(o.drawn, 2);
  return hand && drawn ? { hand, drawn } : null;
};

export const KARI_ROOM: RoomEngine<KariOnline, KariView, KariSeat, KariOpts> = {
  games: ['kari'],
  start: (players, _opts, rnd) => startKari(players, rnd),
  uids: s => s.uids,
  key: s => keyOf(s.g),
  apply: (s, seat, a) => applyKari(s, seat, a),
  view: kariView,
  seat: kariSeat,
  over: s => s.g.phase.k === 'end',
  backable: () => false,
  again: (s, rnd) => againKari(s, rnd),
  parseState: parseKariState,
  parseView: parseKariView,
  parseSeat: parseKariSeat,
};

/** the room's store, with the host's one move: the step's time is over (named by its key: a second call does nothing) */
export const kariRooms = (be: Backend) => createRooms(be, KARI_ROOM, step => ({
  timeUp: (key: string) => step(s => kariTimeUp(s, key), false),
}));
export type KariRooms = ReturnType<typeof kariRooms>;
export type KariSnap = RoomSnap<KariOnline, KariView, KariSeat>;
/** the actions as the view names them */
export const actName = (act: number) => ACTS[act]?.name ?? '';
