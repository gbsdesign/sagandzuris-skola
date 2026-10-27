import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { LearnRecord, PartRecord } from '../utils/learn';

// The learning mode's progress, one record per piece (chant version or song recording):
//   students/{uid}.learning  {piece: {part: {best, level, due, at}}}  (the member writes it)
// Someone not signed in keeps it on the device.

const localKey = (piece: string) => `sg-learn-${piece}`;
const readLocal = (piece: string): LearnRecord => {
  try { return JSON.parse(localStorage.getItem(localKey(piece)) || '{}') || {}; } catch { return {}; }
};

export const useLearning = (uid: string | null | undefined, piece: string) => {
  const [rec, setRec] = useState<LearnRecord>(() => (uid ? {} : readLocal(piece)));
  const [loaded, setLoaded] = useState(!uid);
  useEffect(() => {
    if (!uid) { setRec(readLocal(piece)); setLoaded(true); return; }
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      s => { setRec((s.data()?.learning?.[piece] as LearnRecord) || {}); setLoaded(true); },
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
  return { rec, loaded, savePart };
};
