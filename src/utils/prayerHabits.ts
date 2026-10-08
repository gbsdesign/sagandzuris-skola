import { AKATHISTS, APOSTLE, GOSPELS, KATHISMAS, MORNING_EVENING, PRAYER_HOURS, bibleChapterId, parseBibleId } from '../data/prayers';

/** The habit a prayer counts for: reading it is that habit done for today (see data/habitsAndManera). */
export const habitOfPrayer = (id: string): string | null => {
  if (MORNING_EVENING.some(p => p.id === id) || /^week-\d-(dila|dzili)$/.test(id)) return 'habit_1';
  if (PRAYER_HOURS.some(h => h.id === id)) return 'habit_13';
  if (KATHISMAS.some(k => k.id === id)) return 'habit_6';
  if (AKATHISTS.some(a => a.id === id)) return 'habit_7';
  const bible = parseBibleId(id);
  if (bible) return bible.gospel ? 'habit_2' : 'habit_3';
  return null;
};

// "გააგრძელე": the last chapter or akathist opened from each list, kept on this device.
export type ReadingList = 'gospel' | 'apostle' | 'akathists';
export interface LastRead { id: string; finished: boolean }

const KEY = (list: ReadingList) => `lastRead:${list}`;

export const readingListOf = (id: string): ReadingList | null => {
  const bible = parseBibleId(id);
  if (bible) return bible.gospel ? 'gospel' : 'apostle';
  return AKATHISTS.some(a => a.id === id) ? 'akathists' : null;
};

/** Remembers a chapter or akathist as opened; `finished` once its "✓ წავიკითხე" was pressed. */
export const rememberRead = (id: string, finished = false) => {
  const list = readingListOf(id);
  if (!list) return;
  try {
    localStorage.setItem(KEY(list), JSON.stringify({ id, finished }));
  } catch { /* storage off: nothing to continue from */ }
};

/** Where reading goes on: after a finished chapter the next one (the next book after the last chapter,
 *  back to the first book after the last); otherwise the same chapter or akathist again. */
export const nextInReading = (last: LastRead): string => {
  const bible = parseBibleId(last.id);
  if (!bible || !last.finished) return last.id;
  const { book, chapter } = bible;
  if (chapter < book.chapters) return bibleChapterId(book.id, chapter + 1);
  const books = bible.gospel ? GOSPELS : APOSTLE;
  return bibleChapterId(books[(books.indexOf(book) + 1) % books.length].id, 1);
};

/** "მათე, თავი 6" or the akathist's name */
export const readingLabel = (id: string): string => {
  const bible = parseBibleId(id);
  if (bible) return `${bible.book.title}, თავი ${bible.chapter}`;
  return AKATHISTS.find(a => a.id === id)?.title || id;
};

/** The "გააგრძელე" target of a list, or null when nothing was read from it yet. */
export const continueReading = (list: ReadingList): { id: string; label: string } | null => {
  try {
    const last: LastRead | null = JSON.parse(localStorage.getItem(KEY(list)) || 'null');
    if (!last?.id || readingListOf(last.id) !== list) return null;
    const id = nextInReading(last);
    return { id, label: readingLabel(id) };
  } catch {
    return null;
  }
};
