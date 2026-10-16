import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HabitSetup, resolveCounters, resolveHabits, resolveLooks } from '../utils/myHabits';

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
  // each habit's colour and icon, and the habits counted in numbers
  const looks = useMemo(() => resolveLooks(setup, groups), [setup, groups]);
  const counters = useMemo(() => resolveCounters(setup, groups), [setup, groups]);
  const save = (next: HabitSetup | null) => {
    setSetup(next);
    if (!uid) return Promise.resolve();
    // null = back to the school's list
    return setDoc(doc(db, 'students', uid), { habitSetup: next ?? {} }, { mergeFields: ['habitSetup'] });
  };
  return { setup: setup || {}, groups, looks, counters, save, changed: Boolean(setup && Object.keys(setup).length) };
};
