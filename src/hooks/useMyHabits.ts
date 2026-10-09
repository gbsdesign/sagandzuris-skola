import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HabitSetup, resolveHabits } from '../utils/myHabits';

/** My habits (live), the school's when nothing is saved or nobody is signed in. */
export const useMyHabits = (uid?: string | null) => {
  const [setup, setSetup] = useState<HabitSetup | null>(null);
  useEffect(() => {
    if (!uid) { setSetup(null); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => {
        const v = snap.data()?.habitSetup;
        setSetup(v && typeof v === 'object' ? v : null);
      },
      () => {}
    );
  }, [uid]);
  const groups = useMemo(() => resolveHabits(setup), [setup]);
  const save = (next: HabitSetup | null) => {
    setSetup(next);
    if (!uid) return Promise.resolve();
    // null = back to the school's list
    return setDoc(doc(db, 'students', uid), { habitSetup: next ?? {} }, { mergeFields: ['habitSetup'] });
  };
  return { setup: setup || {}, groups, save, changed: Boolean(setup && Object.keys(setup).length) };
};
