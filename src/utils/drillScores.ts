import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// The app's own score of each „ოსტატობა“ exercise (utils/drillScore.ts, the AI teacher for the tips): the best
// percent kept on the device and, for members, in students/{uid}.drillScore.{drillId} — the student writes it,
// the teachers read it in the member's window. A worse try never lowers it.

const KEY = 'sg-drill-score';
const EVENT = 'sg-drill-score';

const readLocal = (): Record<string, number> => {
  try { return readDrillScores(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {}; }
};

export const readDrillScores = (raw: unknown): Record<string, number> =>
  raw && typeof raw === 'object'
    ? Object.fromEntries(Object.entries(raw as Record<string, unknown>)
      .filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]))
      .map(([k, v]) => [k, Math.max(0, Math.min(100, Math.round(v)))]))
    : {};

/** Keeps `pct` if it beats the best so far (here and in `known`, the member's record); true when it did. */
export const saveDrillScore = async (drillId: string, pct: number, uid?: string | null, known = 0): Promise<boolean> => {
  const local = readLocal();
  const had = drillId in local || known > 0;
  if (had && pct <= Math.max(local[drillId] ?? 0, known)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...local, [drillId]: pct }));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* storage off */ }
  if (uid) await setDoc(doc(db, 'students', uid), { drillScore: { [drillId]: pct } }, { merge: true }).catch(() => undefined);
  return true;
};

/** The best score of every exercise: the member's record joined with this device's. */
export const useDrillScores = (uid: string | null | undefined) => {
  const [local, setLocal] = useState(readLocal);
  const [remote, setRemote] = useState<Record<string, number>>({});
  useEffect(() => {
    const on = () => setLocal(readLocal());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  useEffect(() => {
    if (!uid) { setRemote({}); return; }
    return onSnapshot(doc(db, 'students', uid), s => setRemote(readDrillScores(s.data()?.drillScore)), () => {});
  }, [uid]);
  const out: Record<string, number> = { ...local };
  for (const [k, v] of Object.entries(remote)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};
