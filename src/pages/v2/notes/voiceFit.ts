import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import { fitShift } from '../../../utils/aiPlan';

export type MyRange = { low: number; high: number };

/** The measured range of my voice (AI teacher's voice check); null for a guest or before it was measured. */
export const useMyRange = (): MyRange | null => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [r, setR] = useState<MyRange | null>(null);
  useEffect(() => {
    if (!uid) { setR(null); return; }
    return onSnapshot(doc(db, 'students', uid), s => {
      const v = s.data()?.aiNote?.voice;
      setR(v && Number.isFinite(v.low) && Number.isFinite(v.high) ? { low: v.low, high: v.high } : null);
    }, () => setR(null));
  }, [uid]);
  return r;
};

/** How many semitones the notes move into my voice (0 = leave them). */
export const fitFor = (range: MyRange, notes: number[]): number => fitShift(range.low, range.high, notes);

export const shiftWords = (d: number): string =>
  d === 0 ? '' : d < 0 ? `${Math.abs(d)} ტონით დაბლა` : `${d} ტონით მაღლა`;
