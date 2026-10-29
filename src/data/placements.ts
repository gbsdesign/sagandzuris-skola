import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FOLK_SONGS, FolkRegionId, FolkSong, SongRec, centreRecId } from './songsData';
import type { CentreRec } from './folkCentre';
import { ALBUM_RECS, AlbumRec, ChantAlbumId } from './chantAlbums';

// „გადატანა“: the owner and the superadmins move one recording of the songs archive or of a chant album to another
// region, song or album — or between the songs and the chants — from the app itself. The moves live in
//   settings/placements { recs: { <Drive file id>: { kind: 'song', region, title } | { kind: 'chant', album, title } } }
// and are laid over the lists written in code: FOLK_SONGS and ALBUM_RECS are rebuilt in place, so every page that
// reads them follows (pages that keep a copy re-render through usePlacements). A song left without recordings by the
// moves is dropped; a recording moved to a title the region lacks makes a new song there.
// The Folklore Centre's Drive albums (centreSongs.ts) move the same way: a take the code put in a song (`centre`) is
// known here; a track that is only in its album (its list is fetched when opened) carries its performer in the move
// itself (`who`, `note`), and lands among the song's Centre recordings (`centre: true`), which keep its download rule.

/** `who`/`note`/`centre` come with a move of an album-only track of the Centre (the code lists it nowhere) */
type MoveInfo = { at?: string; who?: string; note?: string; centre?: boolean };
export type Placement =
  | ({ kind: 'song'; region: FolkRegionId; title: string } & MoveInfo)
  | ({ kind: 'chant'; album: ChantAlbumId; title: string } & MoveInfo);

// the lists as the code writes them
const BASE_SONGS: FolkSong[] = FOLK_SONGS.map(s => ({ ...s, recs: s.recs && [...s.recs], centre: s.centre && [...s.centre] }));
const BASE_ALBUMS = Object.fromEntries(Object.entries(ALBUM_RECS).map(([k, v]) => [k, [...v]])) as Record<ChantAlbumId, AlbumRec[]>;

// performer and remark of every movable recording, wherever the code put it
const REC_INFO = new Map<string, { who: string; note?: string; title: string }>();
for (const s of BASE_SONGS) for (const r of s.recs ?? []) REC_INFO.set(r.id, { who: r.who, note: r.note, title: s.title });
for (const recs of Object.values(BASE_ALBUMS)) for (const [id, title, who, note] of recs) REC_INFO.set(id, { who, note, title });
// the Centre's takes the code put in a song (with their voices)
const CENTRE_INFO = new Map<string, CentreRec & { title: string }>();
for (const s of BASE_SONGS) for (const c of s.centre ?? []) { const id = centreRecId(c); if (id) CENTRE_INFO.set(id, { ...c, title: s.title }); }

let moves: Record<string, Placement> = {};
let version = 0;
const listeners = new Set<() => void>();

const apply = () => {
  const songs: FolkSong[] = BASE_SONGS.map(s => ({
    ...s,
    recs: s.recs?.filter(r => !moves[r.id]),
    centre: s.centre?.filter(c => { const id = centreRecId(c); return !id || !moves[id]; }),
  }));
  const albums = Object.fromEntries(
    Object.entries(BASE_ALBUMS).map(([k, v]) => [k, v.filter(r => !moves[r[0]])])
  ) as Record<ChantAlbumId, AlbumRec[]>;
  for (const [id, m] of Object.entries(moves)) {
    const centre = CENTRE_INFO.get(id) ?? (m?.centre && m.who ? { who: m.who, note: m.note, mp3: id, title: m.title } : undefined);
    const info = REC_INFO.get(id) ?? centre;
    if (!info || !m?.title) continue;
    if (m.kind === 'song') {
      const same = songs.filter(s => s.region === m.region && s.title === m.title);
      let target = same.find(s => !s.area) ?? same[0];
      if (!target) songs.push((target = { id: `mv-${id}`, title: m.title, region: m.region, versions: [], recs: [] }));
      if (centre && !REC_INFO.has(id)) {
        const { title: _title, ...rec } = centre;
        target.centre = [...(target.centre ?? []), rec];
      } else {
        const rec: SongRec = { id, who: info.who, note: info.note };
        target.recs = [...(target.recs ?? []), rec];
      }
    } else if (albums[m.album]) {
      albums[m.album].push([id, m.title, info.who, info.note]);
    }
  }
  // an archive song whose every recording went elsewhere leaves the list
  const kept = songs.filter(s => {
    if (s.versions.length > 0 || (s.recs?.length ?? 0) > 0 || (s.centre?.length ?? 0) > 0) return true;
    const base = BASE_SONGS.find(b => b.id === s.id);
    return !base?.recs?.length && !base?.centre?.length;
  });
  FOLK_SONGS.splice(0, FOLK_SONGS.length, ...kept);
  for (const k of Object.keys(albums) as ChantAlbumId[]) ALBUM_RECS[k] = albums[k];
  version++;
  listeners.forEach(l => l());
};

let started = false;
/** Starts listening once (the app's root calls it); offline, the last copy comes from the cache. */
export const startPlacements = () => {
  if (started) return;
  started = true;
  onSnapshot(
    doc(db, 'settings', 'placements'),
    snap => {
      moves = (snap.data()?.recs as Record<string, Placement>) || {};
      apply();
    },
    err => console.warn('placements:', err?.code || err)
  );
};

/** Re-renders when a recording is moved; the number changes each time, for memo dependencies */
export const usePlacements = () => {
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return v;
};

/** Changes each time the moves change (for caches outside React) */
export const placementsVersion = () => version;

export const placementOf = (id: string): Placement | undefined => moves[id];

/** Where the code itself puts a recording (shown as „თავდაპირველად“ in the move sheet) */
export const originalPlace = (id: string): Placement | undefined => {
  for (const s of BASE_SONGS) {
    if (s.recs?.some(r => r.id === id) || s.centre?.some(c => centreRecId(c) === id)) return { kind: 'song', region: s.region, title: s.title };
  }
  for (const [album, recs] of Object.entries(BASE_ALBUMS)) {
    const r = recs.find(x => x[0] === id);
    if (r) return { kind: 'chant', album: album as ChantAlbumId, title: r[1] };
  }
  return undefined;
};

/** Move recordings (one, or all of a song's); a move back to where the code puts it just clears the move */
export const moveRecordings = async (ids: string[], to: Placement) => {
  // nothing undefined goes to Firestore
  to = Object.fromEntries(Object.entries(to).filter(([, v]) => v !== undefined)) as Placement;
  const at = new Date().toISOString();
  const recs: Record<string, unknown> = {};
  for (const id of ids) {
    const o = originalPlace(id);
    const home = o && o.kind === to.kind && o.title === to.title &&
      (o.kind === 'song' ? to.kind === 'song' && o.region === to.region : to.kind === 'chant' && o.album === to.album);
    recs[id] = home ? deleteField() : { ...to, at };
  }
  await setDoc(doc(db, 'settings', 'placements'), { recs }, { merge: true });
};

/** Put recordings back where the code puts them */
export const resetRecordings = async (ids: string[]) => {
  await updateDoc(doc(db, 'settings', 'placements'), Object.fromEntries(ids.map(id => [`recs.${id}`, deleteField()])));
};
