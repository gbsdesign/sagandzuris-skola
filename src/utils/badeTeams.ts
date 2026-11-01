// „ასოების ბადე“ on one phone (the plan's hybrid, 2026-11-01): the grid on the screen or a projector and one clock for the
// whole grid; the teams look at once and shout a word they see, the teacher draws it on the grid (or taps it in the list) and
// gives it to the team that found it — a word, a point. The clock's end or the last word closes the grid; 1–3 grids a game.
// The clock pauses while the screen is closed (✕): `spent` keeps the time used, `t0` when this run began (0 = paused).
// Pure, tested in tests/badeTeams.test.ts; the screens are pages/games/bade/Teams.tsx.

import { isLevel, type BadeGrid, type LevelId } from './bade';
import { isScript, type Script } from './oldScripts';

export const BADE_MINUTES = [2, 3, 5] as const;
export const BADE_GRIDS = [1, 2, 3] as const;
export const NOBODY = -1;

export interface BadeTeams {
  v: 1;
  names: string[];
  count: number;
  /** the grid being played, from 0 */
  at: number;
  level: LevelId;
  script: Script;
  /** the words' list shows on the screen (else only the theme and how many) */
  list: boolean;
  secs: number;
  grid: BadeGrid;
  /** themes the game has had */
  used: string[];
  /** who found each hidden word (by its place in grid.placed), NOBODY = not yet */
  owner: number[];
  scores: number[];
  /** ms of the clock used before this run, and when this run began (0 = paused) */
  spent: number;
  t0: number;
  last: { word: number; team: number } | null;
  phase: 'play' | 'grid' | 'over';
}

export const newBadeTeams = (names: string[], count: number, level: LevelId, script: Script, list: boolean, secs: number, grid: BadeGrid, now: number): BadeTeams => ({
  v: 1, names, count, at: 0, level, script, list, secs, grid, used: [grid.theme.id], owner: grid.placed.map(() => NOBODY),
  scores: names.map(() => 0), spent: 0, t0: now, last: null, phase: 'play',
});

/** the clock's ms left */
export const badeLeft = (g: BadeTeams, now: number) => Math.max(0, g.secs * 1000 - g.spent - (g.t0 ? now - g.t0 : 0));
/** the moment the clock would have started had it never paused (what a running clock counts from) */
export const badeStart = (g: BadeTeams) => g.t0 - g.spent;

export const badePause = (g: BadeTeams, now: number): BadeTeams => (g.t0 ? { ...g, spent: Math.min(g.secs * 1000, g.spent + now - g.t0), t0: 0 } : g);
export const badeResume = (g: BadeTeams, now: number): BadeTeams => (g.phase === 'play' && !g.t0 ? { ...g, t0: now } : g);

const closeGrid = (g: BadeTeams, now: number): BadeTeams => ({ ...badePause(g, now), phase: 'grid' });

/** a hidden word given to the team that found it; the last one closes the grid */
export const badeFind = (g: BadeTeams, word: number, team: number, now: number): BadeTeams => {
  if (g.phase !== 'play' || g.owner[word] !== NOBODY || !g.names[team]) return g;
  const owner = g.owner.map((o, i) => (i === word ? team : o));
  const scores = g.scores.map((s, t) => (t === team ? s + 1 : s));
  // the time used so far is kept with every word, so a reload loses little
  const next: BadeTeams = { ...g, owner, scores, last: { word, team }, spent: g.t0 ? g.spent + now - g.t0 : g.spent, t0: g.t0 ? now : 0 };
  return owner.every(o => o !== NOBODY) ? closeGrid(next, now) : next;
};

/** the last word given back (a wrong team tapped) */
export const badeUndo = (g: BadeTeams): BadeTeams => {
  if (g.phase !== 'play' || !g.last || g.owner[g.last.word] !== g.last.team) return g;
  const { word, team } = g.last;
  return { ...g, owner: g.owner.map((o, i) => (i === word ? NOBODY : o)), scores: g.scores.map((s, t) => (t === team ? Math.max(0, s - 1) : s)), last: null };
};

/** the clock ran out */
export const badeTime = (g: BadeTeams, now: number): BadeTeams => (g.phase === 'play' ? closeGrid(g, now) : g);

/** the next grid (its clock starts at once), or the game's end */
export const badeNext = (g: BadeTeams, grid: BadeGrid | undefined, now: number): BadeTeams => {
  if (g.phase !== 'grid') return g;
  if (g.at + 1 >= g.count || !grid) return { ...g, phase: 'over', last: null };
  return {
    ...g, at: g.at + 1, grid, used: [...g.used, grid.theme.id], owner: grid.placed.map(() => NOBODY), spent: 0, t0: now, last: null, phase: 'play',
  };
};

/** how many of this grid's words nobody found */
export const badeMissed = (g: BadeTeams) => g.owner.filter(o => o === NOBODY).length;

/** a kept game read back from the device, or null */
export const parseBadeTeams = (raw: unknown): BadeTeams | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<BadeTeams>;
  const grid = o.grid as BadeGrid | undefined;
  if (o.v !== 1 || !Array.isArray(o.names) || !o.names.length || !grid || !Array.isArray(grid.cells) || !Array.isArray(grid.placed)) return null;
  if (grid.cells.length !== grid.size * grid.size || !grid.placed.length || !grid.theme?.title) return null;
  if (!Array.isArray(o.owner) || o.owner.length !== grid.placed.length || !Array.isArray(o.scores) || o.scores.length !== o.names.length) return null;
  if (!isLevel(o.level) || !isScript(o.script) || !['play', 'grid', 'over'].includes(o.phase as string)) return null;
  const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    v: 1, names: o.names.map(String), count: Math.max(1, n(o.count, 1)), at: Math.max(0, n(o.at)), level: o.level, script: o.script, list: o.list !== false,
    secs: Math.max(30, n(o.secs, 180)), grid, used: Array.isArray(o.used) ? o.used.map(String) : [grid.theme.id],
    owner: o.owner.map(x => n(x, NOBODY)), scores: o.scores.map(x => n(x)), spent: Math.max(0, n(o.spent)), t0: Math.max(0, n(o.t0)),
    last: o.last && typeof o.last === 'object' ? { word: n(o.last.word, NOBODY), team: n(o.last.team, NOBODY) } : null, phase: o.phase as BadeTeams['phase'],
  };
};
