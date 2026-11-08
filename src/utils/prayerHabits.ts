import { AKATHISTS, APOSTLE, GOSPELS, KATHISMAS, PRAYER_HOURS, bibleChapterId, parseBibleId } from '../data/prayers';
import type { HabitMenu } from '../data/habitsAndManera';

const isMorning = (id: string) => id === 'dila' || /^week-\d-dila$/.test(id);
const isEvening = (id: string) => id === 'dzili' || /^week-\d-dzili$/.test(id);

/** The habit a prayer counts for in the school's list: reading it is that habit done for today (data/habitsAndManera).
 *  Since the morning and evening prayers became two habits, the evening ones tick „საღამოს ლოცვები“ (habit_15). */
export const habitOfPrayer = (id: string): string | null => {
  if (isMorning(id)) return 'habit_1';
  if (isEvening(id)) return 'habit_15';
  if (PRAYER_HOURS.some(h => h.id === id)) return 'habit_13';
  if (KATHISMAS.some(k => k.id === id)) return 'habit_6';
  if (AKATHISTS.some(a => a.id === id)) return 'habit_7';
  if (id === 'paraklisi-samadlobeli') return 'habit_8';
  const bible = parseBibleId(id);
  if (bible) return bible.gospel ? 'habit_2' : 'habit_3';
  return null;
};

/** Does a habit's book button (its menu) hold this prayer? */
export const menuHoldsPrayer = (menu: HabitMenu | undefined, id: string): boolean => {
  switch (menu) {
    case 'morning': return isMorning(id);
    case 'evening': return isEvening(id);
    case 'morning-evening': return isMorning(id) || isEvening(id);
    case 'hours': return PRAYER_HOURS.some(h => h.id === id);
    case 'psalms': return KATHISMAS.some(k => k.id === id);
    case 'akathists': return AKATHISTS.some(a => a.id === id);
    case 'gospel': return !!parseBibleId(id)?.gospel;
    case 'apostle': { const b = parseBibleId(id); return !!b && !b.gospel; }
    default: return false;
  }
};

interface HabitLike {
  id: string;
  menu?: HabitMenu;
  links?: { kind: string; open?: { kind: string; id?: unknown } }[];
}

/** The habit in the member's own list (2026-11-09, the user: „ჩვევაც იმიშნებოდეს რომელი ლოცვაც არის ჩვევების სიაში“):
 *  one that links this very prayer, else one whose book button holds it, else the school's habit when it is in the list. */
export const myHabitOfPrayer = (id: string, habits: HabitLike[]): string | null => {
  const linked = habits.find(h => h.links?.some(l => l.kind === 'find' && l.open?.kind === 'shortcut' && l.open.id === `prayer:${id}`));
  if (linked) return linked.id;
  const byMenu = habits.find(h => menuHoldsPrayer(h.menu, id));
  if (byMenu) return byMenu.id;
  const school = habitOfPrayer(id);
  return school && habits.some(h => h.id === school) ? school : null;
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
