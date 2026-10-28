import { nameGender } from '../data/georgianNames';
import type { CalendarDay } from '../data/churchCalendar';
import { hash32, type HangiDay } from './hangi';

// „დღის სიტყვა“ (games hub, 2026-10-28): one hidden Georgian word a day for the whole school, six tries, the letters
// coloured as Wordle does (green = right letter in its place, amber = in the word elsewhere). The word is 4–6 letters
// and comes from the day itself — a feast or a saint of the church calendar — or, when the day gives none, from the
// bank of church words and places (data/sitqvaAnswers.ts). Pure; tests in tests/sitqva.test.ts. The day's record is
// the daily-game record of utils/hangi.ts (id = the word, guesses = the words tried).

/** the 33 letters of today's alphabet, in their order — the on-screen keyboard's three rows of eleven */
export const LETTERS = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';
export const KEY_ROWS = [LETTERS.slice(0, 11), LETTERS.slice(11, 22), LETTERS.slice(22)].map(r => [...r]);
/** a physical keyboard in the Latin layout types Georgian the way the standard Georgian layout does */
export const LATIN_TO_GEORGIAN: Record<string, string> = {
  a: 'ა', b: 'ბ', g: 'გ', d: 'დ', e: 'ე', v: 'ვ', z: 'ზ', T: 'თ', i: 'ი', k: 'კ', l: 'ლ', m: 'მ', n: 'ნ', o: 'ო', p: 'პ', J: 'ჟ',
  r: 'რ', s: 'ს', t: 'ტ', u: 'უ', f: 'ფ', q: 'ქ', R: 'ღ', y: 'ყ', S: 'შ', C: 'ჩ', c: 'ც', Z: 'ძ', w: 'წ', W: 'ჭ', x: 'ხ', j: 'ჯ', h: 'ჰ',
};

export const MIN_LEN = 4;
export const MAX_LEN = 6;
export const MAX_TRIES = 6;
export const FIRST_DAY = '2026-10-28';

export const isGeorgian = (w: string) => /^[ა-ჰ]+$/.test(w);
export const fits = (w: string) => isGeorgian(w) && w.length >= MIN_LEN && w.length <= MAX_LEN;

const DAY_MS = 86_400_000;
const utcDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
/** the game's number on this day (1 on its first day) */
export const dayIndex = (iso: string, first = FIRST_DAY) => Math.round((utcDay(iso) - utcDay(first)) / DAY_MS) + 1;

export type Mark = 'hit' | 'near' | 'miss';

/** Wordle's colouring, with repeated letters counted once each: first the exact places, then the misplaced ones */
export const scoreGuess = (guess: string, answer: string): Mark[] => {
  const g = [...guess];
  const a = [...answer];
  const marks: Mark[] = g.map(() => 'miss');
  const left = new Map<string, number>();
  a.forEach((ch, i) => {
    if (g[i] === ch) marks[i] = 'hit';
    else left.set(ch, (left.get(ch) ?? 0) + 1);
  });
  g.forEach((ch, i) => {
    if (marks[i] === 'hit') return;
    const n = left.get(ch) ?? 0;
    if (n > 0) { marks[i] = 'near'; left.set(ch, n - 1); }
  });
  return marks;
};

const RANK: Record<Mark, number> = { miss: 1, near: 2, hit: 3 };
/** the best thing known about each letter tried, for the keyboard's colours */
export const keyMarks = (guesses: string[], answer: string): Record<string, Mark> => {
  const out: Record<string, Mark> = {};
  for (const guess of guesses) {
    const marks = scoreGuess(guess, answer);
    [...guess].forEach((ch, i) => { if (!out[ch] || RANK[marks[i]] > RANK[out[ch]]) out[ch] = marks[i]; });
  }
  return out;
};

export type SitqvaKind = 'feast' | 'saint' | 'church' | 'region';
export interface SitqvaCandidate { word: string; kind: SitqvaKind; life?: string }

export const KIND_HINT: Record<SitqvaKind, string> = {
  feast: 'დღევანდელი დღესასწაული',
  saint: 'დღევანდელი წმინდანის სახელი',
  church: 'საეკლესიო სიტყვა',
  region: 'საქართველოს კუთხე ან ადგილი',
};

// the case endings a name wears in the calendar's lines (nameDayMatch.ts has the same set), longest first
const ENDINGS = ['ისასი', 'ისთა', 'სასი', 'ისა', 'ისი', 'ის', 'სა', 'სი', 'მა', 'ი', 'ს', ''];
const VOWEL = /[აეიოუ]$/;

/** the first name a calendar word carries („გიორგისა“ → გიორგი, „ნინოსი“ → ნინო), in the nominative; undefined for other words */
export const nameWord = (token: string): string | undefined => {
  for (const e of ENDINGS) {
    if (e && !token.endsWith(e)) continue;
    const stem = e ? token.slice(0, -e.length) : token;
    if (stem.length < 3 || !nameGender(stem)) continue;
    return VOWEL.test(stem) ? stem : `${stem}ი`;
  }
  return undefined;
};

// the feasts short enough for the grid, found by their stem in a feast line of the calendar
const FEASTS = ['შობა', 'ხარება', 'მირქმა', 'ბზობა', 'სამება'];
const feastIn = (text: string) => FEASTS.find(f => { const stem = f.slice(0, -1); return text.split(/[^ა-ჰ]+/).some(t => t.startsWith(stem) && t.length <= stem.length + 3); });

/** what the calendar day offers: its feast (bold lines) and the saints it names, each once */
export const candidatesOfDay = (day: CalendarDay | null | undefined): SitqvaCandidate[] => {
  const out: SitqvaCandidate[] = [];
  const seen = new Set<string>();
  const add = (c: SitqvaCandidate) => { if (!seen.has(c.word)) { seen.add(c.word); out.push(c); } };
  for (const s of day?.s ?? []) {
    if (s.b) { const f = feastIn(s.n); if (f) add({ word: f, kind: 'feast', life: s.l }); }
    for (const t of s.n.split(/[^ა-ჰ]+/)) { const w = nameWord(t); if (w) add({ word: w, kind: 'saint', life: s.l }); }
  }
  return out;
};

const ranked = (iso: string, list: SitqvaCandidate[], skip?: string) =>
  list.filter(c => fits(c.word) && c.word !== skip).sort((a, b) => hash32(`${iso}|${b.word}`) - hash32(`${iso}|${a.word}`));

/** the day's word: the day's feast first, then a saint of the day, then the bank — the same on every phone; `skip` = yesterday's word */
export const wordOfDay = (iso: string, day: SitqvaCandidate[], bank: SitqvaCandidate[], skip?: string): SitqvaCandidate | undefined =>
  ranked(iso, day.filter(c => c.kind === 'feast'), skip)[0] ?? ranked(iso, day.filter(c => c.kind === 'saint'), skip)[0] ?? ranked(iso, bank, skip)[0];

/** the record after a try; the word is accepted by the caller */
export const afterTry = (day: HangiDay, guess: string): HangiDay => {
  if (day.done) return day;
  const guesses = [...day.guesses, guess];
  const won = guess === day.id;
  return { ...day, guesses, won, done: won || guesses.length >= MAX_TRIES };
};

const SQUARE: Record<Mark, string> = { hit: '🟩', near: '🟨', miss: '⬛' };
export const sitqvaShareText = (n: number, day: HangiDay, site = 'sagandzureli.ge') => {
  const head = `დღის სიტყვა №${n} · ${day.won ? `${day.guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`}`;
  const rows = day.guesses.map(g => scoreGuess(g, day.id).map(m => SQUARE[m]).join(''));
  return [head, ...rows, site].join('\n');
};
