// "ფსალმუნთა ჯგუფი": a group reads the whole Psalter — twenty kathismas, one per reader — in every
// cycle of one or two days. Pure date and rotation rules live here (tests: tests/psalter.test.ts).
//
// • Dates are Georgian calendar days (Asia/Tbilisi is UTC+4 all year, no daylight saving), never the
//   phone's own clock zone.
// • Each group picks its shift days of the month (`shiftDays`, 1–28; by default the 1st and the 15th).
//   They cut the year into periods; cycles (1–7 days) start afresh on every shift day, and days left over
//   at the end of a period join its last cycle (so with two-day cycles one cycle may last three days).
// • On every shift day everyone moves one kathisma on (7 → 8, 20 → 1); with the 1st and the 15th each
//   reader goes through all twenty in ten months. The kathisma is worked out from the date: nobody
//   switches anything.
// • A group stores its distribution (kathisma → readers) for one period, `baseHalf` (the name is from
//   the days of half-months); other periods are that distribution turned by the number of periods between.
//   With the default days a period's number is the same as the old half-month number.

import { MONTHS_GE, MONTHS_GEN_GE } from './dateNames';

export const KATHISMA_COUNT = 20;
const TBILISI_OFFSET_MS = 4 * 3600_000;
const DAY_MS = 86400_000;

export type Iso = string; // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (y: number, m: number, d: number): Iso => `${y}-${pad(m)}-${pad(d)}`;
export const parseIso = (iso: Iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
};

/** Today's date in Georgia. */
export const georgiaToday = (now: Date = new Date()): Iso => new Date(now.getTime() + TBILISI_OFFSET_MS).toISOString().slice(0, 10);

/** The moment a Georgian day begins (00:00 in Tbilisi). */
export const georgiaMidnight = (iso: Iso): number => {
  const { y, m, d } = parseIso(iso);
  return Date.UTC(y, m - 1, d) - TBILISI_OFFSET_MS;
};

export const addDays = (iso: Iso, n: number): Iso => {
  const { y, m, d } = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
};

const daysBetween = (a: Iso, b: Iso) => {
  const x = parseIso(a), y = parseIso(b);
  return Math.round((Date.UTC(y.y, y.m - 1, y.d) - Date.UTC(x.y, x.m - 1, x.d)) / DAY_MS);
};

export const DEFAULT_SHIFT_DAYS = [1, 15];
export const MAX_CYCLE_DAYS = 7;

/** Shift days as stored: whole numbers 1–28, sorted, no repeats; none → the 1st and the 15th. */
export const normShiftDays = (days?: unknown): number[] => {
  const list = Array.isArray(days) ? days.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 28) : [];
  const clean = [...new Set(list)].sort((a, b) => a - b);
  return clean.length ? clean : DEFAULT_SHIFT_DAYS;
};

/** Cycle length in days, 1–7 (anything unreadable counts as two, as before). */
export const normCycleDays = (n: unknown) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 1 ? Math.min(v, MAX_CYCLE_DAYS) : 2;
};

/** Shift days as a teacher types them ("1, 15", "1 10 20"): sorted, no repeats; null when empty or outside 1–28. */
export const parseShiftDays = (text: string): number[] | null => {
  const days = [...new Set(text.split(/[^0-9]+/).filter(Boolean).map(Number))].sort((a, b) => a - b);
  return days.length && days.every(d => d >= 1 && d <= 28) ? days : null;
};

/** A typed cycle length, or null when it isn't a whole number 1–7. */
export const parseCycleDays = (text: string): number | null => {
  const n = Number(text);
  return text.trim() && Number.isInteger(n) && n >= 1 && n <= MAX_CYCLE_DAYS ? n : null;
};

/** "1 და 15", "1, 10 და 20", "1". */
export const shiftDaysText = (days?: number[]) => {
  const l = normShiftDays(days);
  return l.length === 1 ? String(l[0]) : `${l.slice(0, -1).join(', ')} და ${l[l.length - 1]}`;
};

/** The period (from one shift day to the day before the next) that a day falls in, and its number. */
const periodOf = (iso: Iso, shiftDays?: number[]) => {
  const days = normShiftDays(shiftDays);
  const n = days.length;
  const { y, m, d } = parseIso(iso);
  let month = y * 12 + (m - 1);
  let j = -1;
  for (let i = n - 1; i >= 0; i--) if (days[i] <= d) { j = i; break; }
  if (j < 0) { month -= 1; j = n - 1; }
  const ym = (mi: number) => [Math.floor(mi / 12), (mi % 12) + 1] as const;
  const [sy, sm] = ym(month);
  const start = isoOf(sy, sm, days[j]);
  const next = j + 1 < n ? isoOf(sy, sm, days[j + 1]) : isoOf(...ym(month + 1), days[0]);
  return { index: month * n + j, start, end: addDays(next, -1) };
};

/** Period number, counted from year 0 (with the 1st and the 15th: the half-month). */
export const halfIndex = (iso: Iso, shiftDays?: number[]) => periodOf(iso, shiftDays).index;

export interface Cycle {
  id: Iso;      // the first day; also the Firestore document id
  start: Iso;
  end: Iso;     // the last day (inclusive)
  half: number; // half-month of the cycle (decides who reads which kathisma)
  days: number;
}

/** The cycle that a day belongs to. */
export const cycleOf = (iso: Iso, cycleDays: number, shiftDays?: number[]): Cycle => {
  const len = normCycleDays(cycleDays);
  const p = periodOf(iso, shiftDays);
  const count = Math.max(1, Math.floor((daysBetween(p.start, p.end) + 1) / len));
  const idx = Math.min(Math.floor(daysBetween(p.start, iso) / len), count - 1);
  const start = addDays(p.start, idx * len);
  const end = idx === count - 1 ? p.end : addDays(start, len - 1);
  return { id: start, start, end, half: p.index, days: daysBetween(start, end) + 1 };
};

export const previousCycle = (c: Cycle, cycleDays: number, shiftDays?: number[]) => cycleOf(addDays(c.start, -1), cycleDays, shiftDays);
export const nextCycle = (c: Cycle, cycleDays: number, shiftDays?: number[]) => cycleOf(addDays(c.end, 1), cycleDays, shiftDays);

/** Milliseconds until the cycle ends (midnight after its last day, Georgian time). */
export const msLeft = (c: Cycle, now: Date = new Date()) => georgiaMidnight(addDays(c.end, 1)) - now.getTime();

export const wrap = (k: number) => ((((k - 1) % KATHISMA_COUNT) + KATHISMA_COUNT) % KATHISMA_COUNT) + 1;

export type Assignment = Record<string, string[]>; // "1".."20" → reader uids

/** Who reads each kathisma in the given half-month. */
export const ownersIn = (assignment: Assignment, baseHalf: number, half: number): Record<number, string[]> => {
  const shift = half - baseHalf;
  const out: Record<number, string[]> = {};
  for (let k = 1; k <= KATHISMA_COUNT; k++) out[k] = [...(assignment[String(wrap(k - shift))] || [])];
  return out;
};

/** The same distribution written for another half-month (when the teacher edits it "as of now"). */
export const rebase = (owners: Record<number, string[]>): Assignment =>
  Object.fromEntries(Array.from({ length: KATHISMA_COUNT }, (_, i) => [String(i + 1), [...(owners[i + 1] || [])]]));

export const kathismasOf = (owners: Record<number, string[]>, uid: string) =>
  Object.entries(owners).filter(([, list]) => list.includes(uid)).map(([k]) => Number(k));

// ---- distribution (who reads which kathisma) -----------------------------------------------------

/** A kathisma has at most two readers (the user's rule, 2026-10-30: „1 კანონი 2 კაცი“). */
export const MAX_READERS = 2;

type Owners = Record<number, string[]>;
const KS = Array.from({ length: KATHISMA_COUNT }, (_, i) => i + 1);
const copyOwners = (o: Owners): Owners => Object.fromEntries(KS.map(k => [k, [...(o[k] || [])]]));
const countOf = (o: Owners, uid: string) => KS.filter(k => o[k].includes(uid)).length;

/**
 * One more reader gets a kathisma; everyone else keeps theirs where possible: a free kathisma first; else one that
 * the busiest reader (two or more kathismas) reads alone passes over; else a second place beside a lone reader.
 * Null when the reader already has one, or every kathisma has two readers.
 */
export const giveKanon = (owners: Owners, uid: string): Owners | null => {
  const o = copyOwners(owners);
  if (countOf(o, uid) > 0) return null;
  const free = KS.find(k => o[k].length === 0);
  if (free) { o[free] = [uid]; return o; }
  const counts = new Map<string, number>();
  KS.forEach(k => o[k].forEach(u => counts.set(u, (counts.get(u) || 0) + 1)));
  const busiest = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  for (const [u] of busiest) {
    const alone = [...KS].reverse().find(k => o[k].length === 1 && o[k][0] === u);
    if (alone) { o[alone] = [uid]; return o; }
  }
  const beside = KS.find(k => o[k].length < MAX_READERS);
  if (beside) { o[beside] = [...o[beside], uid]; return o; }
  return null;
};

/**
 * „ავტომატური განაწილება“ that keeps what is there: people who are no longer readers come off, every reader without a
 * kathisma gets one (`giveKanon`, in the given order), and each kathisma still free goes to the second reader of a
 * shared one (they move) or, when none is shared, to whoever reads the fewest (ties: the given order).
 * With no distribution yet this is the plain round of names: 1 → first, 2 → second, … and past twenty, second readers.
 */
export const fillDistribution = (owners: Owners, readers: string[]): Owners => {
  let o: Owners = Object.fromEntries(KS.map(k => [k, (owners[k] || []).filter(u => readers.includes(u)).slice(0, MAX_READERS)]));
  for (const uid of readers) o = giveKanon(o, uid) || o;
  for (const k of KS) {
    if (o[k].length) continue;
    const shared = [...KS].reverse().find(x => o[x].length >= 2);
    if (shared) {
      const moving = o[shared][o[shared].length - 1];
      o[shared] = o[shared].slice(0, -1);
      o[k] = [moving];
      continue;
    }
    const least = [...readers].sort((a, b) => countOf(o, a) - countOf(o, b) || readers.indexOf(a) - readers.indexOf(b))[0];
    if (least) o[k] = [least];
  }
  return o;
};

/** A fresh distribution by the readers' order (the confirm-first „ყველას თავიდან“). */
export const autoDistribute = (readers: string[]): Owners => fillDistribution({}, readers);

/** How a distribution stands: free kathismas, shared ones, readers without one, and the most any reader has. */
export const distributionState = (owners: Owners, readers: string[]) => ({
  free: KS.filter(k => !(owners[k] || []).length),
  shared: KS.filter(k => (owners[k] || []).length >= 2),
  without: readers.filter(u => !KS.some(k => (owners[k] || []).includes(u))),
  most: Math.max(0, ...readers.map(u => KS.filter(k => (owners[k] || []).includes(u)).length)),
});

/** Readers whose kathismas differ between two distributions. */
export const changedReaders = (before: Owners, after: Owners) => {
  const all = new Set(KS.flatMap(k => [...(before[k] || []), ...(after[k] || [])]));
  const ks = (o: Owners, u: string) => KS.filter(k => (o[k] || []).includes(u)).join();
  return [...all].filter(u => ks(before, u) !== ks(after, u));
};

/** Earlier distributions, so the history names who was to read each kathisma then. `until` = the first cycle (its
 *  start) that no longer used it; `shiftDays` = the days its periods were counted by. */
export interface PastDistribution { until: Iso; assignment: Assignment; baseHalf: number; shiftDays: number[] }
const LOG_KEEP = 12;

/** The log after the distribution changes during the cycle that starts `until`: the one in force so far is kept,
 *  once per cycle (a second change in the same cycle replaces nothing). Null = nothing to add. */
export const withPast = (log: PastDistribution[], until: Iso, prev: Omit<PastDistribution, 'until'>): PastDistribution[] | null =>
  log.some(e => e.until === until) ? null : [...log, { until, ...prev }].sort((a, b) => a.until.localeCompare(b.until)).slice(-LOG_KEEP);

/** Who was to read each kathisma in the cycle that starts `start`: the distribution it used, turned to its period. */
export const ownersThen = (now: Omit<PastDistribution, 'until'>, log: PastDistribution[], start: Iso, half: number): Owners => {
  const then = [...log].sort((a, b) => a.until.localeCompare(b.until)).find(e => start < e.until);
  return then ? ownersIn(then.assignment, then.baseHalf, halfIndex(start, then.shiftDays)) : ownersIn(now.assignment, now.baseHalf, half);
};

// ---- one cycle's marks ------------------------------------------------------------------------

export interface Slot {
  readBy?: string;
  readAt?: string;
  takenBy?: string;
  takenAt?: string;
  help?: { by: string; at: string };
}
export type Slots = Record<string, Slot>;

export type SlotState = 'read' | 'taken' | 'unread' | 'free' | 'skipped';

/** The state of a kathisma in a cycle; once the cycle is over, anything unread was skipped. */
export const slotState = (slot: Slot | undefined, owners: string[], over: boolean): SlotState => {
  if (slot?.readBy) return 'read';
  if (over) return 'skipped';
  if (slot?.takenBy) return 'taken';
  return owners.length ? 'unread' : 'free';
};

/** Who answers for a kathisma now: whoever took it, otherwise its readers. */
export const responsible = (slot: Slot | undefined, owners: string[]) => (slot?.takenBy ? [slot.takenBy] : owners);

export const readCount = (slots: Slots | undefined) =>
  Object.entries(slots || {}).filter(([k, s]) => Number(k) >= 1 && Number(k) <= KATHISMA_COUNT && s?.readBy).length;

export const KATHISMA_PSALMS = ['1–8', '9–16', '17–23', '24–31', '32–36', '37–45', '46–54', '55–63', '64–69', '70–76', '77–84', '85–90', '91–100', '101–104', '105–108', '109–117', '118', '119–133', '134–142', '143–150'];

/** "1 დღე 5 სთ", "3 სთ 20 წთ", "15 წთ". */
export const formatLeft = (ms: number) => {
  if (ms <= 0) return 'დასრულდა';
  const min = Math.floor(ms / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const mm = min % 60;
  if (d > 0) return `${d} დღე${h ? ` ${h} სთ` : ''}`;
  if (h > 0) return `${h} სთ${mm ? ` ${mm} წთ` : ''}`;
  return `${Math.max(1, mm)} წთ`;
};


/** "6–7 ოქტომბერი", "31 ოქტომბერი – 1 ნოემბერი", "15 ოქტომბერი". */
export const formatRange = (c: Pick<Cycle, 'start' | 'end'>) => {
  const a = parseIso(c.start), b = parseIso(c.end);
  if (c.start === c.end) return `${a.d} ${MONTHS_GE[a.m - 1]}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS_GE[a.m - 1]}`;
  return `${a.d} ${MONTHS_GE[a.m - 1]} – ${b.d} ${MONTHS_GE[b.m - 1]}`;
};

/** When the next shift of kathismas happens: { label: "15 ოქტომბრის", from: "15 ოქტომბრიდან" }. */
export const nextShiftDate = (iso: Iso, shiftDays?: number[]) => {
  const at = addDays(periodOf(iso, shiftDays).end, 1);
  const { m: month, d: day } = parseIso(at);
  const gen = MONTHS_GEN_GE[month - 1];
  return { iso: at, label: `${day} ${gen}`, from: `${day} ${gen.replace(/ს$/, 'დან')}` };
};
