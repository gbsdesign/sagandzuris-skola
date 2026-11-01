import { knownChants } from './chantGamePool';
import { kutkhePool } from './kutkhePool';
import { FOLK_REGIONS } from './songsData';
import { SONG_BOOK, SONG_ITEMS } from './songBookChants';
import { KUTKHE_REGIONS } from '../utils/kutkhe';
import type { TsqItem, TsqWhat } from '../utils/tsqvilebi';

// „ხმის წყვილები“'s sounds (utils/tsqvilebi.ts): the chant games' well-known chants (data/chantGamePool.ts — their opening on
// the synthesizer from the book notes, so every member hears them, offline too) and the folk songs — a whole take of
// `kutkhePool` while the recordings may be heard (a piece from an eighth of its length), else the admission program's songs
// with book notes.

const regionName = (i: number) => FOLK_REGIONS.find(r => r.id === KUTKHE_REGIONS[i])?.nameGe ?? '';

const chants = (): TsqItem[] => knownChants().map(c => ({ id: `c:${c.id}`, name: c.title, sub: c.service, sound: { book: c.book, num: c.num } }));

const songs = (): TsqItem[] => {
  const heard = kutkhePool();
  if (heard.length) return heard.map(s => ({ id: `s:${s.id}`, name: s.song, sub: regionName(s.region), sound: { url: s.takes[0].url, from: 0.12 } }));
  return SONG_ITEMS.flatMap(it => (it.notes
    ? [{ id: `p:${it.notes}`, name: it.title, sub: it.sub.split(' · ')[0], sound: { book: SONG_BOOK, num: it.notes } }]
    : []));
};

/** the boards' sounds by the choice: the chants, the songs, or both (half of each) */
export const tsqGroups = (what: TsqWhat): TsqItem[][] => (what === 'chants' ? [chants()] : what === 'songs' ? [songs()] : [chants(), songs()]);
/** the songs are recordings now (not the program's notes): they load from the internet */
export const songsAreRecordings = () => kutkhePool().length > 0;
