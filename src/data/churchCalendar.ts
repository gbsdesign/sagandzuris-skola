import { useEffect, useState } from 'react';

// orthodoxy.ge's day calendar ("მხოლოდ თანამედროვე ქართული კალენდარი"), one file per church (old-style) year,
// made by scripts/fetch-church-calendar.mjs. Days are keyed by the new-style date (YYYY-MM-DD).

/** a run of text: [text, flags] — flags: 1 bold, 2 red, 4 small print */
export type CalRun = [string, number?];
/** a paragraph; an empty one is a blank line in the source */
export type CalPara = CalRun[];
/** one commemoration as written in the calendar: n = name, d = the trailing "(…)", b = feast (bold);
 *  l = its life in the library (scripts/fetch-saint-lives.mjs) and at = [paragraph, start, end] where it
 *  stands in the day's text; ls = one link per sentence when a line holds a feast and a saint:
 *  [from, to (within n), life, paragraph, start, end] */
export interface CalSaint {
  n: string; d?: string; b?: 1;
  l?: string; at?: [number, number, number];
  ls?: [number, number, string, number?, number?, number?][];
}
export interface CalendarDay { t: string; p: CalPara[]; s: CalSaint[] }
interface CalendarYear { year: number; source: string; days: Record<string, CalendarDay> }

export const RUN_BOLD = 1;
export const RUN_RED = 2;
export const RUN_SMALL = 4;

const YEARS = import.meta.glob<{ default: CalendarYear }>('./calendar/*.json');

export const MONTHS_GE = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
export const WEEKDAYS_GE = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

// Julian → Gregorian difference for 1900–2099
const OLD_STYLE_LAG = 13;

const pad = (n: number) => String(n).padStart(2, '0');

/** local calendar date (noon, so DST changes never move the day) */
export const fromIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const todayIso = () => toIso(new Date());
export const addDays = (iso: string, n: number) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
export const daysBetween = (fromIsoDate: string, toIsoDate: string) =>
  Math.round((fromIso(toIsoDate).getTime() - fromIso(fromIsoDate).getTime()) / 86400000);

/** the same day in the old (Julian) style: { year, month 1–12, day } */
export const oldStyleOf = (iso: string) => {
  const d = fromIso(addDays(iso, -OLD_STYLE_LAG));
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
};
/** new-style ISO date of an old-style day */
export const fromOldStyle = (year: number, month: number, day: number) => addDays(`${year}-${pad(month)}-${pad(day)}`, OLD_STYLE_LAG);

/** days in a month; old style leaps every fourth year */
export const daysInMonth = (year: number, month: number, oldStyle = false) =>
  oldStyle ? [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] : new Date(year, month, 0).getDate();

/** "5 ოქტომბერი" */
export const dayMonthGe = (iso: string) => {
  const d = fromIso(iso);
  return `${d.getDate()} ${MONTHS_GE[d.getMonth()]}`;
};
/** "22 სექტემბერი" — the old-style day of a new-style date */
export const oldDayMonthGe = (iso: string) => {
  const o = oldStyleOf(iso);
  return `${o.day} ${MONTHS_GE[o.month - 1]}`;
};
export const weekdayGe = (iso: string) => WEEKDAYS_GE[fromIso(iso).getDay()];

/** Orthodox Easter, new style (the formula of orthodoxy.ge/calendar/agdgoma.htm, valid 1900–2099) */
export const easterIso = (year: number) => {
  const a = (19 * (year % 19) + 16) % 30;
  const b = (2 * (year % 4) + 4 * (year % 7) + 6 * a) % 7;
  return addDays(`${year}-04-03`, a + b);
};

/** the church (old-style) year whose file holds this day */
const churchYearOf = (iso: string) => oldStyleOf(iso).year;

export const hasCalendarFor = (iso: string) => `./calendar/${churchYearOf(iso)}.json` in YEARS;

/** the day's page on orthodoxy.ge */
export const calendarSourceUrl = (iso: string) => {
  const o = oldStyleOf(iso);
  return `https://www.orthodoxy.ge/calendar/${o.year}/v2/${pad(o.month)}/${pad(o.day)}${pad(o.month)}.htm`;
};
export const CALENDAR_HOME_URL = 'https://www.orthodoxy.ge/kalendari.htm';

const loaded = new Map<number, Promise<CalendarYear | null>>();
const loadYear = (year: number) => {
  if (!loaded.has(year)) {
    const load = YEARS[`./calendar/${year}.json`];
    loaded.set(year, load ? load().then(m => m.default).catch(() => null) : Promise.resolve(null));
  }
  return loaded.get(year)!;
};

export const loadCalendarDay = async (iso: string): Promise<CalendarDay | null> => {
  const year = await loadYear(churchYearOf(iso));
  return year?.days[iso] ?? null;
};

/** the day's calendar entry: undefined while loading, null when orthodoxy.ge has not published it */
export const useCalendarDay = (iso: string | null) => {
  const [state, setState] = useState<{ iso: string | null; day: CalendarDay | null | undefined }>({ iso: null, day: undefined });
  useEffect(() => {
    if (!iso) return;
    let alive = true;
    loadCalendarDay(iso).then(day => { if (alive) setState({ iso, day }); });
    return () => { alive = false; };
  }, [iso]);
  return state.iso === iso ? state.day : undefined;
};

// The footer calendar can be opened from anywhere (today's-saints card, the feasts list):
// openChurchCalendar(date) tells it to unfold on that day.
export const CALENDAR_EVENT = 'open-church-calendar';
export const openChurchCalendar = (iso?: string) =>
  window.dispatchEvent(new CustomEvent(CALENDAR_EVENT, { detail: iso ?? todayIso() }));
