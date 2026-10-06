/**
 * Smart Georgian search & phonetic normalization utilities.
 * Handles fuzzy matching, punctuation removal, and common Georgian liturgical phonetic variants
 * (e.g. 'წმიდაო' <-> 'წმინდაო', 'ღირს-არს' <-> 'ღირს არს', etc.),
 * letters people mix up when typing (ჭ/ჩ, წ/ც, ყ/ქ/კ, ტ/თ, პ/ფ) and Latin spelling ('mkholod' -> 'მხოლოდ').
 */

export const normalizeGeorgianText = (text: string): string => {
  if (!text) return '';

  return (
    text
      .toLowerCase()
      // Replace Georgian liturgical common variants
      .replace(/წმიდა/g, 'წმინდა')
      .replace(/ქრისტეჲს/g, 'ქრისტეს')
      .replace(/ღმრთ/g, 'ღვთ')
      // Remove dashes, quotes, brackets, punctuation
      .replace(/[-_.,/\\()[\]{}„“"':;!?]/g, ' ')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
};

// Each pair of easily confused letters is folded into one, so a typo still finds the chant
const LOOSE: Record<string, string> = { 'ჭ': 'ჩ', 'წ': 'ც', 'ყ': 'ქ', 'კ': 'ქ', 'ტ': 'თ', 'პ': 'ფ', 'ჲ': '' };
const loosen = (text: string) => normalizeGeorgianText(text).replace(/[ჭწყკტპჲ]/g, ch => LOOSE[ch]);

// Latin -> Georgian, longest spellings first ('kh' before 'k'); ejective/aspirate pairs are folded by loosen()
const LATIN: [string, string][] = [
  ['tch', 'ჩ'], ['sh', 'შ'], ['zh', 'ჟ'], ['kh', 'ხ'], ['gh', 'ღ'], ['ch', 'ჩ'], ['ts', 'ც'], ['tz', 'ც'], ['dz', 'ძ'],
  ['a', 'ა'], ['b', 'ბ'], ['g', 'გ'], ['d', 'დ'], ['e', 'ე'], ['v', 'ვ'], ['w', 'ვ'], ['z', 'ზ'], ['t', 'თ'], ['i', 'ი'],
  ['k', 'ქ'], ['l', 'ლ'], ['m', 'მ'], ['n', 'ნ'], ['o', 'ო'], ['p', 'ფ'], ['f', 'ფ'], ['r', 'რ'], ['s', 'ს'], ['u', 'უ'],
  ['q', 'ქ'], ['y', 'ი'], ['c', 'ც'], ['x', 'ხ'], ['h', 'ჰ'], ['j', 'ჯ'],
];
const LATIN_RE = new RegExp(LATIN.map(([l]) => l).join('|'), 'g');
const LATIN_MAP = Object.fromEntries(LATIN);
const hasLatin = (text: string) => /[a-z]/i.test(text);
const fromLatin = (text: string) => text.toLowerCase().replace(/'/g, '').replace(LATIN_RE, l => LATIN_MAP[l]);

/** A prepared query: build it once per keystroke, then test many titles with matchesQuery(). */
export interface SearchQuery {
  raw: string;
  keys: string[][]; // each spelling of the query (as typed, and from Latin), split into words
}

export const prepareSearch = (query: string): SearchQuery | null => {
  const raw = (query || '').toLowerCase().trim();
  if (!raw) return null;
  const spellings = [loosen(raw)];
  if (hasLatin(raw)) spellings.push(loosen(fromLatin(raw)));
  return { raw, keys: spellings.filter(Boolean).map(s => s.split(' ')) };
};

/** The form a title is compared in; cache it when the same titles are searched again and again. */
export const searchKey = (text: string) => {
  const loose = loosen(text || '');
  // the last line ignores spaces and dashes: 'მხოლოდშობილი' finds 'მხოლოდ-შობილი'
  return `${(text || '').toLowerCase()}\n${loose}\n${loose.replace(/ /g, '')}`;
};

/** Every word of one of the query's spellings is found in the title (in any order). */
export const matchesQuery = (key: string, q: SearchQuery | null): boolean => {
  if (!q) return true;
  if (!key) return false;
  if (key.includes(q.raw)) return true;
  return q.keys.some(words => words.every(w => key.includes(w)) || key.includes(words.join('')));
};

/**
 * Checks if a target text matches search query with fuzzy and phonetic normalization.
 */
export const matchesSearch = (targetText: string, query: string): boolean =>
  matchesQuery(searchKey(targetText), prepareSearch(query));
