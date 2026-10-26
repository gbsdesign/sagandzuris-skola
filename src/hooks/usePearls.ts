import { useEffect, useState } from 'react';
import { Bytes, collection, deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PearlRecord, PearlShine } from '../utils/pearls';
import type { Voice } from '../utils/pathItems';

// The pearls game's records (redesign stage 7):
//   students/{uid}.pearls      {versionId: {best, voice, at}}  the member's best try (the member writes it)
//   students/{uid}.pearlShine  {versionId: {voice, by, at}}    a teacher heard it and approved (teachers only)
//   pearlTakes/{uid}/takes/{versionId}  {audio (MP3 bytes), mime, score, voice, at}  the best take, for the
//                                        member's teachers to hear

export const usePearls = (uid?: string | null) => {
  const [state, setState] = useState<{ pearls: Record<string, PearlRecord>; shine: Record<string, PearlShine>; voice: Voice; loaded: boolean }>(
    { pearls: {}, shine: {}, voice: '1', loaded: false });
  useEffect(() => {
    if (!uid) { setState({ pearls: {}, shine: {}, voice: '1', loaded: true }); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const d = s.data();
        // the voice the member named in their profile is the first one offered
        const voice = ((d?.profile?.voices || []) as string[]).find((v): v is Voice => v === '1' || v === '2' || v === '3') || '1';
        setState({ pearls: d?.pearls || {}, shine: d?.pearlShine || {}, voice, loaded: true });
      },
      err => { console.warn('pearls: ', err?.code || err); setState(x => ({ ...x, loaded: true })); },
    );
  }, [uid]);
  return state;
};

export const savePearl = (uid: string, id: string, rec: PearlRecord) =>
  setDoc(doc(db, 'students', uid), { pearls: { [id]: rec } }, { merge: true });

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
