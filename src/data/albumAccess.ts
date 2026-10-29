import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { useMembership } from '../utils/memberAccess';

// Who hears and who saves each album of the song albums (centreSongs.ts). Staff (teachers and admins) have every album;
// a member has only what an admin turned on — for everyone in ⚙ „სკოლა“ → „ალბომები“, or for them in their window — and
// sees nothing of the rest: not the album, not its recordings inside the songs, not a song that has only those.
//   settings/albumAccess { all: { <album folder id>: { l?: bool, d?: bool } } }   — for every member (admins write)
//   albumAccess/{uid}    { albums: { <album folder id>: { l?: bool, d?: bool } } } — one member's (admins write, they read)
// l = listen, d = download; each alone or both. data/placements.ts lays the result over FOLK_SONGS.

export type AlbumRight = { l?: boolean; d?: boolean };
export type AlbumRights = Record<string, AlbumRight>;

let all: AlbumRights = {};
let mine: AlbumRights = {};
let staff = false;
let member = false;
let version = 0;
const listeners = new Set<() => void>();
const changed = () => { version++; listeners.forEach(l => l()); };

/** May the signed-in person hear / save this album? */
export const albumRight = (album: string): { listen: boolean; download: boolean } => {
  if (staff) return { listen: true, download: true };
  if (!member) return { listen: false, download: false };
  const a = all[album], m = mine[album];
  return { listen: Boolean(a?.l || m?.l), download: Boolean(a?.d || m?.d) };
};
/** Is the album there for them at all (to hear, to save or both)? */
export const albumShown = (album: string) => { const r = albumRight(album); return r.listen || r.download; };

/** Called when the rights change (placements.ts re-lays the songs) */
export const onAlbumAccess = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Re-renders when the rights change; the number changes each time, for memo dependencies */
export const useAlbumAccess = () => {
  const [v, setV] = useState(version);
  useEffect(() => onAlbumAccess(() => setV(version)), []);
  return v;
};

let allStarted = false;
let mineOf: string | null = null;
let stopMine: (() => void) | null = null;

/** The app's root keeps the rights of whoever is signed in (App.tsx) */
export const useAlbumAccessSync = () => {
  const { user, isTeacher } = useAuth();
  const isMember = useMembership().isMember;
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (staff !== isTeacher || member !== (isMember && !!uid)) {
      staff = isTeacher;
      member = isMember && !!uid;
      changed();
    }
  }, [isTeacher, isMember, uid]);
  useEffect(() => {
    if (!uid || isTeacher) return;
    if (!allStarted) {
      allStarted = true;
      onSnapshot(doc(db, 'settings', 'albumAccess'), snap => { all = (snap.data()?.all as AlbumRights) || {}; changed(); }, () => {});
    }
    if (mineOf === uid) return;
    stopMine?.();
    mineOf = uid;
    stopMine = onSnapshot(doc(db, 'albumAccess', uid), snap => { mine = (snap.data()?.albums as AlbumRights) || {}; changed(); }, () => {});
  }, [uid, isTeacher]);
  useEffect(() => {
    if (uid) return;
    stopMine?.(); stopMine = null; mineOf = null;
    if (Object.keys(mine).length) { mine = {}; changed(); }
  }, [uid]);
};

// ── the admin panel ──
const useLiveDoc = (path: [string, string] | null, field: 'all' | 'albums') => {
  const [rights, setRights] = useState<AlbumRights>({});
  const [loaded, setLoaded] = useState(false);
  const key = path ? path.join('/') : '';
  useEffect(() => {
    if (!path) return;
    setLoaded(false);
    return onSnapshot(doc(db, path[0], path[1]), snap => { setRights((snap.data()?.[field] as AlbumRights) || {}); setLoaded(true); }, () => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { rights, loaded };
};

/** The albums turned on for every member */
export const useEveryoneAlbums = () => useLiveDoc(['settings', 'albumAccess'], 'all');
/** One member's own albums */
export const useMemberAlbums = (uid: string) => useLiveDoc(['albumAccess', uid], 'albums');

export const setEveryoneAlbum = (album: string, right: AlbumRight) =>
  setDoc(doc(db, 'settings', 'albumAccess'), { all: { [album]: right } }, { merge: true });
export const setMemberAlbum = (uid: string, album: string, right: AlbumRight) =>
  setDoc(doc(db, 'albumAccess', uid), { albums: { [album]: right } }, { merge: true });
