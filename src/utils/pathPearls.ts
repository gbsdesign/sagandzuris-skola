// „ნასწავლი“'s pearls (2026-11-05; the user: „თითოეული მარგალიტი იყოს თითო საგალობლის წინ ნასწავლში … მაღლა სკივრები“).
// Every item of the member's path — a chant, a song, a poem, an instrument — is a pearl in front of its name: matte while
// nothing of it is learned, polished once the member marks a voice (or the whole poem or instrument) as known, and shining
// once a teacher has confirmed one („ჩათვლა“, confirmations/{uid}). Every CHEST_SIZE polished pearls open a chest, CHEST_COUNT
// chests in all (the rest are not needed). Since 2026-11-08 the chests give „ჩემი სამოსი“ nothing (a part stays only by its photo, utils/samosiProof.ts).
// It replaced the old pearls game (sung phrases in three chests). Pure, tested in tests/pathPearls.test.ts.

export type PearlState = 'new' | 'polished' | 'shining';

export const CHEST_SIZE = 10;
export const CHEST_COUNT = 3;

type Marks = { voices?: unknown; isLearned?: boolean } | null | undefined;

// the member's marks as the path keeps them (utils/pathItems voicesOf, without the catalogue): voices I–III of a chant or
// song, or a poem's / instrument's „learned“ (stored as voice I and isLearned)
const marked = (item: Marks) => {
  if (!item) return false;
  if (item.isLearned) return true;
  const v = item.voices;
  const list = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').map(s => s.trim()) : [];
  return list.some(x => x === '1' || x === '2' || x === '3');
};

/** An item's pearl: shining once a teacher confirmed any of it, polished once the member marked it, else new. */
export const pearlOf = (item: Marks, confirmed: readonly string[] | null | undefined): PearlState =>
  Array.isArray(confirmed) && confirmed.length ? 'shining' : marked(item) ? 'polished' : 'new';

/** How many of the path's pearls are polished (shining ones too) and how many shine. */
export const pearlCounts = (path: Record<string, Marks> | null | undefined, confirmed: Record<string, unknown> | null | undefined) => {
  let polished = 0, shining = 0;
  for (const [id, item] of Object.entries(path || {})) {
    const c = confirmed?.[id];
    const s = pearlOf(item, Array.isArray(c) ? (c as string[]) : null);
    if (s !== 'new') polished++;
    if (s === 'shining') shining++;
  }
  return { polished, shining, total: Object.keys(path || {}).length };
};

export interface ChestState {
  /** 0, 1, 2 */
  index: number;
  /** polished pearls in it, 0…CHEST_SIZE */
  have: number;
  open: boolean;
}

/** The chests for `polished` pearls: the first fills with pearls 1–10, the second with 11–20, the third with 21–30. */
export const chestsOf = (polished: number): ChestState[] =>
  Array.from({ length: CHEST_COUNT }, (_, index) => {
    const have = Math.max(0, Math.min(CHEST_SIZE, polished - index * CHEST_SIZE));
    return { index, have, open: have === CHEST_SIZE };
  });
