import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Voice } from '../utils/pathItems';

// Teacher's "ჩათვლა": per student, which voices of which path item a teacher has confirmed.
// Kept in confirmations/{uid} (only admins may write), so a student can't confirm their own work.
// Learned-only items (poems, instruments) use voice '1' to mean "learned".
export type Confirmations = Record<string, Voice[]>;

export const useConfirmations = (uid?: string | null) => {
  const [conf, setConf] = useState<Confirmations>({});
  useEffect(() => {
    if (!uid) { setConf({}); return; }
    return onSnapshot(
      doc(db, 'confirmations', uid),
      snap => setConf((snap.exists() && snap.data().voices) || {}),
      err => { console.warn('confirmations: ', err?.code || err); setConf({}); }
    );
  }, [uid]);
  return conf;
};

export const saveConfirmation = (uid: string, variantId: string, voices: Voice[], by?: string) =>
  setDoc(doc(db, 'confirmations', uid), { voices: { [variantId]: voices }, updatedAt: new Date().toISOString(), updatedBy: by || '' }, { merge: true });
