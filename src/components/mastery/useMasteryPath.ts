import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { useViewing } from '../../context/AuthContext';
import { findDrill } from '../../data/vocalDrills';
import { useDrillScores } from '../../utils/drillScores';
import { useManeraPractice } from '../../utils/maneraPractice';
import { georgiaToday } from '../../utils/psalter';
import { currentLevel, dayPlan, levelState, pathSummary, recordFromDoc, type PlanItem } from '../../utils/masteryPath';
import { MASTERY_LEVELS } from '../../data/masteryPath';
import { useOpenDrillWork } from './DrillGroups';

// The member's „ოსტატობის გზა“ (utils/masteryPath.ts): their record — one listener on students/{uid} — joined with this
// device's scores, done days and entry test; a guest's lives on the device alone. Also the day's plan, kept the same the
// whole day once made (`sg-mastery-day`), so finishing an exercise ticks it instead of swapping it for another.

const START_KEY = 'sg-mastery-start';
const DAY_KEY = 'sg-mastery-day';
const EVENT = 'sg-mastery-start';

const readStart = (): number | undefined => {
  try { const v = Number(localStorage.getItem(START_KEY)); return Number.isFinite(v) && localStorage.getItem(START_KEY) !== null ? v : undefined; } catch { return undefined; }
};

/** keeps the entry test's level (and the voice it found) on the device and in the member's record */
export const saveStart = (level: number, range: 'low' | 'high', uid?: string | null) => {
  try { localStorage.setItem(START_KEY, String(level)); } catch { /* storage off */ }
  window.dispatchEvent(new Event(EVENT));
  if (uid) void setDoc(doc(db, 'students', uid), { mastery: { start: level, at: Date.now(), range } }, { merge: true }).catch(() => undefined);
};

export const useMasteryPath = () => {
  const { user } = useAuth();
  const viewing = useViewing();
  const uid = user?.uid;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [start, setStart] = useState(readStart);
  useEffect(() => {
    if (!uid) { setData(null); return; }
    return onSnapshot(doc(db, 'students', uid), s => setData(s.data() ?? {}), () => {});
  }, [uid]);
  useEffect(() => {
    const on = () => setStart(readStart());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  // this device's own (a teacher looking at a student's page sees the record alone)
  const localScores = useDrillScores(undefined);
  const { doneToday, everDone } = useManeraPractice();
  const record = useMemo(
    () => recordFromDoc(data, viewing ? {} : { scores: localScores, done: everDone, start }),
    [data, viewing, localScores, everDone, start],
  );
  const tested = (data && typeof data.mastery === 'object' && data.mastery !== null) || (!viewing && start !== undefined);

  const assigned = useOpenDrillWork()[0]?.exercise ?? null;
  const today = georgiaToday();
  const plan = useMemo((): PlanItem[] => {
    const fresh = dayPlan(record, doneToday, assigned);
    if (viewing) return fresh;
    try {
      const kept = JSON.parse(localStorage.getItem(DAY_KEY) || 'null') as { day: string; level: number; items: PlanItem[] } | null;
      const level = currentLevel(record);
      if (kept && kept.day === today && kept.level === level && kept.items.every(p => findDrill(p.id))
        && (!assigned || kept.items.some(p => p.id === assigned))) return kept.items;
      localStorage.setItem(DAY_KEY, JSON.stringify({ day: today, level, items: fresh }));
    } catch { /* storage off */ }
    return fresh;
  // the plan is made from the record as the day starts; a tick today does not remake it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, assigned, today, viewing]);

  const summary = pathSummary(record);
  const levels = MASTERY_LEVELS.map(l => levelState(l, record));
  return { record, summary, levels, plan, doneToday, tested: !!tested, uid };
};
