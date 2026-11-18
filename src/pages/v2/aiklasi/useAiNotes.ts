import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useMyClasses } from '../../../hooks/useClasses';
import { activeFor, withNote, withoutNote, type ActiveNote, type AiClassNote, type AiStudentNote } from '../../../utils/aiTeacherNotes';

// The teacher's instructions to the AI (utils/aiTeacherNotes.ts): live reads and the two whole-array writes.
//   classes/{id}.aiNotes · students/{uid}.aiTeacherNotes — no rules change (the class's teachers / the student's teachers write).

export const useClassNotes = (classId: string | undefined): AiClassNote[] => {
  const [notes, setNotes] = useState<AiClassNote[]>([]);
  useEffect(() => {
    setNotes([]);
    if (!classId) return;
    return onSnapshot(doc(db, 'classes', classId), s => setNotes(s.data()?.aiNotes ?? []), () => setNotes([]));
  }, [classId]);
  return notes;
};

export const useStudentNotes = (uid: string | undefined): AiStudentNote[] => {
  const [notes, setNotes] = useState<AiStudentNote[]>([]);
  useEffect(() => {
    setNotes([]);
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), s => setNotes(s.data()?.aiTeacherNotes ?? []), () => setNotes([]));
  }, [uid]);
  return notes;
};

/** what works now for a member of one class (the class's notes and their own) */
export const useMemberNotes = (classId: string | undefined, uid: string | undefined, enabled: boolean): ActiveNote[] => {
  const cn = useClassNotes(enabled ? classId : undefined);
  const sn = useStudentNotes(enabled ? uid : undefined);
  return useMemo(() => activeFor(cn, sn, classId), [cn, sn, classId]);
};

/** every note that works for the signed-in member across their classes (the lesson's start screen) */
export const useMyActiveNotes = (uid: string | undefined | null): ActiveNote[] => {
  const classes = useMyClasses(uid ?? undefined).filter(c => !c.archived);
  const key = classes.map(c => c.id).join(',');
  const [byClass, setByClass] = useState<Record<string, AiClassNote[]>>({});
  const own = useStudentNotes(uid ?? undefined);
  useEffect(() => {
    setByClass({});
    const offs = key.split(',').filter(Boolean).map(id =>
      onSnapshot(doc(db, 'classes', id), s => setByClass(m => ({ ...m, [id]: s.data()?.aiNotes ?? [] })), () => {}));
    return () => offs.forEach(off => off());
  }, [key]);
  return useMemo(() => activeFor(Object.values(byClass).flat(), own), [byClass, own]);
};

/** add (`note`) or remove (`removeId`) one note of a class, from the list as it is now on the server */
export const changeClassNotes = async (classId: string, change: { add?: AiClassNote; removeId?: string }) => {
  const ref = doc(db, 'classes', classId);
  const cur = (await getDoc(ref)).data()?.aiNotes;
  const next = change.add ? withNote(cur, change.add) : withoutNote(cur, change.removeId ?? '');
  await updateDoc(ref, { aiNotes: next });
};

export const changeStudentNotes = async (uid: string, change: { add?: AiStudentNote; removeId?: string }) => {
  const ref = doc(db, 'students', uid);
  const cur = (await getDoc(ref)).data()?.aiTeacherNotes;
  const next = change.add ? withNote(cur, change.add) : withoutNote(cur, change.removeId ?? '');
  await updateDoc(ref, { aiTeacherNotes: next });
};
