import { LINES, MASTERY_LEVELS, type Check, type Line, type MasteryLevel, type PathItem } from '../data/masteryPath';

// „ოსტატობის გზა“'s rules (data/masteryPath.ts): which exercise is passed, how far each level is, the level the student
// stands at, the day's plan and the entry test's placement. Pure — the member's own page reads it through
// components/mastery/useMasteryPath.ts, the teacher's view straight from the student's record (`recordFromDoc`).
// Tested in tests/masteryPath.test.ts.

/** a scored exercise passes at this best score */
export const PASS = 80;
/** a level is behind once this share of its exercises is passed */
export const LEVEL_SHARE = 0.8;

export interface PathRecord {
  /** best % per drill id (a teacher's mark wins for a tip) */
  scores: Record<string, number>;
  /** drills done at least once */
  done: Record<string, boolean>;
  /** the level the entry test placed the student at; the ones under it count as behind (0 = none) */
  start: number;
}

export const EMPTY_RECORD: PathRecord = { scores: {}, done: {}, start: 0 };

export const isScored = (c: Check) => c === 'app' || c === 'quiz';

/** passed: a scored exercise at PASS or more, any other once done — or scored that well anyway */
export const itemPassed = (it: PathItem, r: PathRecord) =>
  (r.scores[it.id] ?? -1) >= PASS || (!isScored(it.check) && !!r.done[it.id]);

export const levelNeed = (l: MasteryLevel) => Math.ceil(l.items.length * LEVEL_SHARE);

export interface LevelState { n: number; passed: number; total: number; need: number; complete: boolean; skipped: boolean }

export const levelState = (l: MasteryLevel, r: PathRecord): LevelState => {
  const passed = l.items.filter(x => itemPassed(x, r)).length;
  const need = levelNeed(l);
  const skipped = l.n < r.start;
  return { n: l.n, passed, total: l.items.length, need, complete: skipped || passed >= need, skipped };
};

/** the first level not yet behind (the last one stays once all are) */
export const currentLevel = (r: PathRecord): number => {
  for (const l of MASTERY_LEVELS) if (!levelState(l, r).complete) return l.n;
  return MASTERY_LEVELS[MASTERY_LEVELS.length - 1].n;
};

/** the current level's progress for the ring: passed of all its exercises, 0–100 */
export const pathSummary = (r: PathRecord) => {
  const n = currentLevel(r);
  const s = levelState(MASTERY_LEVELS[n], r);
  return { level: n, passed: s.passed, total: s.total, need: s.need, pct: Math.round((100 * s.passed) / s.total) };
};

export type LineMark = 'all' | 'some' | 'none';
/** each line of a level: all its exercises passed, some, or none; a line the level lacks is left out */
export const lineMarks = (l: MasteryLevel, r: PathRecord): { line: Line; name: string; mark: LineMark; passed: number; total: number }[] =>
  LINES.flatMap(li => {
    const xs = l.items.filter(x => x.line === li.id);
    if (!xs.length) return [];
    const passed = xs.filter(x => itemPassed(x, r)).length;
    return [{ line: li.id, name: li.name, mark: passed === xs.length ? 'all' as const : passed ? 'some' as const : 'none' as const, passed, total: xs.length }];
  });

export type PlanWhy = 'teacher' | 'warmup' | 'weak' | 'chant' | 'next';
export interface PlanItem { id: string; why: PlanWhy }

/**
 * „დღეს“: the warm-up, the next exercise of the level's weakest line (voice, ear or rhythm — by the share passed) and
 * the next of its chant line (a review once that line is passed, from level 2), filled up to three with the level's next
 * open exercises; a teacher's assignment goes first. An exercise done today still counts as open, so the plan does
 * not change under the student's hands while they work through it.
 */
export const dayPlan = (r: PathRecord, doneToday: (id: string) => boolean, assigned?: string | null): PlanItem[] => {
  const lvl = MASTERY_LEVELS[currentLevel(r)];
  const out: PlanItem[] = [];
  const has = (id: string) => out.some(p => p.id === id);
  const open = (x: PathItem) => !itemPassed(x, r) || doneToday(x.id);
  if (assigned) out.push({ id: assigned, why: 'teacher' });
  const warm = lvl.n === 0 ? 'm-trill' : 'm-warmup';
  if (!has(warm)) out.push({ id: warm, why: 'warmup' });
  const lines = LINES.filter(li => li.id !== 'chant').map(li => {
    const xs = lvl.items.filter(x => x.line === li.id && x.id !== warm);
    const share = xs.length ? xs.filter(x => !open(x)).length / xs.length : 1;
    return { xs, share };
  }).filter(l => l.xs.some(open)).sort((a, b) => a.share - b.share);
  for (const l of lines) {
    const x = l.xs.find(y => open(y) && !has(y.id));
    if (x) { out.push({ id: x.id, why: 'weak' }); break; }
  }
  const chant = lvl.items.find(x => x.line === 'chant' && open(x) && !has(x.id));
  if (chant) out.push({ id: chant.id, why: 'chant' });
  else if (lvl.n >= 2 && !has('m-review')) out.push({ id: 'm-review', why: 'chant' });
  const want = assigned ? 4 : 3;
  for (const x of lvl.items) {
    if (out.length >= want) break;
    if (open(x) && !has(x.id)) out.push({ id: x.id, why: 'next' });
  }
  return out.slice(0, want);
};

/** the entry test's five shares (0–1) */
export interface EntryResult { hold: number; higher: number; echo1: number; echo3: number; intervals: number }

/** where the entry test puts the student: 0, 1 or 2 (the polyphony of level 3 is learned with a teacher, not skipped) */
export const placement = (s: EntryResult): number => {
  if (s.hold < 0.6 || s.echo1 < 0.6) return 0;
  if (s.higher < 0.75 || s.echo3 < 0.5 || s.intervals < 0.6) return 1;
  return 2;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {});

/**
 * A student's path from their record (students/{uid}): the exercises' best scores (`drillScore`), a teacher's mark on a
 * tip (`maneraReview.{num}.v` → `tip-<num>`, which wins), the days done (`drillDone`) and the entry test (`mastery.start`,
 * written with `mastery.at` and `mastery.range` by the test).
 * `local` adds this device's own (a guest's whole record, a member's not yet synced).
 */
export const recordFromDoc = (d: Record<string, unknown> | undefined | null, local?: Partial<PathRecord>): PathRecord => {
  const data = obj(d);
  const scores: Record<string, number> = { ...(local?.scores ?? {}) };
  for (const [k, v] of Object.entries(obj(data.drillScore))) {
    const n = num(v);
    if (n !== null) scores[k] = Math.max(scores[k] ?? 0, n);
  }
  for (const [k, v] of Object.entries(obj(data.maneraReview))) {
    const n = num(obj(v).v);
    if (n !== null) scores[`tip-${k}`] = n;
  }
  const done: Record<string, boolean> = { ...(local?.done ?? {}) };
  for (const [k, v] of Object.entries(obj(data.drillDone))) if (typeof v === 'string') done[k] = true;
  // the record's own once it has one (a test taken again may start lower), else this device's
  const start = num(obj(data.mastery).start) ?? local?.start ?? 0;
  return { scores, done, start: Math.min(start, MASTERY_LEVELS.length - 1) };
};
