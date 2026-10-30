import { useEffect, useState, useSyncExternalStore } from 'react';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, where, writeBatch, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { ROOM_FRESH_MS, createRooms, parseRoom, type Backend, type Data, type RoomDoc } from './gameRoom';

// The online rooms (utils/gameRoom.ts) in the app's Firestore: the backend, the one store of this phone, and the rooms of my
// classes for the invitation strip and the game's own page.

// a document's times as milliseconds (the server's time while it is still on its way: its estimate)
const plain = (d: DocumentData): Data => {
  const out: Data = {};
  for (const [k, v] of Object.entries(d)) out[k] = v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function' ? (v as { toMillis: () => number }).toMillis() : v;
  return out;
};

const backend: Backend = {
  doc: (path, on, err) => onSnapshot(doc(db, path), s => on(s.exists() ? plain(s.data({ serverTimestamps: 'estimate' })) : null), err),
  col: (path, on, err) => onSnapshot(collection(db, path), s => on(s.docs.map(d => ({ id: d.id, d: plain(d.data({ serverTimestamps: 'estimate' })) }))), err),
  get: async path => { const s = await getDoc(doc(db, path)); return s.exists() ? plain(s.data()) : null; },
  write: async ops => {
    const b = writeBatch(db);
    for (const o of ops) {
      const ref = doc(db, o.path);
      if (o.data === null) b.delete(ref);
      else if (o.merge) b.set(ref, o.data, { merge: true });
      else b.set(ref, o.data);
    }
    await b.commit();
  },
  stamp: () => serverTimestamp(),
};

export const roomsBackend = backend;
/** this phone's one online room */
export const rooms = createRooms(backend);
export const useRoom = () => useSyncExternalStore(rooms.subscribe, rooms.get);
export const useRoomVisible = () => useSyncExternalStore(rooms.subscribe, rooms.isVisible);

export interface ClassRoom extends RoomDoc { id: string; classId: string }

/** a room still worth showing: a lobby opened lately, a game touched lately */
export const freshRoom = (r: RoomDoc, now = Date.now()) => now - (r.status === 'lobby' ? r.createdAt : r.at) < ROOM_FRESH_MS;

/** the open rooms of these classes (live), the newest first */
export const useClassRooms = (classIds: string[]) => {
  const [byClass, setByClass] = useState<Record<string, ClassRoom[]>>({});
  const key = [...new Set(classIds)].sort().join(',');
  useEffect(() => {
    const ids = key ? key.split(',') : [];
    setByClass({});
    const offs = ids.map(classId => onSnapshot(
      query(collection(db, 'classes', classId, 'games'), where('status', 'in', ['lobby', 'live', 'over'])),
      s => setByClass(p => ({
        ...p,
        [classId]: s.docs.flatMap(d => { const r = parseRoom(plain(d.data({ serverTimestamps: 'estimate' }))); return r ? [{ ...r, id: d.id, classId }] : []; }),
      })),
      () => setByClass(p => ({ ...p, [classId]: [] })),
    ));
    return () => offs.forEach(f => f());
  }, [key]);
  // a lobby turns stale on its own: look again every minute
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 60_000); return () => clearInterval(t); }, []);
  return Object.values(byClass).flat().filter(r => freshRoom(r)).sort((a, b) => Math.max(b.at, b.createdAt) - Math.max(a.at, a.createdAt));
};
