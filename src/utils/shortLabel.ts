// „ჩემი ღილაკები“ are half-height tiles since 2026-11-05 (the user: „შუაზე გაჭრა … მაღლა შემოკლებების გამოყენებით
// ჩაწერო თუ რა ღილაკია“, answer „ხატულა + 2 მოკლე ხაზი“): a button's name stands beside its icon in at most two short
// lines. A word wider than a line takes its usual short form (ლოცვები → ლოც.) or its first letters up to a consonant
// and a dot (სახარება → სახარ.) — only as short as the tile needs, so a wide phone keeps more of it. Short words and
// anything that is not a Georgian word (09:00, №) stay whole. The full name stays the button's aria-label and title.

/** Does this text fit one line of the tile? (the tile measures it; `lettersFit` counts letters before that) */
export type Fits = (text: string) => boolean;
export const lettersFit = (n: number): Fits => s => s.length <= n;
/** Letters a line holds on a 390px phone: beside the ✓ (`tight`) or on a tile without one (`roomy`). */
export const LINE_LETTERS = { tight: 6, roomy: 9 } as const;
export type LabelRoom = keyof typeof LINE_LETTERS;

const VOWELS = 'აეიოუ';

/** The usual short forms, longest first, where the rule's cut would read oddly (დღესასწაულები → not „დღეს.“). */
const KNOWN: Record<string, string[]> = {
  ლოცვა: ['ლოც.'], ლოცვები: ['ლოც.'], ლოცვის: ['ლოც.'], ლოცვებს: ['ლოც.'],
  წმიდანთა: ['წმ.'], წმინდანთა: ['წმ.'], საღამოს: ['საღ.'], ლიტერატურა: ['ლიტ.'],
  სამადლობელი: ['სამადლ.', 'სამად.'], პარაკლისი: ['პარაკლ.', 'პარაკ.'],
  დღესასწაულები: ['დღესასწ.', 'დღესას.'], დღესასწაული: ['დღესასწ.', 'დღესას.'],
  ღვთისმშობლისა: ['ღვთისმშ.', 'ღვთის.'], ღვთისმშობელი: ['ღვთისმშ.', 'ღვთის.'],
};

/** One word as long as it fits: whole, its known short form, else cut after a consonant (three letters at least). */
export const shortWord = (word: string, fits: Fits): string => {
  const m = /^([ა-ჰ]+)[,;:!?.]*$/.exec(word);
  if (!m || fits(word)) return word;
  const w = m[1];
  if (fits(w)) return w;
  const known = KNOWN[w];
  if (known) return known.find(fits) || known[known.length - 1];
  let last = word;
  for (let n = w.length - 1; n >= 3; n--) {
    if (VOWELS.includes(w[n - 1])) continue;
    last = `${w.slice(0, n)}.`;
    if (fits(last)) return last;
  }
  return last;
};

/** A button's name for a half-height tile: every word as long as a line allows. */
export const shortLabel = (label: string, fits: Fits): string =>
  label.trim().split(/\s+/).map(w => shortWord(w, fits)).join(' ');
