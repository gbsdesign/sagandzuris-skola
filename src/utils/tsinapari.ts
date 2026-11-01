import { mulberry32, shuffle } from './otkheuli';

// „წინაპრის გზა“ (2026-11-01, the plan's Georgian game, like a choose-your-own-adventure book): an ancestor's life as a path of
// forks — at each a scene, a question and three ways: the one the ancestor really took and two what-ifs. A pick opens what
// really happened; a what-if first says where it would have led. A point for every fork where one chose as the ancestor did.
// Alone (`PathRun`) or the class's teams voting with letter cards (`PathTable`). The stories: data/tsinapariStories.ts.

export interface PathAside { text: string; then: string }

export interface PathStep {
  year: string;
  place: string;
  /** the scene, told to „you“ */
  scene: string;
  ask: string;
  /** the way the ancestor took */
  right: string;
  /** two what-ifs and where they would have led */
  wrong: readonly [PathAside, PathAside];
  /** what really happened */
  real: string;
}

export interface PathStory {
  id: string;
  hero: string;
  /** the monogram's letters */
  short: string;
  /** the biography's id in ANCESTORS */
  ancestor: number;
  years: string;
  role: string;
  where: string;
  tint: string;
  intro: string;
  steps: readonly PathStep[];
  outro: string;
  fact: string;
}

export const LETTERS = ['ა', 'ბ', 'გ'] as const;

const seedOf = (seed: number, step: number) => (seed ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0;
/** the three ways in the order a run shows them: 0 = the ancestor's own, 1 and 2 = the what-ifs */
export const choiceOrder = (seed: number, step: number): number[] => shuffle([0, 1, 2], mulberry32(seedOf(seed, step)));
export const choiceText = (s: PathStep, c: number) => (c === 0 ? s.right : s.wrong[c - 1]?.text ?? '');

/** ★★★ = all but one fork at most, ★★ = half or more, ★ = to the end */
export const starsOf = (right: number, total: number) => (right >= total - 1 ? 3 : right * 2 >= total ? 2 : 1);
export const rightCount = (picks: readonly number[]) => picks.filter(p => p === 0).length;

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const isWay = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 2;

// ---------- alone ----------

export interface PathRun {
  story: string;
  seed: number;
  /** the fork on screen; steps.length = the end */
  step: number;
  /** the way picked at every fork so far (0 = the ancestor's) */
  picks: number[];
}

export const newRun = (story: string, seed: number): PathRun => ({ story, seed: seed >>> 0, step: 0, picks: [] });
/** the fork on screen has been answered: its story shows */
export const isShown = (r: PathRun) => r.picks.length > r.step;
export const isOver = (r: PathRun, total: number) => r.step >= total;
export const pickChoice = (r: PathRun, c: number, total: number): PathRun => (isShown(r) || isOver(r, total) || !isWay(c) ? r : { ...r, picks: [...r.picks, c] });
export const nextStep = (r: PathRun, total: number): PathRun => (isShown(r) && !isOver(r, total) ? { ...r, step: r.step + 1 } : r);

export const parseRun = (raw: unknown, storyOf: (id: string) => PathStory | undefined): PathRun | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<PathRun> | null;
  const story = o && typeof o.story === 'string' ? storyOf(o.story) : undefined;
  if (!o || !story) return null;
  const total = story.steps.length;
  const picks = (Array.isArray(o.picks) ? o.picks.filter(isWay) : []).slice(0, total);
  const step = Math.min(total, picks.length, Math.max(0, Math.round(num(o.step))));
  return { story: story.id, seed: num(o.seed) >>> 0, step, picks: picks.slice(0, step < total ? step + 1 : total) };
};

/** a story's best on this device */
export interface PathBest { right: number; total: number }
export const betterPath = (old: PathBest | undefined, b: PathBest) => !old || b.right > old.right;

// ---------- the class: teams vote with letter cards, the host taps each team's letter ----------

export interface PathTeam {
  name: string;
  points: number;
  /** the way this team holds up at the fork on screen, -1 = none yet */
  pick: number;
  /** the ways it held up at the forks before, -1 = none */
  picks: number[];
}

export interface PathTable {
  story: string;
  seed: number;
  step: number;
  /** the fork's story is out */
  shown: boolean;
  teams: PathTeam[];
}

export const newTable = (story: string, names: readonly string[], seed: number): PathTable => ({
  story, seed: seed >>> 0, step: 0, shown: false, teams: names.map(name => ({ name, points: 0, pick: -1, picks: [] })),
});
export const tableOver = (g: PathTable, total: number) => g.step >= total;

/** before the story: a tap sets a team's way, the same tap takes it back; after it, a tap mends the host's slip and its point */
export const tablePick = (g: PathTable, team: number, c: number): PathTable => {
  if (!isWay(c) || !g.teams[team]) return g;
  return {
    ...g,
    teams: g.teams.map((t, i) => {
      if (i !== team) return t;
      if (!g.shown) return { ...t, pick: t.pick === c ? -1 : c };
      const was = t.picks[t.picks.length - 1];
      if (was === c) return t;
      return { ...t, pick: c, picks: [...t.picks.slice(0, -1), c], points: t.points - (was === 0 ? 1 : 0) + (c === 0 ? 1 : 0) };
    }),
  };
};
/** the story: a point to every team that held up the ancestor's way */
export const tableReveal = (g: PathTable): PathTable => (g.shown ? g : {
  ...g, shown: true, teams: g.teams.map(t => ({ ...t, points: t.points + (t.pick === 0 ? 1 : 0), picks: [...t.picks, t.pick] })),
});
export const tableNext = (g: PathTable, total: number): PathTable => (!g.shown || tableOver(g, total) ? g : {
  ...g, step: g.step + 1, shown: false, teams: g.teams.map(t => ({ ...t, pick: -1 })),
});
/** every team's place, 1 = the most points (equal points share a place) */
export const tablePlaces = (g: PathTable): number[] => g.teams.map(t => 1 + g.teams.filter(o => o.points > t.points).length);

export const parseTable = (raw: unknown, storyOf: (id: string) => PathStory | undefined): PathTable | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<PathTable> | null;
  const story = o && typeof o.story === 'string' ? storyOf(o.story) : undefined;
  if (!o || !story || !Array.isArray(o.teams) || !o.teams.length) return null;
  const total = story.steps.length;
  const step = Math.min(total, Math.max(0, Math.round(num(o.step))));
  const shown = step < total && !!o.shown;
  const done = step + (shown ? 1 : 0);
  const teams = o.teams.slice(0, 6).map((t, i) => {
    const r = (t && typeof t === 'object' ? t : {}) as Partial<PathTeam>;
    const picks = (Array.isArray(r.picks) ? r.picks : []).map(v => (isWay(v) ? v : -1)).slice(0, done);
    while (picks.length < done) picks.push(-1);
    return {
      name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 16) : `გუნდი ${i + 1}`,
      points: rightCount(picks),
      pick: shown ? picks[picks.length - 1] : isWay(r.pick) ? r.pick : -1,
      picks,
    };
  });
  return { story: story.id, seed: num(o.seed) >>> 0, step, shown, teams };
};
