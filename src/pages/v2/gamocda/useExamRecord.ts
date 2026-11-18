import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { examKey, type AiPass, type AiPassEntry } from '../../../utils/aiPass';
import type { Voice } from '../../../utils/pathItems';

// The exam's two records in the member's own document: students/{uid}.aiPass (what the AI passed) and .examTries (the day of
// the last try of each voice). Both are written with merge, so other chants' and voices' entries are never overwritten.

export interface ExamRecord { loaded: boolean; pass: AiPass; tries: Record<string, string> }

export const useExamRecord = (uid: string | null | undefined): ExamRecord => {
  const [rec, setRec] = useState<ExamRecord>({ loaded: false, pass: {}, tries: {} });
  useEffect(() => {
    if (!uid) { setRec({ loaded: true, pass: {}, tries: {} }); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      s => setRec({ loaded: true, pass: (s.get('aiPass') as AiPass | undefined) ?? {}, tries: (s.get('examTries') as Record<string, string> | undefined) ?? {} }),
      () => setRec({ loaded: true, pass: {}, tries: {} }),
    );
  }, [uid]);
  return rec;
};

/** A finished try: its day always, the pass too when it passed. */
export const saveExamTry = (uid: string, variantId: string, voice: Voice, day: string, pass: AiPassEntry | null) =>
  setDoc(doc(db, 'students', uid), {
    examTries: { [examKey(variantId, voice)]: day },
    ...(pass ? { aiPass: { [variantId]: { [voice]: pass } } } : {}),
  }, { merge: true });
