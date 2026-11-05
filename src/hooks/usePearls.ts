import { useEffect, useState } from 'react';
import { Bytes, collection, deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PearlShine } from '../utils/pearls';
import type { Voice } from '../utils/pathItems';

// The takes a member sends to their teachers and the teachers' approvals — the store the old pearls game began
// (removed 2026-11-05) and the learning mode, the studio and the readings use (ids learn~…, studio~…, read~…):
//   students/{uid}.pearlShine  {takeId: {voice, by, at}}    a teacher heard it and approved (teachers only)
//   pearlTakes/{uid}/takes/{takeId}  {audio (MP3 bytes), mime, score, voice, at}  the kept take, for the member's
//                                    teachers to hear

/** The approvals, and the voice the member named in their profile (the first one offered). */
export const usePearls = (uid?: string | null) => {
  const [state, setState] = useState<{ shine: Record<string, PearlShine>; voice: Voice; loaded: boolean }>(
    { shine: {}, voice: '1', loaded: false });
  useEffect(() => {
    if (!uid) { setState({ shine: {}, voice: '1', loaded: true }); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const d = s.data();
        const voice = ((d?.profile?.voices || []) as string[]).find((v): v is Voice => v === '1' || v === '2' || v === '3') || '1';
        setState({ shine: d?.pearlShine || {}, voice, loaded: true });
      },
      err => { console.warn('pearls: ', err?.code || err); setState(x => ({ ...x, loaded: true })); },
    );
  }, [uid]);
  return state;
};

export const saveTake = async (uid: string, id: string, mp3: Blob, score: number, voice: Voice) =>
  setDoc(doc(db, 'pearlTakes', uid, 'takes', id), {
    audio: Bytes.fromUint8Array(new Uint8Array(await mp3.arrayBuffer())),
    mime: mp3.type || 'audio/mpeg',
    score,
    voice,
    at: new Date().toISOString(),
  });

export interface PearlTake { id: string; audio: Bytes; mime: string; score: number; voice: Voice; at: string }

/** A member's kept takes (the member, their teachers, admins). */
export const usePearlTakes = (uid: string | null | undefined, enabled = true) => {
  const [takes, setTakes] = useState<Record<string, PearlTake>>({});
  useEffect(() => {
    if (!uid || !enabled) { setTakes({}); return; }
    return onSnapshot(
      collection(db, 'pearlTakes', uid, 'takes'),
      s => setTakes(Object.fromEntries(s.docs.map(d => [d.id, { id: d.id, ...(d.data() as Omit<PearlTake, 'id'>) }]))),
      err => { console.warn('pearl takes: ', err?.code || err); setTakes({}); },
    );
  }, [uid, enabled]);
  return takes;
};

/** A teacher approves a pearl (it shines), or takes the approval back (null). */
export const shinePearl = (uid: string, id: string, shine: PearlShine | null) =>
  setDoc(doc(db, 'students', uid), { pearlShine: { [id]: shine ?? deleteField() }, updatedAt: new Date().toISOString() }, { merge: true });

export const takeUrl = (t: PearlTake) => URL.createObjectURL(new Blob([t.audio.toUint8Array() as Uint8Array<ArrayBuffer>], { type: t.mime || 'audio/mpeg' }));
