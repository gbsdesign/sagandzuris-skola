import type { Act, RoomEngine, RoomGame } from './gameRoom';
import { KUTKHE_RULES, type KutkheQ } from './kutkhe';
import { OTKHI_RULES, type OtkhiQ } from './otkhi';
import { KHMEBI_RULES, NOTEBI_RULES, type ChantRoundQ } from './chantRounds';

// The quick games of a class's room (2026-10-31, the tender's five — the user's „გააკეთე 5-ვე ონლაინ და ჰიბრიდული“):
// one engine of rounds. A round asks one thing — a song to place on the map, a question, a chant revealed voice by voice,
// a phrase to sing — in one or more steps; every player answers once, on their own phone; the host (წამყვანი, who does
// not play) reveals it, the points are counted, the next round comes. Each game's own part is its `RoundRules`: how many
// steps, how long each, what an answer earns and what the players may not see before the reveal. The room around it:
// utils/gameRoom.ts; the screens: pages/games/rounds/. The hybrid game (one phone, the class in teams) is in this file
// too: the same rounds, the host marks each team.

export type RoundGame = Exclude<RoomGame, 'samshvilde'>;
export const ROUND_GAMES: readonly RoundGame[] = ['kutkhe', 'otkhi', 'khmebi', 'notebi', 'turniri'];
/** one round's content, by game (the answer included: `secret` keeps it from the players until the reveal) */
export type RoundQ = KutkheQ | OtkhiQ | ChantRoundQ;

export interface RoundAnswer { pick: number; ms: number; step: number }

export interface RoundRules<Q extends RoundQ> {
  steps(q: Q): number;
  /** a step's time */
  seconds(q: Q, step: number): number;
  /** a pick that can be an answer at all */
  ok(q: Q, pick: number): boolean;
  /** what an answer earns (0 — not right); `limitMs` — the time of the step it came in */
  points(q: Q, a: RoundAnswer, limitMs: number): number;
  /** the fields the players do not see while it is asked */
  secret: readonly (keyof Q)[];
  /** a round read back from the host's own JSON */
  valid(q: unknown): q is Q;
}

/** each game's rules by its rounds' kind (a game not built yet has none, so its rounds are never read back) */
const BY_KIND: { [K in RoundQ['kind']]: RoundRules<Extract<RoundQ, { kind: K }>> } = {
  kutkhe: KUTKHE_RULES, otkhi: OTKHI_RULES, khmebi: KHMEBI_RULES, notebi: NOTEBI_RULES,
};
const RULES = BY_KIND as unknown as Record<string, RoundRules<RoundQ> | undefined>;
export const rulesOf = (q: RoundQ): RoundRules<RoundQ> => RULES[q.kind]!;

export type Sound = 'all' | 'host';
export type RoundPhase = 'ask' | 'reveal' | 'end';
export interface RoundPlayer { uid: string; name: string; score: number }

export const MAX_ROUND_PLAYERS = 40;
export const ROUND_COUNTS = [5, 8, 12];

export interface RoundsOpts { game: RoundGame; rounds: RoundQ[]; sound: Sound; now?: number }

export interface RoundsState {
  v: 1;
  game: RoundGame;
  /** the game's number in its room: one more game with the same players starts n + 1, so no key comes back */
  n: number;
  players: RoundPlayer[];
  rounds: RoundQ[];
  /** the round on now */
  at: number;
  phase: RoundPhase;
  /** while asking: the step on now, from 1 */
  step: number;
  /** when the step began, by the host's clock */
  t0: number;
  /** this round's answers, by seat */
  answers: (RoundAnswer | null)[];
  /** this round's points, by seat (known at the reveal) */
  gained: number[];
  /** the sound plays on every phone (from home) or only on the host's (in one room) */
  sound: Sound;
}

/** the step the players are in: an answer names it (its round and step), so a late one never lands on the next round */
export const roundKey = (s: Pick<RoundsState, 'n' | 'at' | 'phase' | 'step'>) => `${s.n}.${s.at}.${s.phase}.${s.step}`;
const parseKey = (key: string) => {
  const m = /^(\d+)\.(\d+)\.ask\.(\d+)$/.exec(key);
  return m ? { n: +m[1], at: +m[2], step: +m[3] } : null;
};

const fresh = (s: RoundsState, at: number, now: number): RoundsState => ({
  ...s, at, phase: 'ask', step: 1, t0: now, answers: s.players.map(() => null), gained: s.players.map(() => 0),
});

export const newRounds = (players: { uid: string; name: string }[], opts: RoundsOpts): RoundsState | null => {
  const rounds = opts.rounds.filter(q => q.kind === opts.game);
  if (!players.length || players.length > MAX_ROUND_PLAYERS || !rounds.length) return null;
  const s: RoundsState = {
    v: 1, game: opts.game, n: 1, players: players.map(p => ({ uid: p.uid, name: p.name, score: 0 })), rounds,
    at: 0, phase: 'ask', step: 1, t0: 0, answers: [], gained: [], sound: opts.sound,
  };
  return fresh(s, 0, opts.now ?? Date.now());
};

/** the same players, new rounds, the scores from nought */
export const againRounds = (s: RoundsState, rounds: RoundQ[], now = Date.now()): RoundsState | null => {
  const list = rounds.filter(q => q.kind === s.game);
  if (!list.length) return null;
  return fresh({ ...s, n: s.n + 1, rounds: list, players: s.players.map(p => ({ ...p, score: 0 })) }, 0, now);
};

export const stepsOf = (s: RoundsState) => rulesOf(s.rounds[s.at]).steps(s.rounds[s.at]);
export const secondsOf = (s: RoundsState, step = s.step) => rulesOf(s.rounds[s.at]).seconds(s.rounds[s.at], step);
export const allAnswered = (s: RoundsState) => s.answers.every(Boolean);

/** the reveal: everybody's points for the round are counted */
export const revealRound = (s: RoundsState): RoundsState => {
  if (s.phase !== 'ask') return s;
  const q = s.rounds[s.at];
  const r = rulesOf(q);
  const gained = s.answers.map(a => (a ? Math.max(0, Math.round(r.points(q, a, r.seconds(q, a.step) * 1000))) : 0));
  return { ...s, phase: 'reveal', gained, players: s.players.map((p, i) => ({ ...p, score: p.score + gained[i] })) };
};

/** the next step of the round (its time over, or the host moved on); after the last one, the reveal */
export const nextStep = (s: RoundsState, now = Date.now()): RoundsState => {
  if (s.phase !== 'ask') return s;
  return s.step < stepsOf(s) ? { ...s, step: s.step + 1, t0: now } : revealRound(s);
};

export const nextRound = (s: RoundsState, now = Date.now()): RoundsState => {
  if (s.phase === 'ask') return s;
  if (s.phase === 'end') return s;
  return s.at + 1 < s.rounds.length ? fresh(s, s.at + 1, now) : { ...s, phase: 'end' };
};

/** a player's answer: once a round, only while it is asked; the last one in reveals the round */
export const answerRound = (s: RoundsState, seat: number, a: Act): RoundsState => {
  const k = parseKey(a.key);
  if (s.phase !== 'ask' || !k || k.n !== s.n || k.at !== s.at || k.step < 1 || k.step > s.step) return s;
  if (seat < 0 || seat >= s.players.length || s.answers[seat] || a.pick === null) return s;
  const q = s.rounds[s.at];
  if (!rulesOf(q).ok(q, a.pick)) return s;
  const limit = rulesOf(q).seconds(q, k.step) * 1000;
  const ms = Math.min(limit, Math.max(0, Math.round(a.ms ?? limit)));
  const answers = s.answers.map((x, i) => (i === seat ? { pick: a.pick!, ms, step: k.step } : x));
  const next = { ...s, answers };
  return allAnswered(next) ? revealRound(next) : next;
};

/** places by score (equal scores share a place) */
export const placesOf = (scores: number[]) => scores.map(x => 1 + scores.filter(o => o > x).length);

// ——— what everybody sees

export type PublicQ = Partial<RoundQ> & Pick<RoundQ, 'kind'>;

export interface RoundsView {
  v: 1;
  game: RoundGame;
  key: string;
  n: number;
  at: number;
  total: number;
  phase: RoundPhase;
  step: number;
  steps: number;
  /** the step's start (the host's clock) and its time */
  t0: number;
  secs: number;
  sound: Sound;
  /** the round, its answer taken out while it is asked */
  q: PublicQ;
  names: string[];
  scores: number[];
  /** who has answered this round (not what) */
  answered: boolean[];
  /** at the reveal: what each one answered, at which step, and what it earned */
  picks: (number | null)[] | null;
  pickSteps: (number | null)[] | null;
  gained: number[] | null;
}

export const publicView = (s: RoundsState): RoundsView => {
  const q = s.rounds[s.at];
  const open = s.phase !== 'ask';
  const shown: PublicQ = { ...q };
  if (!open) for (const k of rulesOf(q).secret) delete (shown as Record<string, unknown>)[k as string];
  return {
    v: 1, game: s.game, key: roundKey(s), n: s.n, at: s.at, total: s.rounds.length, phase: s.phase, step: s.step,
    steps: stepsOf(s), t0: s.t0, secs: secondsOf(s), sound: s.sound, q: shown,
    names: s.players.map(p => p.name), scores: s.players.map(p => p.score),
    answered: s.answers.map(Boolean),
    picks: open ? s.answers.map(a => a?.pick ?? null) : null,
    pickSteps: open ? s.answers.map(a => a?.step ?? null) : null,
    gained: open ? s.gained : null,
  };
};

// ——— the documents back (the host's phone wrote them as JSON)

const obj = (raw: unknown): Record<string, unknown> | null => {
  if (typeof raw !== 'string' || !raw) return null;
  try { const o = JSON.parse(raw); return o && typeof o === 'object' && !Array.isArray(o) ? o : null; } catch { return null; }
};
const isInt = (x: unknown): x is number => Number.isInteger(x);
const GAMES: readonly string[] = ROUND_GAMES;
const PHASES: readonly string[] = ['ask', 'reveal', 'end'];
const isQ = (q: unknown): q is RoundQ => !!q && typeof q === 'object' && typeof (q as RoundQ).kind === 'string' && !!RULES[(q as RoundQ).kind]?.valid(q);

export const parseRoundsState = (raw: unknown): RoundsState | null => {
  const o = obj(raw);
  if (!o || o.v !== 1 || !GAMES.includes(String(o.game)) || !PHASES.includes(String(o.phase))) return null;
  const players = Array.isArray(o.players) ? (o.players as RoundPlayer[]).filter(p => p && typeof p.uid === 'string' && typeof p.name === 'string' && isInt(p.score)) : [];
  const rounds = Array.isArray(o.rounds) ? (o.rounds as unknown[]).filter(isQ) : [];
  if (!players.length || !rounds.length || !isInt(o.at) || o.at < 0 || o.at >= rounds.length || !isInt(o.n) || !isInt(o.step) || !isInt(o.t0)) return null;
  const answers = Array.isArray(o.answers) && o.answers.length === players.length
    ? (o.answers as (RoundAnswer | null)[]).map(a => (a && isInt(a.pick) && isInt(a.ms) && isInt(a.step) ? a : null)) : players.map(() => null);
  const gained = Array.isArray(o.gained) && o.gained.length === players.length && o.gained.every(isInt) ? (o.gained as number[]) : players.map(() => 0);
  return {
    v: 1, game: o.game as RoundGame, n: o.n, players, rounds, at: o.at, phase: o.phase as RoundPhase, step: Math.max(1, o.step), t0: o.t0,
    answers, gained, sound: o.sound === 'host' ? 'host' : 'all',
  };
};

export const parseRoundsView = (raw: unknown): RoundsView | null => {
  const o = obj(raw);
  if (!o || o.v !== 1 || !GAMES.includes(String(o.game)) || !PHASES.includes(String(o.phase)) || typeof o.key !== 'string') return null;
  if (!Array.isArray(o.names) || !o.names.every(n => typeof n === 'string') || !Array.isArray(o.scores) || o.scores.length !== o.names.length) return null;
  const q = o.q as PublicQ | undefined;
  if (!q || typeof q !== 'object' || typeof q.kind !== 'string') return null;
  const v = o as unknown as RoundsView;
  const list = <T,>(x: unknown, n: number): T[] | null => (Array.isArray(x) && x.length === n ? (x as T[]) : null);
  return {
    ...v,
    answered: list<boolean>(v.answered, v.names.length) ?? v.names.map(() => false),
    picks: list<number | null>(v.picks, v.names.length),
    pickSteps: list<number | null>(v.pickSteps, v.names.length),
    gained: list<number>(v.gained, v.names.length),
  };
};

export const ROUNDS_ROOM: RoomEngine<RoundsState, RoundsView, never, RoundsOpts> = {
  games: ROUND_GAMES,
  start: (players, opts) => newRounds(players, opts),
  uids: s => s.players.map(p => p.uid),
  key: roundKey,
  apply: answerRound,
  view: publicView,
  over: s => s.phase === 'end',
  backable: () => false,
  parseState: parseRoundsState,
  parseView: parseRoundsView,
};

// ——— the hybrid game: one phone, the class in teams; the host marks what each team earned

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export interface HybridState {
  v: 1;
  game: RoundGame;
  teams: string[];
  rounds: RoundQ[];
  at: number;
  phase: RoundPhase;
  /** while asking: the step on now, from 1 (more of the piece at each) */
  step: number;
  /** a team's points in each round (null: not marked yet) */
  marks: (number | null)[][];
}

export const newHybrid = (game: RoundGame, teams: string[], rounds: RoundQ[]): HybridState | null => {
  const list = rounds.filter(q => q.kind === game);
  if (teams.length < MIN_TEAMS || teams.length > MAX_TEAMS || !list.length) return null;
  return { v: 1, game, teams, rounds: list, at: 0, phase: 'ask', step: 1, marks: list.map(() => teams.map(() => null)) };
};
export const hybridScores = (h: HybridState) => h.teams.map((_, t) => h.marks.reduce((sum, m) => sum + (m[t] ?? 0), 0));
export const markTeam = (h: HybridState, team: number, points: number | null): HybridState => ({
  ...h, marks: h.marks.map((m, i) => (i === h.at ? m.map((x, t) => (t === team ? points : x)) : m)),
});
export const hybridNext = (h: HybridState): HybridState => {
  if (h.phase === 'ask') return { ...h, phase: 'reveal' };
  if (h.phase === 'reveal') return h.at + 1 < h.rounds.length ? { ...h, at: h.at + 1, phase: 'ask', step: 1 } : { ...h, phase: 'end' };
  return h;
};
/** the round's next step (the host moved on); after the last one, the answer */
export const hybridStep = (h: HybridState): HybridState => {
  if (h.phase !== 'ask') return h;
  const q = h.rounds[h.at];
  return h.step < rulesOf(q).steps(q) ? { ...h, step: h.step + 1 } : hybridNext(h);
};
export const parseHybrid = (raw: unknown): HybridState | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || !GAMES.includes(String(o.game)) || !PHASES.includes(String(o.phase)) || !Array.isArray(o.teams) || !Array.isArray(o.rounds)) return null;
  const teams = o.teams.filter((t): t is string => typeof t === 'string');
  const rounds = (o.rounds as unknown[]).filter(isQ);
  if (teams.length < MIN_TEAMS || !rounds.length || !isInt(o.at) || o.at < 0 || o.at >= rounds.length) return null;
  const marks = Array.isArray(o.marks) && o.marks.length === rounds.length
    ? (o.marks as unknown[]).map(m => (Array.isArray(m) && m.length === teams.length ? m.map(x => (isInt(x) ? x : null)) : teams.map(() => null)))
    : rounds.map(() => teams.map(() => null));
  const q = rounds[o.at];
  const step = isInt(o.step) ? Math.min(rulesOf(q).steps(q), Math.max(1, o.step)) : 1;
  return { v: 1, game: o.game as RoundGame, teams, rounds, at: o.at, phase: o.phase as RoundPhase, step, marks };
};
