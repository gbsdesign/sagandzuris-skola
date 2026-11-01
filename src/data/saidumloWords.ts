import { WORD_CATEGORIES } from './amikhseniWords';
import type { SdWord } from '../utils/saidumlo';

// „საიდუმლო სახელები“'s words for the class's board (2026-11-01): the „ამიხსენი“ bank's single words of 3–11 letters — the
// church and chant, music, instruments, regions, the costume, the table, nature, heroes and battles, film, sport, the
// household, history and tales; not the songs' titles nor the saints' and ancestors' full names (they make poor clues).
const SKIP = new Set(['simgera', 'tsmindanebi', 'tsinaprebi']);
export const SAIDUMLO_POOL: SdWord[] = WORD_CATEGORIES.filter(c => !SKIP.has(c.id)).flatMap(c =>
  c.words.filter(w => !/\s/.test(w) && w.length >= 3 && w.length <= 11).map(w => ({ w, theme: c.id })));
