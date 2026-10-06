import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { triggerHaptic } from '../utils/haptics';
import { MONTHS_SHORT_GE } from '../utils/dateNames';

// The next planned independent-study hours (today's included, even if the hour has passed, so it can
// still be ticked) and a toggle for them — lets the folded "დამოუკიდებელი მეცადინეობა" card be used directly.

const DAY_IDS_BY_INDEX = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export interface UpcomingSession {
  key: string;     // `${dateKey}_${hour}`, the completedSessions key
  dayLabel: string; // "დღეს", "ხვალ", "ორშ" or "12 ოქტ"
  hour: string;
  done: boolean;
}

/** One of the last 7 days: its planned hours and how many of them were done */
export interface StudyDay {
  date: Date;
  planned: number;
  done: number;
  /** hours ticked that day outside the plan */
  extra: number;
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

  const hoursOn = (date: Date): string[] => {
    const raw = schedule[DAY_IDS_BY_INDEX[date.getDay()]];
    if (!raw || typeof raw !== 'string') return [];
    return raw.split(',').map(s => s.trim()).filter(h => /^\d{2}:00$/.test(h)).sort();
  };

  const today = new Date();
  const sessions: UpcomingSession[] = [];
  for (let offset = 0; offset < 28 && sessions.length < count; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const hours = hoursOn(date);
    if (!hours.length) continue;
    const dayLabel = offset === 0 ? 'დღეს' : offset === 1 ? 'ხვალ'
      : offset < 7 ? DAY_IDS_BY_INDEX[date.getDay()] : `${date.getDate()} ${MONTHS_SHORT_GE[date.getMonth()]}`;
    for (const hour of hours) {
      if (sessions.length >= count) break;
      const key = `${toDateKey(date)}_${hour}`;
      sessions.push({ key, dayLabel, hour, done: !!completed[key] });
    }
  }

  // the last 7 days, oldest first: the streak strip
  const week: StudyDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i);
    const dateKey = toDateKey(date);
    const hours = hoursOn(date);
    const ticked = Object.keys(completed).filter(k => completed[k] && k.startsWith(`${dateKey}_`)).map(k => k.slice(dateKey.length + 1));
    const done = hours.filter(h => ticked.includes(h)).length;
    return { date, planned: hours.length, done, extra: ticked.length - done };
  });

  const toggle = (key: string) => {
    if (!uid) return;
    triggerHaptic(10);
    const next = { ...completed };
    if (next[key]) delete next[key]; else next[key] = true;
    setCompleted(next);
    saveCompletedSessions(uid, next).catch(err => console.warn('session sync note:', err));
  };

  return { sessions, week, toggle };
};
