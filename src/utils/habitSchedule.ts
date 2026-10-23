import type { HabitSchedule } from './myHabits';
import { dayKey } from './habitsWeek';
import { addDays, parseDay } from './habitStats';

// „მორგებული“: the days a habit with its own schedule is due (every N days, weeks on chosen weekdays — weeks start on
// Monday — or months on the start's day, the month's last day when it is shorter), and its numbers on those days only.

const DAY = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** The pattern alone — no end, no count. */
const fits = (s: HabitSchedule, start: Date, date: Date): boolean => {
  const every = Math.max(1, s.every);
  if (s.unit === 'day') return daysBetween(start, date) % every === 0;
  if (s.unit === 'week') {
    const days = s.days?.length ? s.days : [start.getDay()];
    return days.includes(date.getDay()) && (daysBetween(monday(start), monday(date)) / 7) % every === 0;
  }
  const months = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return months % every === 0 && date.getDate() === Math.min(start.getDate(), last);
};

/** Is the habit due on this day? */
export const isDue = (s: HabitSchedule, date: Date): boolean => {
  const key = dayKey(date);
  if (key < s.start || (s.until && key > s.until)) return false;
  const start = parseDay(s.start);
  if (!fits(s, start, date)) return false;
  if (!s.count) return true;
  // the day is one of the first `count` due days
  let n = 0;
  for (let d = start; dayKey(d) <= key; d = addDays(d, 1)) if (fits(s, start, d) && ++n > s.count) return false;
  return true;
};

/** The due days from `from` up to `to`, both included, oldest first. */
const dueDays = (s: HabitSchedule, from: Date, to: Date): Date[] => {
  const out: Date[] = [];
  const begin = dayKey(from) > s.start ? from : parseDay(s.start);
  for (let d = begin; dayKey(d) <= dayKey(to); d = addDays(d, 1)) if (isDue(s, d)) out.push(d);
  return out;
};

/** Due days ticked in a row up to now; today joins once ticked, until then the run up to the day before shows. */
export const planRun = (s: HabitSchedule, ticks: Set<string>, first: string | null, now: Date = new Date()): number => {
  if (!first) return 0;
  const days = dueDays(s, parseDay(first), now).reverse();
  let i = days.length && dayKey(days[0]) === dayKey(now) && !ticks.has(dayKey(now)) ? 1 : 0;
  let run = 0;
  for (; i < days.length && ticks.has(dayKey(days[i])); i++) run++;
  return run;
};

/** How many due days were ticked (today counts once ticked), optionally only between `from` and `to`. */
export const planShare = (s: HabitSchedule, ticks: Set<string>, first: string | null, now: Date = new Date(), from?: Date, to?: Date) => {
  if (!first) return { met: 0, of: 0, percent: 0 };
  const today = dayKey(now);
  const begin = from && dayKey(from) > first ? from : parseDay(first);
  const end = to && dayKey(to) < today ? to : now;
  let met = 0;
  let of = 0;
  for (const d of dueDays(s, begin, end)) {
    const ok = ticks.has(dayKey(d));
    if (ok) met++;
    if (ok || dayKey(d) < today) of++;
  }
  return { met, of, percent: of ? Math.round((met / of) * 100) : 0 };
};
