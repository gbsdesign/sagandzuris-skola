import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { pairKey } from './duplicates';

// „სხვა ადამიანია“ (admin panel, 2026-11-06): two accounts „შესაძლო ორმაგი“ named alike or with one phone that an admin
// checked and found to be two people. settings/notTwins { pairs: ['uidA|uidB', …] } — admins write it (the settings
// rule), only ids are kept, so no rules change.

const ref = () => doc(db, 'settings', 'notTwins');

export const useNotTwins = (enabled = true): ReadonlySet<string> => {
  const [v, setV] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!enabled) { setV(new Set()); return; }
    return onSnapshot(ref(), s => {
      const d = s.data() || {};
      setV(new Set(Array.isArray(d.pairs) ? d.pairs.map(String) : []));
    }, () => setV(new Set()));
  }, [enabled]);
  return v;
};

/** Marks two accounts as two people (on) or takes the mark back (off). */
export const setNotTwins = (a: string, b: string, on: boolean) =>
  setDoc(ref(), {
    pairs: on ? arrayUnion(pairKey(a, b)) : arrayRemove(pairKey(a, b)),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
