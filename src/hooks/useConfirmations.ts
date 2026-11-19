import { useEffect, useMemo, useState } from 'react';
import { FieldPath, deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Voice } from '../utils/pathItems';
import { examKey, withAiPasses, type AiPass } from '../utils/aiPass';

// Teacher's "ჩათვლა": per student, which voices of which path item a teacher has confirmed.
// Kept in confirmations/{uid} (only their teachers and admins may write), so a student can't confirm their own work.
// Learned-only items (poems, instruments) use voice '1' to mean "learned".
// `withAi` (AI step 3): the AI teacher's passed exams (students/{uid}.aiPass, utils/aiPass.ts) count too — for what shows
// the pearls; an editor of the teacher's confirmations reads them without it, so a pass is never copied into them.
export type Confirmations = Record<string, Voice[]>;

export const useConfirmations = (uid?: string | null, opts?: { withAi?: boolean }) => {
  const withAi = !!opts?.withAi;
  const [conf, setConf] = useState<Confirmations>({});
  const [pass, setPass] = useState<AiPass | null>(null);
  useEffect(() => {
    if (!uid) { setConf({}); return; }
    return onSnapshot(
      doc(db, 'confirmations', uid),
      snap => setConf((snap.exists() && snap.data().voices) || {}),
      err => { console.warn('confirmations: ', err?.code || err); setConf({}); }
    );
  }, [uid]);
  useEffect(() => {
    if (!uid || !withAi) { setPass(null); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => setPass((snap.get('aiPass') as AiPass | undefined) ?? null),
      () => setPass(null),
    );
  }, [uid, withAi]);
  return useMemo(() => (withAi && pass ? withAiPasses(conf, pass) : conf), [withAi, pass, conf]);
};

export const saveConfirmation = (uid: string, variantId: string, voices: Voice[], by?: string) =>
  setDoc(doc(db, 'confirmations', uid), { voices: { [variantId]: voices }, updatedAt: new Date().toISOString(), updatedBy: by || '' }, { merge: true });

/** „მოხსნა“ / „AI შეცდა“: a teacher takes the AI teacher's pass of a voice off (the student's page, the week's report). The day of
 *  the last try goes too, so the student may sit the exam again at once. */
export const removeAiPass = (uid: string, variantId: string, voice: Voice) =>
  updateDoc(doc(db, 'students', uid), new FieldPath('aiPass', variantId, voice), deleteField(), new FieldPath('examTries', examKey(variantId, voice)), deleteField());

/** „AI შეცდა“ on the week's report: the AI teacher's „stuck“ for that week (its last day) no longer counts — in the report and
 *  in the Monday notice (utils/weekReport `aiErredWeek`, worker/reminders `weekCountOf`); null takes the mark back. */
export const markAiErred = (uid: string, week: string | null, by: string) =>
  setDoc(doc(db, 'students', uid), { aiErred: week ? { week, by, at: new Date().toISOString() } : deleteField() }, { merge: true });
