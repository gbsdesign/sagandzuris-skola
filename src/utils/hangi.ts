// „დღის ჰანგი“ — the daily listening game of the games hub (2026-10-28, Heardle-like): the whole school gets one
// recording a day; the player hears its first second, then 2, 4, 7, 11 and 16 seconds, and names it from the pool's
// titles. These helpers are pure (no DOM, no Firestore) and tested in tests/hangi.test.ts; the page is
// pages/games/HangiGame.tsx, the pool data/hangiPool.ts, the saved days hooks/useHangi.ts.
import { searchNormalize } from './searchMatch';

/** Seconds of the recording unlocked after each try (Heardle's ladder). */
export const SNIPPETS = [1, 2, 4, 7, 11, 16] as const;
export const MAX_TRIES = SNIPPETS.length;
/** Day №1 of the game. */
export const FIRST_DAY = '2026-10-28';

const DAY_MS = 86_400_000;
const utcDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Today in Georgia (UTC+4) as YYYY-MM-DD — the same day on every phone, whatever its own clock zone. */
export const tbilisiToday = (now = Date.now()) => new Date(now + 4 * 3_600_000).toISOString().slice(0, 10);
/** The day before (YYYY-MM-DD). */
export const dayBefore = (iso: string) => new Date(utcDay(iso) - DAY_MS).toISOString().slice(0, 10);
/** The game's day number: FIRST_DAY is №1. */
export const dayNumber = (iso: string) => Math.round((utcDay(iso) - utcDay(FIRST_DAY)) / DAY_MS) + 1;

/** FNV-1a, 32-bit, over the UTF-16 units — small, fast and the same on every device. */
export const hash32 = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

const rank = <T extends { id: string }>(pool: T[], iso: string) =>
  pool
    .map(it => ({ it, h: hash32(`${iso}|${it.id}`) }))
    .sort((a, b) => b.h - a.h || (a.it.id < b.it.id ? -1 : 1))
    .map(x => x.it);

/**
 * The day's pick: the pool item whose hash with the day is highest ("rendezvous" hashing), so a recording added to the
 * pool later changes only the days it wins — past days keep their picks. The day's second best stands in when the best
 * also led the day before, so no recording comes two days in a row.
 */
export const pickOfDay = <T extends { id: string }>(pool: T[], iso: string): T | undefined => {
  if (!pool.length) return undefined;
  const ranked = rank(pool, iso);
  const yesterday = rank(pool, dayBefore(iso))[0];
  return ranked.find(x => x.id !== yesterday?.id) ?? ranked[0];
};

/** One day's record: the titles named in order ('' = skipped), whether the last one was right, whether the day is over. */
export interface HangiDay {
  id: string;
  guesses: string[];
  won: boolean;
  done: boolean;
}

export const emptyDay = (id: string): HangiDay => ({ id, guesses: [], won: false, done: false });

export const sameTitle = (a: string, b: string) => searchNormalize(a) === searchNormalize(b);

/** The record after a try: `guess` is the title named, '' for a skip. */
export const afterGuess = (day: HangiDay, guess: string, answer: string): HangiDay => {
  if (day.done) return day;
  const won = Boolean(guess) && sameTitle(guess, answer);
  const guesses = [...day.guesses, guess];
  return { ...day, guesses, won, done: won || guesses.length >= MAX_TRIES };
};

/** Seconds the player may hear now: one step up the ladder after each try; the whole recording once the day is over. */
export const unlockedSeconds = (day: HangiDay) => (day.done ? Infinity : SNIPPETS[Math.min(day.guesses.length, MAX_TRIES - 1)]);

/** Titles that contain the typed text, the earliest and shortest matches first. */
export const suggestTitles = (titles: string[], query: string, limit = 8): string[] => {
  const q = searchNormalize(query.trim());
  if (!q) return [];
  return titles
    .map(t => ({ t, i: searchNormalize(t).indexOf(q) }))
    .filter(x => x.i >= 0)
    .sort((a, b) => a.i - b.i || a.t.length - b.t.length || (a.t < b.t ? -1 : 1))
    .slice(0, limit)
    .map(x => x.t);
};

export interface HangiStats {
  played: number;
  won: number;
  /** won days in a row up to today (or up to yesterday while today is still open) */
  streak: number;
  best: number;
  /** wins by the number of tries they took, index 0 = first try */
  dist: number[];
}

export const hangiStats = (days: Record<string, HangiDay>, today: string): HangiStats => {
  const done = Object.entries(days).filter(([, d]) => d.done).sort(([a], [b]) => (a < b ? -1 : 1));
  const dist = Array.from({ length: MAX_TRIES }, () => 0);
  let won = 0;
  done.forEach(([, d]) => {
    if (d.won) { won++; dist[Math.min(d.guesses.length, MAX_TRIES) - 1]++; }
  });
  let streak = 0;
  let cursor = days[today]?.done ? today : dayBefore(today);
  while (days[cursor]?.done && days[cursor].won) { streak++; cursor = dayBefore(cursor); }
  let best = 0, run = 0, prev = '';
  done.forEach(([iso, d]) => {
    run = !d.won ? 0 : prev && dayBefore(iso) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = iso;
  });
  return { played: done.length, won, streak, best, dist };
};

const SQUARE = { skip: '⬛', wrong: '🟥', right: '🟩', unused: '⬜' };

/** The result as Wordle-style squares, without the answer — for the clipboard or the share sheet. */
export const shareText = (n: number, day: HangiDay, site = 'sagandzureli.ge') => {
  const squares = day.guesses.map((g, i) => (day.won && i === day.guesses.length - 1 ? SQUARE.right : g ? SQUARE.wrong : SQUARE.skip));
  while (squares.length < MAX_TRIES) squares.push(SQUARE.unused);
  return `დღის ჰანგი №${n} · ${day.won ? day.guesses.length : 'X'}/${MAX_TRIES}\n${squares.join('')}\nსაგანძურის სკოლა · ${site}`;
};

/** One line for the games hub's row: today's result, or the streak while today is still open. */
export const hangiMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return d.won ? `დღეს გამოიცანი: ${d.guesses.length}/${MAX_TRIES}` : 'დღეს ვერ გამოიცანი';
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
