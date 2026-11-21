// What the home page's „გააგრძელე“ button on the qvevri shows (boards x-ultra-gaagrdzele and -2): ONE thing, in this order —
// a class lesson within three hours, a new member's first step, the AI teacher's day lesson not done today, a review due
// today, the chant learned in the last seven days with a phrase still to learn, the book read last. Pure: no imports that
// load anything (the home's first load must stay small), so the learning record's rules are written out here.

import type { LessonSlot } from '../../../hooks/useClasses';

export type NextKind = 'lesson' | 'start' | 'ai' | 'review' | 'learn' | 'book';

export interface NextStep {
  kind: NextKind;
  /** the grey first line */
  kicker: string;
  /** the bold second line — cut with „…“ on a narrow phone */
  what: string;
  /** its end that always stays whole („ · ფრაზა 4 / 12“, „ · თავი 3“) */
  tail?: string;
}

export interface PartRec { level?: number; due?: string; at?: string }
export type Learning = Record<string, Record<string, PartRec>>;

const DAY_MS = 86_400_000;

/** an ISO day moved by `days` */
export const addDays = (iso: string, days: number) => new Date(Date.parse(iso + 'T12:00:00Z') + days * DAY_MS).toISOString().slice(0, 10);

/** „song-<id>-t<n>“ = a folk song's recording learned part by part; anything else is a chant version */
export const songOfPiece = (piece: string) => {
  const m = /^song-(.+)-t(\d+)$/.exec(piece);
  return m ? { songId: m[1], take: Number(m[2]) } : null;
};

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export interface LessonSoon { classId: string; start: string; where: string }

/** Today's class lesson from three hours before its start until its end (the end, else the start + 90 minutes — as the
 *  profile's „ჩემი კლასი“ counts it), the soonest first. The phone's clock, as the timetable is kept. */
export const lessonSoon = (
  classes: { id: string; name: string; schedule?: LessonSlot[]; archived?: boolean }[],
  now: Date,
): LessonSoon | null => {
  const day = now.getDay();
  const at = now.getHours() * 60 + now.getMinutes();
  let best: (LessonSoon & { from: number }) | null = null;
  for (const c of classes) {
    if (c.archived) continue;
    for (const s of c.schedule || []) {
      if (s.day !== day || !s.start) continue;
      const from = minutesOf(s.start);
      const end = s.end ? minutesOf(s.end) : from + 90;
      if (at < from - 180 || at >= end) continue;
      if (!best || from < best.from) best = { classId: c.id, start: s.start, where: s.note?.trim() || c.name, from };
    }
  }
  return best && { classId: best.classId, start: best.start, where: best.where };
};

const isDue = (r: PartRec | undefined, today: string) => !!r && (r.level ?? 0) >= 1 && !!r.due && r.due <= today;

/** The pieces with parts waiting for their review today (or overdue), most parts first (as the old home's line). */
export const dueReviews = (learning: Learning, today: string): { piece: string; count: number }[] =>
  Object.entries(learning)
    .map(([piece, rec]) => ({ piece, count: Object.values(rec || {}).filter(r => isDue(r, today)).length }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count || a.piece.localeCompare(b.piece));

/** The first part not learned yet (no record, or still being learned), from 0; -1 when every part of `n` is learned. */
export const firstOpenPart = (rec: Record<string, PartRec> | undefined, n: number) => {
  for (let i = 0; i < n; i++) if (!((rec?.[i]?.level ?? 0) >= 1)) return i;
  return -1;
};

/** The pieces worked on in the last seven days (by their parts' `at`) that still have a part to learn, newest first.
 *  `k` = the next part to learn (from 1), `n` = how many parts the learning mode counted (unknown → 0). */
export const recentPieces = (learning: Learning, parts: Record<string, number>, today: string) => {
  const since = addDays(today, -6);
  return Object.entries(learning)
    .map(([piece, rec]) => {
      const last = Object.values(rec || {}).reduce((m, r) => (r?.at && r.at > m ? r.at : m), '');
      const n = parts[piece] > 0 ? parts[piece] : 0;
      // the part count is unknown: something still being learned keeps the piece, with no number
      const open = n ? firstOpenPart(rec, n) : Object.values(rec || {}).some(r => (r?.level ?? 0) < 1) ? 0 : -1;
      return { piece, last, n, k: open + 1, open };
    })
    .filter(x => x.last >= since && x.open >= 0)
    .sort((a, b) => b.last.localeCompare(a.last) || a.piece.localeCompare(b.piece))
    .map(({ piece, last, n, k }) => ({ piece, last, n, k }));
};

export interface NextInput {
  /** a lesson of my classes within three hours */
  lesson: LessonSoon | null;
  /** nothing started: no learning record and no AI lesson day */
  fresh: boolean;
  /** the AI teacher's switch is on for me, and whether today's lesson is done; its length (the member's choice) */
  ai: { on: boolean; doneToday: boolean; minutes: 5 | 10; onShelf?: boolean };
  /** the chants' page may be opened (a new member without the AI teacher starts there) */
  galobaOpen: boolean;
  reviews: { piece: string; count: number }[];
  recent: { piece: string; k: number; n: number }[];
  book: { title: string; n: number } | null;
  /** a piece's name: a string, null = not known (skip it), undefined = still loading (wait, show nothing yet) */
  nameOf: (piece: string) => string | null | undefined;
}

/** The step to show, null for none, 'wait' while a name it needs is still on its way. The piece / class it opens is
 *  returned beside the words. */
export const pickNext = (x: NextInput): { step: NextStep; piece?: string; classId?: string } | null | 'wait' => {
  if (x.lesson) return { step: { kind: 'lesson', kicker: 'დღეს გაკვეთილია', what: `${x.lesson.start} · ${x.lesson.where}` }, classId: x.lesson.classId };
  if (x.fresh && (x.ai.on || x.galobaOpen)) {
    return { step: { kind: 'start', kicker: 'დაიწყე აქედან', what: x.ai.on ? 'გაიცანი ავტომატური სასწავლო პროგრამა' : 'გალობის სწავლა' } };
  }
  // the day lesson has its own „ავტო გაკვეთილი“ tile under the vine (2026-11-21) — the qvevri does not repeat it
  if (x.ai.on && !x.ai.doneToday && !x.ai.onShelf) {
    return { step: { kind: 'ai', kicker: 'დღის გაკვეთილი · ავტომატური სასწავლო პროგრამა', what: `${x.ai.minutes} წუთი · გამეორება და ახალი ფრაზა` } };
  }
  for (const r of x.reviews) {
    const name = x.nameOf(r.piece);
    if (name === undefined) return 'wait';
    if (name === null) continue;
    const unit = songOfPiece(r.piece) ? 'ნაწილი' : 'ფრაზა';
    return { step: { kind: 'review', kicker: 'დღეს გასამეორებელი', what: name, tail: ` · ${r.count} ${unit}` }, piece: r.piece };
  }
  for (const r of x.recent) {
    const name = x.nameOf(r.piece);
    if (name === undefined) return 'wait';
    if (name === null) continue;
    const unit = songOfPiece(r.piece) ? 'ნაწილი' : 'ფრაზა';
    return { step: { kind: 'learn', kicker: 'გააგრძელე', what: name, tail: r.n ? ` · ${unit} ${r.k} / ${r.n}` : undefined }, piece: r.piece };
  }
  if (x.book) return { step: { kind: 'book', kicker: 'გააგრძელე კითხვა', what: x.book.title, tail: ` · თავი ${x.book.n}` } };
  return null;
};
