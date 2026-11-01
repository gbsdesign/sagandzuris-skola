import { ANSWER_BANK } from './sitqvaAnswers';
import { OTKHEULI_GROUPS } from './otkheuliGroups';
import { TS_LINES } from './tsartseraLines';
import { lineWords } from '../utils/anbani';

// What „სამი დამწერლობა“ gives to read (2026-11-01): the app's own words — „დღის სიტყვა“'s answers and „ოთხეული“'s groups —
// one word each, today's 33 letters only; and „ხუცური წარწერა“'s lines of three to seven words. The songs' and chants'
// titles stay out (refrains and old names a learner would not know when read).

let words: string[] | null = null;
export const anbaniWords = (): string[] => {
  if (!words) {
    const known = OTKHEULI_GROUPS.filter(g => g.family !== 'songs' && g.family !== 'chants');
    const all = [...ANSWER_BANK.map(c => c.word), ...known.flatMap(g => g.words)];
    words = [...new Set(all.map(w => w.trim()).filter(w => /^[ა-ჰ]{2,9}$/.test(w)))].sort();
  }
  return words;
};

let lines: string[] | null = null;
export const anbaniLines = (): string[] => {
  if (!lines) lines = TS_LINES.map(l => l.text).filter(t => { const n = lineWords(t).length; return n >= 3 && n <= 7; });
  return lines;
};
