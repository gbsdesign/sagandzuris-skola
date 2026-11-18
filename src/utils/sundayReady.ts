// „კვირის წირვა“ — how ready a member is for the coming Sunday's Liturgy (the AI teacher's step; pure part, tested in
// tests/sundayReady.test.ts). The list of chants comes from outside (the class's program for that Sunday, else the
// Liturgy's main chants — pages/v2/tsirva/useSunday.ts); here: which Sunday, which version of a chant is the member's,
// whether they know it, whether it has gone cold, and the wish the day lesson reads (`students.aiLesson.focus`).
// Nothing is invented: a chant that is not in the list is never added.

import { MONTHS_GE } from './dateNames';
import type { LearnRecord } from './learn';

/** a chant not repeated for more than this many days is „cold“ */
export const COLD_DAYS = 7;

const parse = (iso: string) => new Date(iso + 'T12:00:00Z');
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const dayGap = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000);

/** The coming Sunday — today, when today is one. */
export const comingSunday = (today: string) => {
  const d = parse(today);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return fmt(d);
};

/** The „კვირის წირვა“ line shows from Wednesday to Sunday. */
export const showSundayEntry = (today: string) => [3, 4, 5, 6, 0].includes(parse(today).getUTCDay());

/** „22 ნოემბერი“ */
export const dayName = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS_GE[Number(iso.slice(5, 7)) - 1]}`;

/** One chant of the Sunday: all the versions the books have (`vids`), the one to practise by default (`pick`). */
export interface SundayChant { key: string; title: string; vids: string[]; pick: string }

/** Chants out of a list of version ids: one per chant (its first version in the list is the default), in the list's order.
 *  `resolve` tells a version's chant (null = not in the books: left out). */
export const groupChants = (
  vids: readonly string[],
  resolve: (vid: string) => { key: string; title: string; vids: string[] } | null,
): SundayChant[] => {
  const out: SundayChant[] = [];
  const seen = new Set<string>();
  for (const vid of vids) {
    const c = resolve(vid);
    if (!c || seen.has(c.key)) continue;
    seen.add(c.key);
    out.push({ key: c.key, title: c.title, vids: c.vids.includes(vid) ? c.vids : [vid, ...c.vids], pick: vid });
  }
  return out;
};

type Marks = { voices?: unknown; isLearned?: boolean } | null | undefined;
const marked = (m: Marks) => {
  if (!m) return false;
  if (m.isLearned) return true;
  const v = m.voices;
  const list = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').map(s => s.trim()) : [];
  return list.some(x => x === '1' || x === '2' || x === '3');
};

export interface Knowledge {
  learning: Record<string, LearnRecord>;
  /** phrases a piece has (students.learnParts) */
  parts: Record<string, number>;
  /** the member's path marks (students.selectedChantVariants) */
  path: Record<string, Marks>;
  /** a teacher's / the AI's passes (utils/aiPass): version id → voices */
  confirmed: Record<string, readonly unknown[]>;
  today: string;
}

const lastDay = (rec: LearnRecord | undefined) =>
  Object.values(rec || {}).reduce((m, r) => (r.at > m ? r.at : m), '');

/** Every phrase of the piece learned in the learning mode (level ≥ 1). */
const allLearned = (rec: LearnRecord | undefined, n: number) => {
  const done = Object.entries(rec || {}).filter(([k, r]) => r.level >= 1 && (!n || Number(k) < n)).length;
  const need = n || Object.keys(rec || {}).length;
  return need > 0 && done >= need;
};

/** Whether the member knows this version: learned in the learning mode, or its voice marked on the path or confirmed. */
export const knowsPiece = (vid: string, k: Knowledge) =>
  allLearned(k.learning[vid], k.parts[vid] || 0) || marked(k.path[vid]) || (k.confirmed[vid]?.length ?? 0) > 0;

/** The member's version of a chant: the one learned (the latest practised), else marked / confirmed on the path, else the default. */
export const myVersion = (c: SundayChant, k: Knowledge) => {
  const learned = c.vids.filter(v => Object.keys(k.learning[v] || {}).length > 0)
    .sort((a, b) => lastDay(k.learning[b]).localeCompare(lastDay(k.learning[a])));
  return learned[0] ?? c.vids.find(v => marked(k.path[v]) || (k.confirmed[v]?.length ?? 0) > 0) ?? c.pick;
};

export type ReadyState = 'known' | 'old' | 'new';
export interface ReadyRow { key: string; title: string; piece: string; state: ReadyState; /** days since last practised (old only) */ days?: number }

export const readyOf = (chants: readonly SundayChant[], k: Knowledge) => {
  const rows: ReadyRow[] = chants.map(c => {
    const piece = myVersion(c, k);
    const know = c.vids.some(v => knowsPiece(v, k));
    if (!know) return { key: c.key, title: c.title, piece, state: 'new' as const };
    const last = lastDay(k.learning[piece]);
    const days = last ? dayGap(last, k.today) : 0;
    return days > COLD_DAYS
      ? { key: c.key, title: c.title, piece, state: 'old' as const, days }
      : { key: c.key, title: c.title, piece, state: 'known' as const };
  });
  return { rows, known: rows.filter(r => r.state !== 'new').length, total: rows.length };
};

/** „12 დღეა არ გიმეორია“ */
export const oldLine = (days: number) => `${days} დღეა არ გიმეორია`;

export interface Focus { until: string; pieces: string[] }

/** The wish the day lesson reads: the chants still to learn first, then the cold ones; valid through the Sunday. */
export const focusOf = (rows: readonly ReadyRow[], sunday: string): Focus => ({
  until: sunday,
  pieces: [...rows.filter(r => r.state === 'new'), ...rows.filter(r => r.state === 'old')].map(r => r.piece),
});

/** The pieces the lesson prefers today: none once `until` is past, or when the record is not as written. */
export const activeFocus = (f: unknown, today: string): string[] => {
  if (!f || typeof f !== 'object') return [];
  const { until, pieces } = f as Partial<Focus>;
  if (typeof until !== 'string' || !Array.isArray(pieces) || until < today) return [];
  return pieces.filter((p): p is string => typeof p === 'string');
};
