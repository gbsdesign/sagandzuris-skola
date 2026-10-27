import { useCallback, useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { georgiaToday } from './psalter';

// The exercises a student has done („ოსტატობა“), by drill id (data/vocalDrills.ts), kept on this device: drill id →
// the Georgian days it was done, the last 60 days. A signed-in member also leaves the last day in
// students/{uid}.drillDone {drillId: 'YYYY-MM-DD'}, so the teachers see an exercise they assigned done.
const KEY = 'sg-manera-done';
const EVENT = 'sg-manera-done';
type Done = Record<string, string[]>;

const read = (): Done => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
};

const daysAgo = (n: number) => georgiaToday(new Date(Date.now() - n * 86400000));

export const markDrillDone = (id: string, uid?: string | null) => {
  const done = read();
  const today = georgiaToday();
  const oldest = daysAgo(60);
  done[id] = [...new Set([...(done[id] || []), today])].filter(d => d >= oldest);
  if (uid) setDoc(doc(db, 'students', uid), { drillDone: { [id]: today } }, { merge: true }).catch(() => {});
  try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* storage off: the tick lasts this visit */ }
  window.dispatchEvent(new Event(EVENT));
};

/** Which drills are done today, and on how many of the last 7 days anything was practised. */
export const useManeraPractice = () => {
  const [done, setDone] = useState<Done>(read);
  useEffect(() => {
    const on = () => setDone(read());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  const today = georgiaToday();
  const weekStart = daysAgo(6);
  const doneToday = useCallback((id: string) => !!done[id]?.includes(today), [done, today]);
  const weekDays = new Set(Object.values(done).flat().filter(d => d >= weekStart)).size;
  return { doneToday, weekDays };
};
