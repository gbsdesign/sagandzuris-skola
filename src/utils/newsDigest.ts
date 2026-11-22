// „აპის სიახლეები“ as one short summary a day (2026-11-22, the user: „აპის სიახლეები წარამარა კი არ გაიგზავნოს არამედ ყოველ
// საღამოს დაჯამდეს რაც გაკეთდა და ისე მიიწეროს მოკლედ და ლაკონურად“): every line of data/appNews.ts still goes in when its
// change reaches the site, but the bell shows a day's lines only once that day's evening comes (21:00, Tbilisi), gathered into
// one notice — „სიახლეები · 22 ნოემბერი“ with each change's title as a line.

import { MONTHS_GE } from './dateNames';

export interface NewsLine {
  id: string;
  /** YYYY-MM-DD (Tbilisi) */
  date: string;
  title: string;
}

export interface NewsDay {
  /** `day-<date>`: the bell keys on it */
  id: string;
  date: string;
  /** ms: the day's evening */
  at: number;
  title: string;
  text: string;
}

/** the hour a day's summary comes, Tbilisi time */
export const DIGEST_HOUR = 21;

/** a day's evening in ms (Tbilisi is UTC+4 all year) */
export const digestAt = (date: string) => new Date(`${date}T${DIGEST_HOUR}:00:00+04:00`).getTime();

const dayName = (date: string) => {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS_GE[m - 1] ?? ''}`.trim();
};

/** one summary a day whose evening has come, newest day first; a day's lines keep the list's order */
export const newsDays = (news: NewsLine[], now: number): NewsDay[] => {
  const byDay = new Map<string, NewsLine[]>();
  for (const n of news) {
    const list = byDay.get(n.date);
    if (list) list.push(n); else byDay.set(n.date, [n]);
  }
  const out: NewsDay[] = [];
  for (const [date, lines] of byDay) {
    const at = digestAt(date);
    if (!(at <= now)) continue;
    out.push({ id: `day-${date}`, date, at, title: `სიახლეები · ${dayName(date)}`, text: lines.map(l => `• ${l.title}`).join('\n') });
  }
  return out.sort((a, b) => b.at - a.at);
};
