import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { mondayOf } from '../utils/growth';
import { tbilisiToday } from '../utils/hangi';

// settings/growth { weeks: { <Monday YYYY-MM-DD>: active members } } — „სკოლის ზრდა“ (utils/growth.ts says how it is counted).
const ref = () => doc(db, 'settings', 'growth');

export const useGrowthWeeks = () => {
  const [weeks, setWeeks] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => onSnapshot(ref(),
    s => { const w = s.data()?.weeks; setWeeks(w && typeof w === 'object' ? w : {}); setLoaded(true); },
    () => setLoaded(true)), []);
  return { weeks, loaded };
};

/** Keeps this week's active count when it is more than the one kept (an admin's panel, once per visit). */
export const recordWeek = (weeks: Record<string, number>, active: number, today = tbilisiToday()) => {
  const key = mondayOf(today);
  if (active <= (weeks[key] || 0)) return Promise.resolve();
  return setDoc(ref(), { weeks: { [key]: active }, updatedAt: new Date().toISOString() }, { merge: true });
};
