import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { triggerHaptic } from '../utils/haptics';

// The next planned independent-study hours (today's included, even if the hour has passed, so it can
// still be ticked) and a toggle for them — lets the folded "დამოუკიდებელი მეცადინეობა" card be used directly.

const DAY_IDS_BY_INDEX = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
const MONTHS_SHORT_GE = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export interface UpcomingSession {
  key: string;     // `${dateKey}_${hour}`, the completedSessions key
  dayLabel: string; // "დღეს", "ხვალ", "ორშ" or "12 ოქტ"
  hour: string;
  done: boolean;
}

/** Writes the whole map (not a merge) so un-ticking really removes a session. */
export const saveCompletedSessions = (uid: string, next: Record<string, boolean>) =>
  setDoc(doc(db, 'students', uid), { completedSessions: next }, { mergeFields: ['completedSessions'] });

export const useUpcomingSessions = (uid: string | undefined, count = 7) => {
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!uid) { setSchedule({}); setCompleted({}); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => {
        const data = snap.exists() ? snap.data() : {};
        setSchedule(data.profile?.workSchedule || {});
        setCompleted(data.completedSessions || {});
      },
      () => { setSchedule({}); setCompleted({}); }
    );
  }, [uid]);

  const today = new Date();
  const sessions: UpcomingSession[] = [];
  for (let offset = 0; offset < 28 && sessions.length < count; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const raw = schedule[DAY_IDS_BY_INDEX[date.getDay()]];
    if (!raw || typeof raw !== 'string') continue;
    const hours = raw.split(',').map(s => s.trim()).filter(h => /^\d{2}:00$/.test(h)).sort();
    const dayLabel = offset === 0 ? 'დღეს' : offset === 1 ? 'ხვალ'
      : offset < 7 ? DAY_IDS_BY_INDEX[date.getDay()] : `${date.getDate()} ${MONTHS_SHORT_GE[date.getMonth()]}`;
    for (const hour of hours) {
      if (sessions.length >= count) break;
      const key = `${toDateKey(date)}_${hour}`;
      sessions.push({ key, dayLabel, hour, done: !!completed[key] });
    }
  }

  const toggle = (key: string) => {
    if (!uid) return;
    triggerHaptic(10);
    const next = { ...completed };
    if (next[key]) delete next[key]; else next[key] = true;
    setCompleted(next);
    saveCompletedSessions(uid, next).catch(err => console.warn('session sync note:', err));
  };

  return { sessions, toggle };
};
