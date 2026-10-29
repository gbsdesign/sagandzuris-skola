// The recordings „ოფლაინ რეჟიმი“ offers (pages/OfflinePage.tsx), in the app's own order: chants by service (each
// version's school recording and other choirs' recordings of it), the recordings-only albums, folk songs by region
// and the admission program — plus, for each chant book, the recordings of its chants (section 'books': shown beside the
// book's pages, so „the whole book“ goes on the phone in one tap). An item lists the track URLs the players look up in IndexedDB (utils/audioIdb.ts).
import { BOOK_NAMES, SERVICE_LISTS, findVersion, hasBookNotes } from './chantLookup';
import { AUDIO_PROXY, getChantMedia } from './chantMediaRegistry';
import { chantRecordings, chantRecordingMedia } from './chantRecordings';
import { ALBUM_RECS, CHANT_ALBUMS } from './chantAlbums';
import { FOLK_EXTRA_REGIONS, FOLK_REGIONS, songRecMedia, songsInRegion, songVersionMedia } from './songsData';
import { BOYS_SONGS, CHANTS, GIRLS_SONGS } from './abituriProgram';
import { takeMedia } from './programMedia';
import { variantName } from './tsirvaChants';
import { recordingsAreHidden } from './runtimeRecordings';
import { savedVersions } from '../utils/offlineNotes';

export type RecSection = 'galoba' | 'albums' | 'simghera' | 'abituri' | 'books';
export interface RecItem { id: string; title: string; sub?: string; tracks: string[] }
export interface RecGroup { id: string; section: RecSection; title: string; items: RecItem[] }

const urls = (tracks: string[]) => [...new Set(tracks.filter(Boolean))];

const PROGRAM: [id: string, title: string, list: typeof CHANTS][] = [
  ['chant', 'გალობა', CHANTS],
  ['boys', 'ბიჭები — სიმღერა', BOYS_SONGS],
  ['girls', 'გოგონები — სიმღერა', GIRLS_SONGS],
];

export const recordingGroups = (): RecGroup[] => {
  if (recordingsAreHidden()) return [];
  const groups: RecGroup[] = [];
  for (const [service, chants] of SERVICE_LISTS) {
    const items: RecItem[] = [];
    for (const chant of chants) {
      for (const v of chant.variants) {
        const tracks = urls([
          ...(getChantMedia(chant.id, v.code)?.tracks ?? []),
          ...chantRecordings(v.id).map(r => chantRecordingMedia(r, chant.title).tracks[3]),
        ]);
        if (tracks.length) items.push({ id: `v:${v.id}`, title: chant.title, sub: v.version !== undefined ? variantName(v) : v.label, tracks });
      }
    }
    groups.push({ id: `g:${service}`, section: 'galoba', title: service, items });
  }
  const byBook = new Map<string, Map<string, RecItem>>();
  for (const g of groups) {
    for (const it of g.items) {
      const info = findVersion(it.id.slice(2));
      if (!info || !hasBookNotes(info.variant)) continue;
      const book = info.variant.book ?? 'book';
      if (!byBook.has(book)) byBook.set(book, new Map());
      byBook.get(book)!.set(it.id, it);
    }
  }
  for (const [book, items] of byBook) {
    groups.push({ id: `b:${book}`, section: 'books', title: BOOK_NAMES[book] ?? book, items: [...items.values()] });
  }
  for (const album of CHANT_ALBUMS) {
    const items = ALBUM_RECS[album.id].map(([id, title, who]) => ({ id: `a:${id}`, title, sub: who, tracks: [`${AUDIO_PROXY}/${id}`] }));
    groups.push({ id: `a:${album.id}`, section: 'albums', title: album.title, items });
  }
  for (const region of [...FOLK_REGIONS, ...FOLK_EXTRA_REGIONS]) {
    const items: RecItem[] = songsInRegion(region.id, false).map(song => ({
      id: `s:${song.id}`,
      title: song.title,
      sub: song.area,
      tracks: urls([
        ...song.versions.flatMap(v => songVersionMedia(song, v).tracks),
        ...(song.recs ?? []).flatMap(r => songRecMedia(song, r).tracks),
      ]),
    }));
    groups.push({ id: `s:${region.id}`, section: 'simghera', title: region.nameGe, items });
  }
  for (const [id, title, list] of PROGRAM) {
    const items: RecItem[] = list.map(item => ({
      id: `p:${id}:${item.title}`,
      title: item.title,
      sub: item.sub,
      tracks: urls((item.takes ?? []).flatMap((t, k) => takeMedia(`abituri:${item.title}:${k}`, item.title, t).tracks)),
    }));
    groups.push({ id: `p:${id}`, section: 'abituri', title, items });
  }
  for (const g of groups) g.items = g.items.filter(it => it.tracks.length);
  return groups.filter(g => g.items.length);
};

/** Recordings kept by a version's own "ჩამოწერა" (utils/offlineNotes.ts): offline mode never removes these. */
export const notesKeptTracks = (): string[] =>
  savedVersions().flatMap(id => {
    const info = findVersion(id);
    return info ? (getChantMedia(info.chant.id, info.variant.code)?.tracks ?? []).filter(Boolean) : [];
  });
