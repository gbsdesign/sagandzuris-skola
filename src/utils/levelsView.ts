import { MASTERY_LEVELS, type MasteryLevel } from '../data/masteryPath';
import { itemPassed, levelState, type PathRecord } from './masteryPath';

// The pure parts of „ოსტატობის გზა“'s levels page and its certificate (pages/v2/doneebi). Tested in tests/levelsView.test.ts.

const WEEKS_PER_MONTH = 4.33;

/** a level's `span` („2–4 კვირა“, „1–2 თვე“, „უვადო“) as weeks: the two ends, or null when it has no end */
export const spanWeeks = (span: string): { lo: number; hi: number } | null => {
  const m = span.match(/(\d+)\s*[–-]\s*(\d+)\s*(კვირა|თვე)/);
  if (!m) return null;
  const k = m[3] === 'თვე' ? WEEKS_PER_MONTH : 1;
  return { lo: Number(m[1]) * k, hi: Number(m[2]) * k };
};

/**
 * A rough time left in the current level: the middle of the level's span × the share of its exercises not yet passed
 * (`total - passed` of `total`). Under a week → „1 კვირაზე ნაკლები“, up to 8 weeks in weeks, then in months.
 * null for a level with no end („უვადო“) or when everything is passed.
 */
export const timeLeft = (span: string, passed: number, total: number): string | null => {
  const w = spanWeeks(span);
  if (!w || total <= 0 || passed >= total) return null;
  const weeks = ((w.lo + w.hi) / 2) * ((total - passed) / total);
  if (weeks < 1) return '1 კვირაზე ნაკლები';
  if (weeks <= 8) return `≈ ${Math.round(weeks)} კვირა`;
  return `≈ ${Math.max(2, Math.round(weeks / WEEKS_PER_MONTH))} თვე`;
};

/** an exercise's name for a line: its title before a dash („კვინტა ბანზე — …“ → „კვინტა ბანზე“) */
export const shortTitle = (title: string): string => title.split(/\s[—–]\s/)[0].trim();

/**
 * „ამ დონის დასასრულებლად დაგრჩა: …“ — what the level still wants to be closed (80 %), by the names of its first open
 * exercises: at most two named, then „და კიდევ N“. null when the level is closed already.
 */
export const remainingLine = (level: MasteryLevel, record: PathRecord, nameOf: (id: string) => string): string | null => {
  const s = levelState(level, record);
  const required = s.need - s.passed;
  if (s.complete || required <= 0) return null;
  const open = level.items.filter(x => !itemPassed(x, record)).map(x => nameOf(x.id));
  const named = open.slice(0, Math.min(2, required));
  const more = required - named.length;
  const list = named.length === 2 ? `${named[0]} და ${named[1]}` : named[0];
  return `ამ დონის დასასრულებლად დაგრჩა: ${more > 0 ? `${named.join(', ')} და კიდევ ${more}` : list}.`;
};

/** the levels the certificate belongs to: closed by the student's own work (not skipped by the entry test) */
export const certLevels = (record: PathRecord): number[] =>
  MASTERY_LEVELS.filter(l => { const s = levelState(l, record); return s.complete && !s.skipped; }).map(l => l.n);

/**
 * The day a level closed: the latest known day among its passed exercises (`days`: drill id → 'YYYY-MM-DD', from
 * `students.drillDone` and this device's done days). null when none of them has a day (scores carry no date).
 */
export const closedOn = (level: MasteryLevel, record: PathRecord, days: Record<string, string>): string | null => {
  let last: string | null = null;
  for (const x of level.items) {
    const d = days[x.id];
    if (d && itemPassed(x, record) && (!last || d > last)) last = d;
  }
  return last;
};

/** whether a teacher's mark helped close the level: a passed tip the teacher marked (`maneraReview`) or a `teacher` check */
export const teacherMarked = (level: MasteryLevel, record: PathRecord, marked: Set<string>): boolean =>
  level.items.some(x => itemPassed(x, record) && (x.check === 'teacher' || marked.has(x.id)));

/**
 * The certificate to show once: `seen` is the device's list (null = this device never looked: all closed ones count as
 * seen, nothing is shown). Returns the first closed level not seen and the list to keep.
 */
export const unseenCert = (closed: number[], seen: number[] | null): { show: number | null; keep: number[] } => {
  if (seen === null) return { show: null, keep: closed };
  const fresh = closed.filter(n => !seen.includes(n));
  return { show: fresh.length ? fresh[0] : null, keep: [...new Set([...seen, ...closed])] };
};

const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
/** '2026-11-18' → „18 ნოემბერი, 2026“ */
export const dateText = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''}, ${m[1]}`;
};
