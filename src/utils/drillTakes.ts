import { useEffect, useState } from 'react';
import { Bytes, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// A member's recording of an exercise („ოსტატობა“), sent to their teachers — one per drill, the newest:
//   drillTakes/{uid}/takes/{drillId}  {audio (MP3 bytes, < 600 KB), mime, seconds, at}
// Read by the member, their teachers and admins (firestore.rules), like the pearls' takes.
// And the last day each drill was done: students/{uid}.drillDone {drillId: 'YYYY-MM-DD'} (utils/maneraPractice.ts).

export const MAX_TAKE_SECONDS = 90; // 48 kbps MP3 → about 540 KB

export interface DrillTake { id: string; audio: Bytes; mime: string; seconds: number; at: string }

export const saveDrillTake = async (uid: string, drillId: string, mp3: Blob, seconds: number) =>
  setDoc(doc(db, 'drillTakes', uid, 'takes', drillId), {
    audio: Bytes.fromUint8Array(new Uint8Array(await mp3.arrayBuffer())),
    mime: mp3.type || 'audio/mpeg',
    seconds: Math.round(seconds),
    at: new Date().toISOString(),
  });

export const deleteDrillTake = (uid: string, drillId: string) => deleteDoc(doc(db, 'drillTakes', uid, 'takes', drillId));

/** A member's sent recordings, the newest first. */
export const useDrillTakes = (uid: string | null | undefined) => {
  const [takes, setTakes] = useState<DrillTake[]>([]);
  useEffect(() => {
    if (!uid) { setTakes([]); return; }
    return onSnapshot(
      collection(db, 'drillTakes', uid, 'takes'),
      s => setTakes(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DrillTake, 'id'>) })).sort((a, b) => b.at.localeCompare(a.at))),
      err => { console.warn('drill takes: ', err?.code || err); setTakes([]); },
    );
  }, [uid]);
  return takes;
};

export const drillTakeUrl = (t: DrillTake) =>
  URL.createObjectURL(new Blob([t.audio.toUint8Array() as Uint8Array<ArrayBuffer>], { type: t.mime || 'audio/mpeg' }));

/** students/{uid}.drillDone, read live: drill id → the last day it was done. */
export const readDrillDone = (raw: unknown): Record<string, string> =>
  raw && typeof raw === 'object'
    ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'))
    : {};

export const useDrillDone = (uid: string | null | undefined) => {
  const [done, setDone] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!uid) { setDone({}); return; }
    return onSnapshot(doc(db, 'students', uid), s => setDone(readDrillDone(s.data()?.drillDone)), () => {});
  }, [uid]);
  return done;
};
