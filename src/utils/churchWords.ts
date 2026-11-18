import type { ChurchWord } from '../data/churchWords';

// Finds an old church word of the dictionary (data/churchWords.ts) in a reading's text: the same word in any of its case
// forms and old spellings. Pure — the reading pages' dotted words (pages/v2/sitqva/WordMeanings.tsx) and the test use it.

/** the text's spelling turned into the dictionary's: Mtavruli → mkhedruli, the old letters → today's, „უ“ for „ვ“ */
export const normWord = (raw: string): string => {
  let w = '';
  for (const ch of raw) {
    const c = ch.codePointAt(0) ?? 0;
    // Mtavruli capitals (Ა…Ჿ) are the same letters as mkhedruli
    w += c >= 0x1c90 && c <= 0x1cbf ? String.fromCodePoint(c - 0x1c90 + 0x10d0) : ch;
  }
  return w
    .replace(/ჵ/g, 'ჰოი')
    .replace(/ჲ/g, 'ი')
    .replace(/ჳ/g, 'ვი')
    .replace(/ჴ/g, 'ხ')
    .replace(/ჱ/g, 'ე')
    // „ჩუენ“ = „ჩვენ“: a „უ“ between a consonant and a vowel is a „ვ“
    .replace(/([ბგდვზთკლმნპჟრსტფქღყშჩცძწჭხჯჰ])უ(?=[აეიო])/g, '$1ვ');
};

// a stem's endings: an optional theme vowel, a case or postposition, an optional particle
const VOWELS = ['', 'ა', 'ე', 'ი', 'ო', 'უ'];
const CASES = [
  '', 'ი', 'ო', 'ს', 'სა', 'სასა', 'ისა', 'ისასა', 'ისაო', 'ისაი', 'ისაითა', 'ისათა', 'ისანი', 'ისათვის', 'ისაგან', 'ისადმი', 'ისთვის',
  'ისგან', 'ის', 'ით', 'ითა', 'ითურთ', 'ითგან', 'ად', 'დ', 'ადმი', 'დამი', 'მა', 'მან', 'ნი', 'ნო', 'ნისა', 'ნითა', 'ნსა', 'თა', 'თასა',
  'თაო', 'თაგან', 'თათვის', 'თაითა', 'თაი', 'თვის', 'გან', 'თგან', 'ები', 'ებისა', 'ებით', 'ებითა', 'ებსა', 'ებს', 'ებმა', 'ებო',
  'ების', 'ებში', 'ში', 'ზე', 'სთვის',
];
const PARTICLES = ['', 'ცა', 'ო', 'ი', 'ღა', 'ვე'];
const ENDINGS = new Set(VOWELS.flatMap(v => CASES.flatMap(c => PARTICLES.map(p => v + c + p))));

export interface WordIndex {
  exact: Map<string, number>;
  stems: Map<string, number>;
  /** the longest stem, so a token is tried from its longest beginning down */
  longest: number;
}

export const buildWordIndex = (words: ChurchWord[]): WordIndex => {
  const exact = new Map<string, number>();
  const stems = new Map<string, number>();
  words.forEach((w, i) => {
    for (const f of w.f) {
      if (f.endsWith('*')) stems.set(normWord(f.slice(0, -1)), i);
      else exact.set(normWord(f), i);
    }
  });
  return { exact, stems, longest: Math.max(0, ...[...stems.keys()].map(s => [...s].length)) };
};

/** the dictionary's entry for one word of the text, or -1 */
export const lookupWord = (ix: WordIndex, token: string): number => {
  const w = normWord(token);
  const hit = ix.exact.get(w);
  if (hit !== undefined) return hit;
  const letters = [...w];
  for (let n = Math.min(ix.longest, letters.length); n >= 4; n--) {
    const stem = letters.slice(0, n).join('');
    const i = ix.stems.get(stem);
    if (i !== undefined && ENDINGS.has(letters.slice(n).join(''))) return i;
  }
  return -1;
};

/** a Georgian word of the text: its letters (the old ones and Mtavruli too) */
export const WORD_RE = /[Ⴀ-ჿᲐ-Ჿ]+/g;

/** the sentence round a place in a text, cut to a few words on each side, for „where it was met“ */
export const sentenceAround = (text: string, at: number, len: number, side = 6): string => {
  const stop = /[.!?;\n]/;
  let s = at;
  while (s > 0 && !stop.test(text[s - 1])) s--;
  let e = at + len;
  while (e < text.length && !stop.test(text[e])) e++;
  const left = text.slice(s, at).trim().split(/\s+/).filter(Boolean);
  const rest = text.slice(at + len, e);
  const right = rest.trim().split(/\s+/).filter(Boolean);
  // a comma glued to the word stays with it
  const glued = rest && !/^\s/.test(rest) ? right.shift() ?? '' : '';
  const l = left.slice(-side);
  const r = right.slice(0, side);
  return `${l.length < left.length ? '…' : ''}${[...l, text.slice(at, at + len) + glued, ...r].join(' ')}${r.length < right.length ? '…' : ''}`;
};
