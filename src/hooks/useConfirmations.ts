import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Voice } from '../utils/pathItems';
import { withAiPasses, type AiPass } from '../utils/aiPass';

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
