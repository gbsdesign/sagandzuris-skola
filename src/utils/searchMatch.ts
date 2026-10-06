import { normalizeGeorgianText } from './searchUtils';

// Matching for the one search over the whole app (components/search). Kept free of data imports so
// tests/searchMatch.test.ts can run it on its own.

// Old letters and spellings of the chant books, so a query typed in today's spelling finds them:
// „ჴმაჲ“ → ხმა, „სიტყჳსა“ → სიტყვისა, „ჩუენ“ → ჩვენ. Applied to the query and the text alike.
const OLD_LETTERS: [RegExp, string][] = [
  [/ჲ/g, ''],
  [/ჴ/g, 'ხ'],
  [/ჳ/g, 'ვი'],
  [/ჱ/g, 'ე'],
  [/ჵ/g, 'ო'],
  [/უე/g, 'ვე'],
];

export const searchNormalize = (text: string): string => {
  let t = normalizeGeorgianText((text || '').replace(/[“”«»–—­]/g, ' '));
  for (const [re, to] of OLD_LETTERS) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
};

/**
 * How well a text answers a query; smaller is better, `null` is no match.
 * 0 the text starts with the query · 1 one of its words does · 2 the query is inside a word ·
 * 3 every word of the query is somewhere in the text.
 * Both arguments must already be passed through `searchNormalize`.
 */
export const matchScore = (text: string, query: string): number | null => {
  if (!query || !text) return null;
  if (text.startsWith(query)) return 0;
  if (text.includes(' ' + query)) return 1;
  if (text.includes(query)) return 2;
  const words = query.split(' ');
  if (words.length > 1 && words.every(w => text.includes(w))) return 3;
  return null;
};

/** "50", "ფს 50", "ფსალმუნი 50" → 50 (a psalm number, 1–150), else null. */
export const psalmNumber = (query: string): number | null => {
  const m = /^(?:ფს[ა-ჰ]*\.?\s*)?(\d{1,3})$/.exec(query.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 150 ? n : null;
};

/** "მათე 5" → { words: "მათე", n: 5 }: a book and a chapter. */
export const splitTrailingNumber = (query: string): { words: string; n: number } | null => {
  const m = /^(.*\D)\s*(\d{1,3})$/.exec(query.trim());
  if (!m || !m[1].trim()) return null;
  return { words: m[1].trim(), n: Number(m[2]) };
};

/** The kathisma (1–20) a psalm is read in, from ranges like "1–8" or "118". */
export const kathismaOfPsalm = (n: number, ranges: string[]): number | null => {
  for (let i = 0; i < ranges.length; i++) {
    const [a, b] = ranges[i].split('–').map(Number);
    if (n >= a && n <= (b || a)) return i + 1;
  }
  return null;
};
