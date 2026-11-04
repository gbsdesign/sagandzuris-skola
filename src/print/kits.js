// The print kits the games hub's „სამაგიდო · PDF“ button makes (makeKit.ts): every module of games/ is one kit, named by its
// file (`dghis-sitqva` = games/dghis-sitqva.js, as `data/games.ts` names it). A musical kit reads book notes as its module
// runs, so the button fetches them first: `SCORES` lists, for each such kit, the [book, num] pairs it may read (more is
// harmless; one it misses is read on the spot with a warning).
import { preloadScores } from './music.js';

const GAMES = import.meta.glob('./games/*.js');

/** the chants and songs of melodies.js — every kit that imports it reads them all */
const melodies = async () => {
  const [{ knownChants }, { SONG_ITEMS, SONG_BOOK }] = await Promise.all([import('../data/chantGamePool'), import('../data/songBookChants')]);
  return [...knownChants().map(c => [c.book, c.num]), ...SONG_ITEMS.map(s => [SONG_BOOK, s.notes])];
};
const gundi = async () => {
  const [{ GUNDI_SONGS }, { SONG_BOOK }] = await Promise.all([import('../pages/games/gundi/songs'), import('../data/songBookChants')]);
  return GUNDI_SONGS.map(s => [SONG_BOOK, s.num]);
};
const pearls = async () => {
  const [{ CHESTS }, { findVersion }] = await Promise.all([import('../data/pearls'), import('../data/chantLookup')]);
  return CHESTS.flatMap(c => c.pearls.flatMap(pid => {
    const v = findVersion(pid)?.variant;
    return v?.bookNums?.length ? [[v.book || 'book', v.bookNums[0]]] : [];
  }));
};
const heirmoi = async () => (await import('../data/rvakhmaPool')).HEIRMOI.map(h => ['v8', h.num]);
const loto = async () => (await import('../data/lotoKit')).LOTO_KIT.map(c => [c.book, c.num]);
const castles = async () => (await import('../data/tsikheRooms')).TSIKHE_ROOMS
  .flatMap(r => r.doors.flatMap(d => (d.tune ? [[d.tune.book, d.tune.num]] : [])));

const SCORES = {
  'dghis-hangi': [melodies],
  eqo: [melodies],
  'khma-khmad': [melodies],
  'khmebis-turniri': [melodies],
  'khmis-tsqvilebi': [melodies],
  'mesame-khma': [melodies],
  'sam-notshi': [melodies],
  'sagalobo-loto': [melodies, loto],
  'chemi-gundi': [gundi],
  margalitebi: [pearls],
  'rva-khma': [heirmoi],
  'tsikhis-gasaghebi': [castles],
};

/** every kit's id */
export const KIT_IDS = Object.keys(GAMES).map(p => p.slice('./games/'.length, -'.js'.length));

/** a kit's module (id, title, css, head, script, pages, sheets), its notes fetched first */
export const loadKit = async (id) => {
  const load = GAMES[`./games/${id}.js`];
  if (!load) throw new Error(`no print kit ${id}`);
  const lists = await Promise.all((SCORES[id] ?? []).map(f => f()));
  if (lists.length) await preloadScores(lists.flat());
  return load();
};
