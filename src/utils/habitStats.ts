import type { HabitPeriod } from '../data/habitsAndManera';
import { DayIds, HabitLog, dayKey, dayNeeds, doneOn, idsOn, periodStart } from './habitsWeek';

// Numbers for the habits' views (დღე · კვირა · თვე · წელი) and a habit's own page: runs, the best run, how often
// the goal was met. The history starts on the first ticked day — nothing before it counts as missed.

export interface HabitGoal {
  times: number;
  per: HabitPeriod;
}

export const addDays = (date: Date, n: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

/** 'YYYY-MM-DD' back to a local date. */
export const parseDay = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The period `n` steps after the one starting at `start` (before it, when `n` is negative). */
export const shiftPeriod = (start: Date, per: HabitPeriod, n: number): Date =>
  per === 'month' ? new Date(start.getFullYear(), start.getMonth() + n, 1) : addDays(start, per === 'week' ? 7 * n : n);

/** The days of the period starting at `start`. */
export const periodDays = (start: Date, per: HabitPeriod): Date[] => {
  const end = dayKey(shiftPeriod(start, per, 1));
  const days: Date[] = [];
  for (let d = start; dayKey(d) < end; d = addDays(d, 1)) days.push(d);
  return days;
};

/** The first day anything was ticked: where the member's history begins. */
export const historyStart = (log: HabitLog): string | null => {
  let first: string | null = null;
  for (const [day, ids] of Object.entries(log)) if (ids?.length && (!first || day < first)) first = day;
  return first;
};

/** The days one habit was ticked. */
export const ticksOf = (log: HabitLog, id: string): Set<string> => new Set(Object.keys(log).filter(day => log[day]?.includes(id)));

/** Times the habit was ticked in the period starting at `start`. */
export const timesIn = (ticks: Set<string>, start: Date, per: HabitPeriod): number =>
  periodDays(start, per).filter(d => ticks.has(dayKey(d))).length;

/** Periods in a row that met the goal, up to now. The current period joins once it is met; while it is
 *  still open, the run up to the one before it shows. */
export const currentRun = (ticks: Set<string>, goal: HabitGoal, first: string | null, now: Date = new Date()): number => {
  if (!first) return 0;
  let start = periodStart(goal.per, now);
  let run = timesIn(ticks, start, goal.per) >= goal.times ? 1 : 0;
  for (start = shiftPeriod(start, goal.per, -1); dayKey(shiftPeriod(start, goal.per, 1)) > first; start = shiftPeriod(start, goal.per, -1)) {
    if (timesIn(ticks, start, goal.per) < goal.times) break;
    run++;
  }
  return run;
};

/** The longest run of periods that met the goal. */
export const bestRun = (ticks: Set<string>, goal: HabitGoal, first: string | null, now: Date = new Date()): number => {
  if (!first) return 0;
  const current = dayKey(periodStart(goal.per, now));
  let best = 0;
  let run = 0;
  for (let start = periodStart(goal.per, parseDay(first)); dayKey(start) <= current; start = shiftPeriod(start, goal.per, 1)) {
    if (timesIn(ticks, start, goal.per) >= goal.times) best = Math.max(best, ++run);
    else if (dayKey(start) < current) run = 0;
  }
  return best;
};

/** How often the goal was met between `from` and `to` (both cut to the history and to now). The current period
 *  counts only once it is met, so an unfinished today does not pull the share down. */
export const goalShare = (
  ticks: Set<string>,
  goal: HabitGoal,
  first: string | null,
  from?: Date,
  to?: Date,
  now: Date = new Date()
): { met: number; of: number; percent: number } => {
  if (!first) return { met: 0, of: 0, percent: 0 };
  const startKey = from && dayKey(from) > first ? dayKey(from) : first;
  const current = dayKey(periodStart(goal.per, now));
  const last = to && dayKey(to) < dayKey(now) ? dayKey(periodStart(goal.per, to)) : current;
  let met = 0;
  let of = 0;
  for (let start = periodStart(goal.per, parseDay(startKey)); dayKey(start) <= last; start = shiftPeriod(start, goal.per, 1)) {
    const ok = timesIn(ticks, start, goal.per) >= goal.times;
    if (ok) met++;
    if (ok || dayKey(start) < current) of++;
  }
  return { met, of, percent: of ? Math.round((met / of) * 100) : 0 };
};

/** Ticked days between two days, both included. */
export const ticksBetween = (ticks: Set<string>, from: Date, to: Date): number => {
  const a = dayKey(from);
  const b = dayKey(to);
  let n = 0;
  for (const day of ticks) if (day >= a && day <= b) n++;
  return n;
};

/** The habit's count in each of the last `n` periods, oldest first: the bars on its page. */
export const lastPeriods = (ticks: Set<string>, per: HabitPeriod, n: number, now: Date = new Date()): { start: Date; times: number }[] => {
  const current = periodStart(per, now);
  return Array.from({ length: n }, (_, i) => {
    const start = shiftPeriod(current, per, i - (n - 1));
    return { start, times: timesIn(ticks, start, per) };
  });
};

/** A day as a whole: daily habits ticked, and whether it counts (half of them at least). */
export const dayState = (log: HabitLog, dailyIds: DayIds, date: Date) => {
  const due = idsOn(dailyIds, date);
  const total = due.length;
  const done = doneOn(log, due, date);
  return { done, total, share: total ? done / total : 0, counted: total > 0 && done >= dayNeeds(total) };
};

/** The share of daily ticks over some days (only those from the history's start up to today). */
export const daysShare = (log: HabitLog, dailyIds: DayIds, days: Date[], first: string | null, now: Date = new Date()) => {
  const today = dayKey(now);
  const counted = days.filter(d => first && dayKey(d) >= first && dayKey(d) <= today);
  const total = counted.reduce((n, d) => n + idsOn(dailyIds, d).length, 0);
  if (!counted.length || !total) return null;
  const done = counted.reduce((n, d) => n + doneOn(log, idsOn(dailyIds, d), d), 0);
  return {
    percent: Math.round((done / total) * 100),
    countedDays: counted.filter(d => dayState(log, dailyIds, d).counted).length,
  };
};

/** A month as weeks for a calendar, Sunday first (as the habits' week); days of other months are null. */
export const monthWeeks = (year: number, month: number): (Date | null)[][] => {
  const first = new Date(year, month, 1);
  const weeks: (Date | null)[][] = [];
  let start = addDays(first, -first.getDay());
  do {
    const from = start;
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i);
      return d.getMonth() === month ? d : null;
    }));
    start = addDays(start, 7);
  } while (start.getMonth() === month);
  return weeks;
};

/** A year as week columns, Sunday on top; days of other years are null. */
export const yearWeeks = (year: number): (Date | null)[][] => {
  const weeks: (Date | null)[][] = [];
  for (let start = addDays(new Date(year, 0, 1), -new Date(year, 0, 1).getDay()); start.getFullYear() <= year; start = addDays(start, 7)) {
    const from = start;
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i);
      return d.getFullYear() === year ? d : null;
    }));
  }
  return weeks;
};
