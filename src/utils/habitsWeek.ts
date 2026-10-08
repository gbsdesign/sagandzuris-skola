import type { HabitPeriod } from '../data/habitsAndManera';

// The habits week starts every Sunday at 09:00 (local time); the admin panel counts habits kept in it.
const RESET_DAY = 0; // Sunday
const RESET_HOUR = 9;

/** Start of the current habits week: the most recent Sunday 09:00 that is not in the future. */
export const getHabitsWeekStart = (now: Date = new Date()): Date => {
  const start = new Date(now);
  start.setHours(RESET_HOUR, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() - RESET_DAY + 7) % 7));
  if (start > now) start.setDate(start.getDate() - 7);
  return start;
};

/** Stable id of the current habits week, stored next to habitsStats in Firestore. */
export const getHabitsWeekKey = (now: Date = new Date()): string => getHabitsWeekStart(now).toISOString();

// ---- Daily log: which habits were ticked on which day ----

/** { 'YYYY-MM-DD': habit ids ticked that day }, stored in Firestore as `habitLog` */
export type HabitLog = Record<string, string[]>;

/** Days kept in the log: enough for the longest goal (a calendar month) with room to spare. */
const LOG_DAYS = 62;

export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The last `n` days ending today, oldest first. */
export const lastDays = (n: number, now: Date = new Date()): Date[] =>
  Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1) + i));

/** Drops days older than the window and days left empty. */
export const pruneHabitLog = (log: HabitLog, now: Date = new Date()): HabitLog => {
  const oldest = dayKey(lastDays(LOG_DAYS, now)[0]);
  return Object.fromEntries(Object.entries(log).filter(([day, ids]) => day >= oldest && ids.length > 0));
};

// ---- Goals: counted in this day, this week (from Sunday) or this calendar month ----

/** The first day of the current day / week / month. */
export const periodStart = (per: HabitPeriod, now: Date = new Date()): Date => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (per === 'week') start.setDate(start.getDate() - start.getDay());
  if (per === 'month') start.setDate(1);
  return start;
};

/** Days a habit was ticked in the current day / week / month. */
export const timesThisPeriod = (log: HabitLog, id: string, per: HabitPeriod, now: Date = new Date()): number => {
  const from = dayKey(periodStart(per, now));
  const to = dayKey(now);
  return Object.entries(log).filter(([day, ids]) => day >= from && day <= to && ids.includes(id)).length;
};

// ---- The day as a whole: a day counts once at least half of the daily habits are ticked ----

/** How many of `ids` were ticked on `date`. */
export const doneOn = (log: HabitLog, ids: string[], date: Date): number => {
  const day = log[dayKey(date)] || [];
  return ids.filter(id => day.includes(id)).length;
};

/** Ticks a day needs to count: half of the daily habits, rounded up. */
export const dayNeeds = (total: number) => Math.ceil(total / 2);

/** Counted days in a row up to today — or up to yesterday while today has not counted yet.
 *  `capped`: the run reaches the oldest day the log keeps, so it may be longer. */
export const keptStreak = (log: HabitLog, ids: string[], now: Date = new Date()): { days: number; capped: boolean } => {
  if (!ids.length) return { days: 0, capped: false };
  const need = dayNeeds(ids.length);
  const days = lastDays(LOG_DAYS, now).reverse(); // today first
  let i = doneOn(log, ids, days[0]) >= need ? 0 : 1;
  let run = 0;
  for (; i < days.length && doneOn(log, ids, days[i]) >= need; i++) run++;
  return { days: run, capped: run > 0 && i === days.length };
};

/** Habits ticked at least once in the current habits week: kept in `habitsStats` for the admin panel. */
export const habitsThisWeek = (log: HabitLog, now: Date = new Date()): Record<string, boolean> => {
  const start = dayKey(getHabitsWeekStart(now));
  const stats: Record<string, boolean> = {};
  for (const [day, ids] of Object.entries(log)) if (day >= start) ids.forEach(id => (stats[id] = true));
  return stats;
};
