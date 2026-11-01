// „ხუცური წარწერა“ on one screen (2026-11-01): teams before the board, the way of the TV's „სასწაულების ველი“. The line stands
// in the old letters with empty boxes; the team whose turn it is names one of today's letters. The line has it: every such box
// opens, the team gets a point a box and goes on. It hasn't: the turn passes. A team that can read the whole line says so on its
// turn — the line opens for all; read right, the team gets the boxes still closed + READ_BONUS, read wrong, nobody gets them.
// A turn may have a clock (`secs`, 0 = none); its end passes the turn. Rounds = lines; each round a next team starts.

import { countsOf, letterCount, lettersOf, usable, type TsLine } from './tsartsera';
import { isScript, type Script } from './oldScripts';
import { shuffle } from './otkheuli';

export const TS_ROUNDS = [3, 5, 7] as const;
export const TS_TURN_SECS = [0, 30, 45, 60] as const;
export const READ_BONUS = 5;
/** the lines a team game draws: short enough for one screen, long enough to call letters in */
export const TEAM_MIN = 14;
export const TEAM_MAX = 60;

export interface TsTeams {
  v: 1;
  names: string[];
  script: Script;
  secs: number;
  lines: string[];
  at: number;
  said: string[];
  turn: number;
  scores: number[];
  /** the turn's start (ms) — the clock counts from it */
  t0: number;
  phase: 'play' | 'read' | 'over';
  /** who read the line: a team, -1 = read wrong or opened by the letters alone */
  readBy: number | null;
  /** the last call, shown big for a moment */
  last: { team: number; letter: string; n: number } | null;
  /** the game before the last step — „უკან“ */
  prev: Omit<TsTeams, 'prev'> | null;
}

/** the game's lines: of a fit length, the ones not played lately first, the kinds taking turns */
export const drawTeamLines = (lines: TsLine[], count: number, rnd: () => number, seen: string[] = []): string[] => {
  const fit = lines.filter(l => usable(l) && letterCount(l.text) >= TEAM_MIN && letterCount(l.text) <= TEAM_MAX);
  const order = [...shuffle(fit.filter(l => !seen.includes(l.id)), rnd), ...shuffle(fit.filter(l => seen.includes(l.id)), rnd)];
  const out: TsLine[] = [];
  while (out.length < count && order.length) {
    const last = out[out.length - 1]?.kind;
    const i = Math.max(0, order.findIndex(l => l.kind !== last));
    out.push(order.splice(i, 1)[0]);
  }
  return out.map(l => l.id);
};

const strip = (g: TsTeams): Omit<TsTeams, 'prev'> => { const { prev: _p, ...rest } = g; return rest; };
const step = (g: TsTeams, next: Omit<TsTeams, 'prev'>): TsTeams => ({ ...next, prev: strip(g) });

export const newTsTeams = (names: string[], script: Script, secs: number, lines: string[], now: number): TsTeams => ({
  v: 1, names, script, secs, lines, at: 0, said: [], turn: 0, scores: names.map(() => 0), t0: now, phase: lines.length ? 'play' : 'over',
  readBy: null, last: null, prev: null,
});

/** the boxes still closed on the board */
export const hiddenOf = (line: TsLine, said: string[]) => {
  const counts = countsOf(line.text);
  return lettersOf(line.text).filter(c => !said.includes(c)).reduce((s, c) => s + counts[c], 0);
};

/** a team named `letter`: its boxes open (a point each, the turn stays) or the turn passes; a letter said before changes nothing */
export const callLetter = (g: TsTeams, line: TsLine, letter: string, now: number): TsTeams => {
  if (g.phase !== 'play' || g.said.includes(letter)) return g;
  const n = countsOf(line.text)[letter] ?? 0;
  const said = [...g.said, letter];
  const scores = g.scores.map((s, i) => (i === g.turn ? s + n : s));
  const turn = n ? g.turn : (g.turn + 1) % g.names.length;
  const all = lettersOf(line.text).every(c => said.includes(c));
  return step(g, { ...strip(g), said, scores, turn, t0: now, last: { team: g.turn, letter, n }, phase: all ? 'read' : 'play', readBy: all ? -1 : null });
};

/** the team on turn read the whole line: `ok` = read right */
export const readLine = (g: TsTeams, line: TsLine, ok: boolean, now: number): TsTeams => {
  if (g.phase !== 'play') return g;
  const bonus = ok ? hiddenOf(line, g.said) + READ_BONUS : 0;
  const scores = g.scores.map((s, i) => (i === g.turn ? s + bonus : s));
  return step(g, { ...strip(g), scores, t0: now, phase: 'read', readBy: ok ? g.turn : -1, last: null });
};

/** the turn's clock ran out */
export const timeUp = (g: TsTeams, now: number): TsTeams =>
  (g.phase !== 'play' ? g : { ...g, turn: (g.turn + 1) % g.names.length, t0: now, last: null });

/** the next line, or the end; each line a next team starts */
export const nextLine = (g: TsTeams, now: number): TsTeams => {
  const at = g.at + 1;
  if (at >= g.lines.length) return step(g, { ...strip(g), phase: 'over', last: null });
  return step(g, { ...strip(g), at, said: [], turn: at % g.names.length, t0: now, phase: 'play', readBy: null, last: null });
};

export const undo = (g: TsTeams, now: number): TsTeams => (g.prev ? { ...g.prev, t0: now, prev: null } : g);

/** a game kept on the device, checked before it is trusted */
export const parseTsTeams = (raw: unknown): TsTeams | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<TsTeams>;
  const strs = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === 'string');
  if (o.v !== 1 || !strs(o.names) || !strs(o.lines) || !strs(o.said) || !isScript(o.script)) return null;
  const names = o.names as string[];
  if (names.length < 2 || !Array.isArray(o.scores) || o.scores.length !== names.length || !o.scores.every(n => Number.isFinite(n))) return null;
  if (typeof o.at !== 'number' || typeof o.turn !== 'number' || o.turn < 0 || o.turn >= names.length) return null;
  if (o.phase !== 'play' && o.phase !== 'read' && o.phase !== 'over') return null;
  return {
    v: 1, names, script: o.script as Script, secs: typeof o.secs === 'number' ? o.secs : 0, lines: o.lines as string[], at: o.at,
    said: o.said as string[], turn: o.turn, scores: o.scores as number[], t0: typeof o.t0 === 'number' ? o.t0 : 0, phase: o.phase,
    readBy: typeof o.readBy === 'number' ? o.readBy : null, last: null, prev: null,
  };
};
