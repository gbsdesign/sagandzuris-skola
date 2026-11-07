// A church's weekly hours from Google Maps (Places API (New) `regularOpeningHours.periods`) as short Georgian lines,
// Monday first, days with the same hours joined: „ორშაბათი–პარასკევი · 7:00–22:00“, „შაბათი, კვირა · 7:00–21:00“,
// „ყოველდღე · 24 საათი“. Google's own `weekdayDescriptions` come in AM/PM even in Georgian, so the lines are made here.
// Shown in a church's window (pages/churches/ChurchCard.tsx, `GoogleInfoPart`).

export interface GPoint { day?: number; hour?: number; minute?: number }
export interface GPeriod { open?: GPoint; close?: GPoint }

/** Google's day numbers: 0 = Sunday */
export const DAY_NAMES = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const mins = (p?: GPoint) => (p?.hour ?? 0) * 60 + (p?.minute ?? 0);
const hm = (p: GPoint | undefined, closing = false) => {
  const m = mins(p);
  const h = closing && m === 0 ? 24 : Math.floor(m / 60);
  return `${h}:${String(m % 60).padStart(2, '0')}`;
};

export interface HoursLine { days: string; hours: string; today: boolean }

/** the week in lines; `today` = Google's day number of today (Tbilisi) */
export const hoursLines = (periods: GPeriod[] | undefined, today: number): HoursLine[] => {
  const list = (periods ?? []).filter(p => p.open && p.open.day !== undefined);
  if (!list.length) return [];
  // open all the time: one period from Sunday 0:00 that never closes
  if (list.length === 1 && !list[0].close && mins(list[0].open) === 0) return [{ days: 'ყოველდღე', hours: '24 საათი', today: true }];
  const byDay = new Map<number, string[]>();
  for (const p of [...list].sort((a, b) => mins(a.open) - mins(b.open))) {
    const t = p.close ? `${hm(p.open)}–${hm(p.close, true)}` : `${hm(p.open)}-დან`;
    byDay.set(p.open!.day!, [...(byDay.get(p.open!.day!) ?? []), t]);
  }
  const runs: { days: number[]; hours: string }[] = [];
  for (const d of WEEK) {
    const hours = byDay.get(d)?.join(', ') ?? 'დაკეტილია';
    const last = runs[runs.length - 1];
    if (last && last.hours === hours) last.days.push(d); else runs.push({ days: [d], hours });
  }
  if (runs.length === 1) return [{ days: 'ყოველდღე', hours: runs[0].hours, today: true }];
  return runs.map(({ days, hours }) => ({
    days: days.length === 1 ? DAY_NAMES[days[0]]
      : days.length === 2 ? `${DAY_NAMES[days[0]]}, ${DAY_NAMES[days[1]]}`
        : `${DAY_NAMES[days[0]]}–${DAY_NAMES[days[days.length - 1]]}`,
    hours,
    today: days.includes(today),
  }));
};

/** today's Google day number in Tbilisi (0 = Sunday) */
export const tbilisiWeekday = (now = Date.now()) => new Date(now + 4 * 3600 * 1000).getUTCDay();

/** „sameba.ge“ from a website's address, for the link's text */
export const siteName = (uri: string) => {
  try {
    const u = new URL(uri);
    const host = u.hostname.replace(/^www\./, '');
    return host === 'facebook.com' || host === 'm.facebook.com' ? 'Facebook' : host;
  } catch { return uri; }
};
