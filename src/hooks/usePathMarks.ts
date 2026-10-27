import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, useChants } from '../context';
import { useConfirmations } from './useConfirmations';
import { Voice, findCatalogEntry, usesVoices, voicesOf } from '../utils/pathItems';

/** A teacher's stop on a student's own marking (students/{uid}.marksLock): while on, only teachers mark. The student
 *  may still add chants to the path — the lock is only on "what I know". */
export type MarksLock = { on: boolean; by?: string; at?: number };

const readMarksLock = (raw: unknown): MarksLock | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return { on: r.on === true, by: typeof r.by === 'string' ? r.by : undefined, at: typeof r.at === 'number' ? r.at : undefined };
};

export const useMarksLock = (uid?: string | null) => {
  const [lock, setLock] = useState<MarksLock | null>(null);
  useEffect(() => {
    if (!uid) { setLock(null); return; }
    return onSnapshot(doc(db, 'students', uid), snap => setLock(readMarksLock(snap.data()?.marksLock)), () => {});
  }, [uid]);
  return lock;
};

/** Teachers and admins only (firestore.rules keep the field out of the student's hands). */
export const saveMarksLock = (uid: string, on: boolean, by: string) =>
  setDoc(doc(db, 'students', uid), { marksLock: { on, by, at: Date.now() } }, { mergeFields: ['marksLock'] });

/** The student's own marks on their path ("რა ვიცი"): a voice — or a whole poem or instrument — on or off. Nothing
 *  while a teacher has locked marking; a voice the teacher confirmed ("ჩათვლა") only the teacher takes back. An item
 *  not on the path yet (marked from the class program) joins it with that mark. */
export const usePathMarks = (onLearned?: () => void) => {
  const { user } = useAuth();
  const { selectedChantVariants, setSelectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const lock = useMarksLock(user?.uid);
  const locked = !!lock?.on;

  const toggle = (id: string, voice: Voice) => {
    const cur = selectedChantVariants[id] ?? findCatalogEntry(id)?.make();
    if (!cur || locked || (confirmed[id] || []).includes(voice)) return;
    const have = voicesOf(cur, id);
    const adding = !have.includes(voice);
    const voices: Voice[] = usesVoices(id)
      ? (adding ? [...have, voice].sort() as Voice[] : have.filter(v => v !== voice))
      : (adding ? ['1'] : []);
    const next = { ...selectedChantVariants, [id]: { ...cur, voices, isLearned: voices.length > 0 } };
    setSelectedChantVariants(next);
    if (adding) onLearned?.();
    if (user) {
      setDoc(doc(db, 'students', user.uid), { selectedChantVariants: next }, { mergeFields: ['selectedChantVariants'] }).catch(err =>
        console.warn('Firestore path mark note:', err)
      );
    }
  };

  return { locked, lock, confirmed, toggle };
};
