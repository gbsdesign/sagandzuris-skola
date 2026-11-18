// Small pure helpers of the calendar page (board x-kalendari): the saint's second line, a reading's short form, the nearest
// great feast, a month's grid.
import { addDays, daysBetween, fromIso, toIso, type CalSaint, type CalendarDay } from '../../../data/churchCalendar';
import { greatFeastOf, type Great } from '../../../utils/dayService';
import type { Reading } from '../../../utils/dayReadings';

export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** „1308“ → „†1308“ (the year of repose), „IV“ → „IV საუკუნე“, anything else as written */
export const saintSub = (d?: string): string | undefined => {
  const t = (d ?? '').trim().replace(/[.;,]+$/, '');
  if (!t) return undefined;
  if (/^\d{2,4}$/.test(t)) return `†${t}`;
  if (/^[IVX]+$/.test(t)) return `${t} საუკუნე`;
  return t;
};

/** a commemoration's name as the calendar writes it, without its closing stop */
export const saintName = (s: CalSaint) => s.n.trim().replace(/[.;,]+$/, '');

/** the life a whole line opens: its own, or the one link of a line holding one */
export const saintLife = (s: CalSaint): string | undefined => s.l ?? s.ls?.[0]?.[2];

/** „2 თეს. 1:1–10“ */
export const readingShort = (r: Reading) => `${r.abbr} ${r.ref.replace(/\s*:\s*/g, ':').replace(/\s*-\s*/g, '–')}`;

/** the first great feast on or after `from` (the twelve and Pascha), within a year */
export const nextGreatFeast = (from: string): { iso: string; great: Great; inDays: number } | null => {
  for (let i = 0; i <= 370; i++) {
    const iso = addDays(from, i);
    const great = greatFeastOf(iso);
    if (great) return { iso, great, inDays: daysBetween(from, iso) };
  }
  return null;
};

/** the feast's own wording in the calendar (its first bold line), else the short name */
export const feastTitle = (great: Great, day: CalendarDay | null | undefined) => {
  const bold = day?.s.find(s => s.b);
  const n = bold ? saintName(bold) : '';
  return n && n.length <= 50 ? n : great.name;
};

export const inDaysText = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

/** the month's days, Monday first: null for the empty places before the 1st and after the last */
export const monthGrid = (year: number, month: number): (string | null)[] => {
  const first = new Date(year, month - 1, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toIso(new Date(year, month - 1, d, 12)));
  while (cells.length % 7) cells.push(null);
  return cells;
};

export const WEEK_SHORT = ['ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა', 'კვ'];

export const isGreat = (iso: string) => !!greatFeastOf(iso);

export const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

export const yearOf = (iso: string) => fromIso(iso).getFullYear();
