import { tbilisiToday } from './hangi';

// „სკოლის ზრდა“ (admin review, idea 12, 2026-10-28) in ⚙ „სკოლა“: new members by month — from each record's `createdAt`,
// so the whole past shows at once — and active members by week. A member's record keeps only the last time they came,
// so the weeks cannot be counted backwards: each time an admin opens the panel, this week's count (members who opened the
// app in the last 7 days; staff and „გასული“ aside) is kept in settings/growth { weeks: { <Monday>: n } }, the largest of
// the week (hooks/useGrowth.ts). The weeks therefore begin on the day this was switched on. Tested in tests/adminTools.test.ts.

const DAY = 86_400_000;
const utc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The Monday of the week holding the day (YYYY-MM-DD). */
export const mondayOf = (day: string) => {
  const t = utc(day);
  const back = (new Date(t).getUTCDay() + 6) % 7;
  return isoOf(t - back * DAY);
};

/** New records per month, the last `n` months up to today's (Georgian days); months as YYYY-MM. */
export const monthCounts = (createdAts: string[], today: string, n = 12) => {
  const months: string[] = [];
  let y = +today.slice(0, 4), m = +today.slice(5, 7);
  for (let i = 0; i < n; i++) {
    months.unshift(`${y}-${String(m).padStart(2, '0')}`);
    if (--m === 0) { m = 12; y--; }
  }
  const count = new Map(months.map(k => [k, 0]));
  for (const at of createdAts) {
    const ms = Date.parse(at);
    if (Number.isNaN(ms)) continue;
    const k = tbilisiToday(ms).slice(0, 7);
    if (count.has(k)) count.set(k, count.get(k)! + 1);
  }
  return months.map(key => ({ key, n: count.get(key)! }));
};

/** The last `n` weeks up to this one, from the first week kept on (none before it: the count began then); a week no admin
 *  opened the panel in has no number (null — not known, not 0). */
export const weekSeries = (weeks: Record<string, number>, today: string, n = 12): { key: string; n: number | null }[] => {
  const last = utc(mondayOf(today));
  const keys = Array.from({ length: n }, (_, i) => isoOf(last - (n - 1 - i) * 7 * DAY));
  const first = Object.keys(weeks).filter(k => typeof weeks[k] === 'number').sort()[0];
  return keys.filter(k => first && k >= first).map(key => ({ key, n: typeof weeks[key] === 'number' ? weeks[key] : null }));
};

/** Who opened the app in the 7 days before `now`. */
export const activeIn7 = (lastActiveAt: string, now = Date.now()) => !!lastActiveAt && now - Date.parse(lastActiveAt) < 7 * DAY;
