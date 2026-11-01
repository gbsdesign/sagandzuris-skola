import { DZLISPIREBI_CHANTS } from './irmosBookChants';
import { TONE_LETTERS, type Heirmos } from '../utils/rvakhma';

// The heirmoi of „რვა ხმა“: vol. VIII's eight tones, eight heirmoi each, with their book notes in the repo (public/notes/v8 —
// the anthology's heirmoi of the same tones live in R2 and are left out, so the game works offline).
// Left out too: a heirmos whose first phrase is note for note a heirmos's of another tone — the book's files 2 (tone I) and 9
// (tone II), 4 (I), 10 (II) and 41 (VI); by its first phrase no ear could tell its tone (tests/rvakhma.test.ts checks the rest).
const SHARED_OPENING = new Set([2, 4, 9, 10, 41]);

export const HEIRMOI: readonly Heirmos[] = DZLISPIREBI_CHANTS.flatMap(c => {
  const tone = TONE_LETTERS.indexOf(c.title.replace(/^ხმა\s+/, '') as typeof TONE_LETTERS[number]);
  if (tone < 0) return [];
  return (c.variants ?? []).filter(v => v.book === 'v8' && v.bookNums?.length && !SHARED_OPENING.has(v.bookNums[0])).map(v => ({
    tone, book: 'v8', num: v.bookNums![0], name: v.version || 'ძლისპირი', words: v.source || '', page: v.page || 0,
  }));
});
