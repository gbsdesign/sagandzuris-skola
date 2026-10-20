import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, useChants } from '../context';
import { useMyClasses } from './useClasses';
import { Confirmations, useConfirmations } from './useConfirmations';
import { Voice, voicesOf } from '../utils/pathItems';

// classes/{classId}/marks/{uid}: a member's marks on the class program only — the voices they marked on their path
// and the ones a teacher confirmed. Each member's own app copies them here, so classmates see who knows which voice
// without reading each other's private records (students/{uid} stays closed to them).
export type MemberMarks = { voices: Record<string, Voice[]>; confirmed: Record<string, Voice[]> };

const VOICES = new Set<string>(['1', '2', '3']);

const readVoices = (raw: unknown): Record<string, Voice[]> => {
  const out: Record<string, Voice[]> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const list = Array.isArray(v) ? v.filter((x): x is Voice => typeof x === 'string' && VOICES.has(x)) : [];
    if (list.length) out[id] = list;
  }
  return out;
};

/** The viewer's own voices of one program item: marked on the path or confirmed by a teacher. */
export const ownVoices = (variants: Record<string, any>, confirmed: Confirmations, id: string) => {
  const marked = variants[id] ? voicesOf(variants[id], id) : [];
  const ok = confirmed[id] || [];
  return { known: [...new Set([...marked, ...ok])].sort() as Voice[], confirmed: ok };
};

const marksFor = (ids: string[], variants: Record<string, any>, confirmed: Confirmations): MemberMarks => {
  const voices: Record<string, Voice[]> = {};
  const ok: Record<string, Voice[]> = {};
  for (const id of ids) {
    const own = ownVoices(variants, confirmed, id);
    if (own.known.length) voices[id] = own.known;
    if (own.confirmed.length) ok[id] = [...own.confirmed].sort() as Voice[];
  }
  return { voices, confirmed: ok };
};

const sentKey = (classId: string, uid: string) => `sgClassMarks:${classId}:${uid}`;

/** Mounted once for the whole app: keeps the member's entry in each of their classes up to date. A copy is sent only
 *  when it differs from the last one this device sent, a moment after the marks settle. */
export const useClassMarksSync = () => {
  const { user } = useAuth();
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const classes = useMyClasses(user?.uid);

  useEffect(() => {
    if (!user || !classes.length) return;
    const t = setTimeout(() => {
      for (const c of classes) {
        const ids = c.program.map(p => p.id).filter((id): id is string => !!id);
        if (!ids.length) continue;
        const marks = marksFor(ids, selectedChantVariants || {}, confirmed);
        const json = JSON.stringify(marks);
        const key = sentKey(c.id, user.uid);
        let last: string | null = null;
        try { last = localStorage.getItem(key); } catch { /* storage off */ }
        if (last === json) continue;
        setDoc(doc(db, 'classes', c.id, 'marks', user.uid), { ...marks, updatedAt: new Date().toISOString() })
          .then(() => { try { localStorage.setItem(key, json); } catch { /* storage off */ } })
          .catch(err => console.warn('class marks: ', err?.code || err));
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [user, classes, selectedChantVariants, confirmed]);
};

/** Every member's copy in one class, by uid (live). */
export const useClassMarks = (classId?: string) => {
  const [marks, setMarks] = useState<Record<string, MemberMarks>>({});
  useEffect(() => {
    if (!classId) { setMarks({}); return; }
    return onSnapshot(
      collection(db, 'classes', classId, 'marks'),
      snap => {
        const out: Record<string, MemberMarks> = {};
        snap.docs.forEach(d => { out[d.id] = { voices: readVoices(d.data().voices), confirmed: readVoices(d.data().confirmed) }; });
        setMarks(out);
      },
      err => { console.warn('class marks: ', err?.code || err); setMarks({}); }
    );
  }, [classId]);
  return marks;
};
