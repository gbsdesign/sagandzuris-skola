import { MAX_TRIES, fits, type SitqvaCandidate, type SitqvaKind } from './sitqva';
import { MAX_TEAMS, MIN_TEAMS } from './roundGames';

// „დღის სიტყვა“ on one phone (the plan's hybrid, 2026-11-01; the way of the TV game „Lingo“): a hidden word of the bank
// (never the day's one), 2–6 teams in turn say a word, the host types it and the colours show to all — so every guess helps
// the next team too. The team that finds it gets 7 − its row (6 … 1); after six rows nobody does. The clock's end passes
// the turn without a row. „პირველი ასო“ shows the word's first letter and every guess begins with it. A game = 3, 5 or 7
// words, each begun by the next team. Pure; tests in tests/sitqvaTeams.test.ts; the screen pages/games/sitqva/Teams.tsx.

export const SQ_WORDS = [3, 5, 7] as const;
export const SQ_TURN_SECONDS = [30, 45, 60] as const;
/** a word found in row `row` (from 1) */
export const sqPoints = (row: number) => Math.max(1, MAX_TRIES + 1 - row);

export interface SqTeams {
  v: 1;
  names: string[];
  /** words in the game, and this one's place (from 0) */
  count: number;
  at: number;
  word: string;
  kind: SitqvaKind;
  /** the words of this game so far (none twice) */
  used: string[];
  /** this word's rows and the team of each */
  guesses: string[];
  by: number[];
  scores: number[];
  first: number;
  turn: number;
  secs: number;
  t0: number;
  /** the first letter shown, every guess begins with it */
  firstLetter: boolean;
  /** the clock's end that passed the turn */
  last: { team: number } | null;
  /** 'word' = this word is done and shown; 'over' = the game */
  phase: 'play' | 'word' | 'over';
}

const nextTeam = (g: Pick<SqTeams, 'names'>, t: number) => (t + 1) % g.names.length;

/** a word of the bank this game has not had (any, if all were had) */
export const drawSqWord = (bank: SitqvaCandidate[], used: string[], rnd: () => number): SitqvaCandidate | undefined => {
  const ok = bank.filter(c => fits(c.word));
  const fresh = ok.filter(c => !used.includes(c.word));
  const from = fresh.length ? fresh : ok;
  return from.length ? from[Math.floor(rnd() * from.length)] : undefined;
};

export const newSqTeams = (names: string[], count: number, secs: number, firstLetter: boolean, pick: SitqvaCandidate, now: number): SqTeams => ({
  v: 1, names, count, at: 0, word: pick.word, kind: pick.kind, used: [pick.word], guesses: [], by: [], scores: names.map(() => 0),
  first: 0, turn: 0, secs, t0: now, firstLetter, last: null, phase: 'play',
});

/** the team on turn tries a word (the screen has checked its length and that it is a word) */
export const sqGuess = (g: SqTeams, w: string, now: number): SqTeams => {
  if (g.phase !== 'play' || w.length !== g.word.length || g.guesses.includes(w)) return g;
  const team = g.turn;
  const guesses = [...g.guesses, w];
  const by = [...g.by, team];
  if (w === g.word) {
    return { ...g, guesses, by, scores: g.scores.map((s, t) => (t === team ? s + sqPoints(guesses.length) : s)), last: null, phase: 'word' };
  }
  if (guesses.length >= MAX_TRIES) return { ...g, guesses, by, last: null, phase: 'word' };
  return { ...g, guesses, by, turn: nextTeam(g, team), t0: now, last: null };
};

/** the turn's clock ran out: the next team, no row lost */
export const sqTime = (g: SqTeams, now: number): SqTeams =>
  (g.phase !== 'play' ? g : { ...g, turn: nextTeam(g, g.turn), t0: now, last: { team: g.turn } });

/** who found the word (-1: nobody) */
export const sqFinder = (g: Pick<SqTeams, 'guesses' | 'by' | 'word'>) => {
  const i = g.guesses.indexOf(g.word);
  return i < 0 ? -1 : g.by[i];
};

/** after a word: the next one, begun by the next team — or the game's end */
export const sqNext = (g: SqTeams, pick: SitqvaCandidate | undefined, now: number): SqTeams => {
  if (g.phase !== 'word') return g;
  if (g.at + 1 >= g.count || !pick) return { ...g, phase: 'over' };
  const first = nextTeam(g, g.first);
  return {
    ...g, at: g.at + 1, word: pick.word, kind: pick.kind, used: [...g.used, pick.word], guesses: [], by: [], first, turn: first,
    t0: now, last: null, phase: 'play',
  };
};

const KINDS: SitqvaKind[] = ['feast', 'saint', 'church', 'region', 'food', 'nature', 'hero', 'culture'];
const int = (x: unknown, lo: number, hi: number) => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;

export const parseSqTeams = (raw: unknown): SqTeams | null => {
  const g = raw as Partial<SqTeams> | null;
  if (!g || g.v !== 1 || typeof g.word !== 'string' || !fits(g.word) || !KINDS.includes(g.kind as SitqvaKind)) return null;
  const names = g.names;
  if (!Array.isArray(names) || names.length < MIN_TEAMS || names.length > MAX_TEAMS || !names.every(n => typeof n === 'string')) return null;
  const n = names.length;
  if (!int(g.count, 1, 9) || !int(g.at, 0, (g.count as number) - 1) || !int(g.first, 0, n - 1) || !int(g.turn, 0, n - 1)) return null;
  const len = g.word.length;
  if (!Array.isArray(g.guesses) || g.guesses.length > MAX_TRIES || !g.guesses.every(w => typeof w === 'string' && w.length === len)) return null;
  if (!Array.isArray(g.by) || g.by.length !== g.guesses.length || !g.by.every(t => int(t, 0, n - 1))) return null;
  if (!Array.isArray(g.scores) || g.scores.length !== n || !g.scores.every(s => int(s, 0, 9999))) return null;
  if (!Array.isArray(g.used) || !g.used.every(u => typeof u === 'string')) return null;
  if (!int(g.secs, 5, 600) || typeof g.t0 !== 'number') return null;
  if (g.phase !== 'play' && g.phase !== 'word' && g.phase !== 'over') return null;
  const last = g.last && int(g.last.team, 0, n - 1) ? { team: g.last.team } : null;
  return {
    v: 1, names, count: g.count as number, at: g.at as number, word: g.word, kind: g.kind as SitqvaKind, used: g.used, guesses: g.guesses,
    by: g.by, scores: g.scores, first: g.first as number, turn: g.turn as number, secs: g.secs as number, t0: g.t0,
    firstLetter: !!g.firstLetter, last, phase: g.phase,
  };
};
