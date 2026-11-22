import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// students.dayChants { [iso day]: variantIds } — chants a member put into a day's „დღის მსახურება“ from a version's long-press
// window (2026-11-22, the user: „დღის მსახურებაში მონიშვნა“). The day page shows them on top, each opens its notes.

/** today's Georgian calendar day (Tbilisi is UTC+4 all year) */
export const tbilisiToday = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);

export const addDayChant = (uid: string, iso: string, id: string) =>
  setDoc(doc(db, 'students', uid), { dayChants: { [iso]: arrayUnion(id) } }, { merge: true });

export const removeDayChant = (uid: string, iso: string, id: string) =>
  setDoc(doc(db, 'students', uid), { dayChants: { [iso]: arrayRemove(id) } }, { merge: true });

/** every day's additions of this member, live */
export const useDayChants = (uid: string | undefined): Record<string, string[]> => {
  const [map, setMap] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!uid) { setMap({}); return; }
    return onSnapshot(doc(db, 'students', uid), s => {
      const raw = (s.data()?.dayChants ?? {}) as Record<string, unknown>;
      const next: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(raw)) if (Array.isArray(v)) next[k] = v.filter((x): x is string => typeof x === 'string');
      setMap(next);
    }, () => {});
  }, [uid]);
  return map;
};
