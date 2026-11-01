// The melodies of the musical games' print kits (2026-11-01): the well-known chants of „ხმა-ხმად“ and „სამ ნოტში!“
// (data/chantGamePool.ts — the pearls' nameable ones, each with book notes) and the admission program's songs that have notes
// (data/songBookChants.ts), with their scores (public/notes/<book>/NNN.json, read by music.mjs). A chant sung in two versions
// is one name, its first version kept.
import { appData } from './appData.mjs';
import { loadScore } from './music.mjs';

export const app = await appData({
  'data/chantGamePool.ts': ['knownChants'],
  'data/songBookChants.ts': ['SONG_ITEMS', 'SONG_BOOK'],
  'data/chantLookup.ts': ['BOOK_NAMES'],
  'utils/chantRounds.ts': ['nameKey', 'drawChantRounds'],
  'utils/otkheuli.ts': ['mulberry32'],
  'utils/amikhseni.ts': ['TEAM_NAMES', 'shuffle'],
});
const { knownChants, SONG_ITEMS, SONG_BOOK, BOOK_NAMES, nameKey } = app;

/** „გელათის სკოლის საგალობლები, IX ტომი“ → „IX ტომი“ */
const volume = book => (BOOK_NAMES[book] ?? book).split(', ').pop();

export const CHANTS = (() => {
  const seen = new Set();
  return knownChants().flatMap(c => {
    const k = nameKey(c.title);
    if (seen.has(k)) return [];
    seen.add(k);
    const score = loadScore(c.book, c.num);
    if (score.voices.length < 3) return [];
    return [{ key: `${c.book}-${c.num}`, title: c.title, kind: 'chant', where: c.service, ref: `${volume(c.book)} · №${c.num}`, book: c.book, num: c.num, score, chant: c }];
  });
})();

export const SONGS = SONG_ITEMS.flatMap(s => {
  const score = loadScore(SONG_BOOK, s.notes);
  if (score.voices.length < 3 || score.voices.some(v => !v.length)) return [];
  return [{ key: `song-${s.notes}`, title: s.title, kind: 'song', where: s.sub.split(' · ')[0], ref: s.sub, book: SONG_BOOK, num: s.notes, score }];
});
