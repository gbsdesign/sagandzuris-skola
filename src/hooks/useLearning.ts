import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { LearnRecord, PartRecord } from '../utils/learn';
import { syncLearnReminder } from '../utils/learnReminder';

// The learning mode's progress, one record per piece (chant version or song recording):
//   students/{uid}.learning  {piece: {part: {best, level, due, at}}}  (the member writes it)
//   students/{uid}.learnParts {piece: number of parts}  (noted when the learning mode opens; the teacher's bars need it)
// Someone not signed in keeps it on the device.

const localKey = (piece: string) => `sg-learn-${piece}`;
const readLocal = (piece: string): LearnRecord => {
  try { return JSON.parse(localStorage.getItem(localKey(piece)) || '{}') || {}; } catch { return {}; }
};

export const useLearning = (uid: string | null | undefined, piece: string) => {
  const [rec, setRec] = useState<LearnRecord>(() => (uid ? {} : readLocal(piece)));
  const [all, setAll] = useState<Record<string, LearnRecord>>({});
  const [loaded, setLoaded] = useState(!uid);
  const [noted, setNoted] = useState<number | undefined>();
  useEffect(() => {
    if (!uid) { setRec(readLocal(piece)); setLoaded(true); return; }
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const learning = (s.data()?.learning || {}) as Record<string, LearnRecord>;
        setRec(learning[piece] || {});
        setAll(learning);
        setNoted(s.data()?.learnParts?.[piece]);
        setLoaded(true);
        syncLearnReminder(learning); // the review reminder follows every change
      },
      err => { console.warn('learning:', err?.code || err); setLoaded(true); },
    );
  }, [uid, piece]);

  const savePart = (part: number, r: PartRecord) => {
    setRec(x => ({ ...x, [part]: r }));
    if (!uid) {
      try { localStorage.setItem(localKey(piece), JSON.stringify({ ...readLocal(piece), [part]: r })); } catch { /* storage off */ }
      return;
    }
    const clean = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined));
    setDoc(doc(db, 'students', uid), { learning: { [piece]: { [part]: clean } } }, { merge: true })
      .catch(e => console.warn('learning save:', e?.code || e));
  };
  /** How many parts the piece has, kept for the teacher (written only when it changed). */
  const noteParts = (n: number) => {
    if (!uid || !loaded || !(n > 0) || noted === n) return;
    setNoted(n);
    setDoc(doc(db, 'students', uid), { learnParts: { [piece]: n } }, { merge: true })
      .catch(e => console.warn('learning parts:', e?.code || e));
  };
  return { rec, all, loaded, savePart, noteParts };
};

/** Everything the member learns, with the part counts (the home page's review line, their assignments). */
export const useAllLearning = (uid: string | null | undefined) => {
  const [all, setAll] = useState<{ learning: Record<string, LearnRecord>; parts: Record<string, number> } | null>(null);
  useEffect(() => {
    if (!uid) { setAll(null); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const learning = (s.data()?.learning || {}) as Record<string, LearnRecord>;
        setAll({ learning, parts: s.data()?.learnParts || {} });
        syncLearnReminder(learning);
      },
      err => console.warn('learning:', err?.code || err),
    );
  }, [uid]);
  return all;
};
