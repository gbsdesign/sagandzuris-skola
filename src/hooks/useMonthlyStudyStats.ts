import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Same rules as the monthly gauge in StudentBookmarkView, for the current month only —
// lets the header show the numbers without opening "დამოუკიდებელი სამუშაო".

const DAY_IDS_BY_INDEX = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

const AVAILABLE_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00'
];

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export interface MonthlyStudyStats {
  planned: number;
  worked: number;
  missed: number;
  remaining: number;
  percent: number;
  /** null when no schedule is set */
  next: { date: Date; hour: string; offset: number } | null;
}

/** The month's numbers from a student's schedule and ticked hours (also used for teachers' overviews). */
export const computeMonthlyStats = (
  schedule: { [day: string]: string },
  completed: { [key: string]: boolean },
  today: Date = new Date()
): MonthlyStudyStats => {
  const hoursFor = (date: Date): string[] => {
    const raw = schedule[DAY_IDS_BY_INDEX[date.getDay()]];
    if (!raw || typeof raw !== 'string') return [];
    return raw.split(',').map(s => s.trim()).filter(s => AVAILABLE_HOURS.includes(s));
  };

  const todayKey = toDateKey(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let planned = 0;
  let worked = 0;
  let missed = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateKey = toDateKey(date);
    const scheduled = hoursFor(date);
    const done = scheduled.filter(h => completed[`${dateKey}_${h}`]).length;
    planned += scheduled.length;
    worked += done;
    if (dateKey < todayKey) missed += scheduled.length - done;
  }

  if (planned === 0) return { planned: 0, worked: 0, missed: 0, remaining: 0, percent: 0, next: null };

  let next: MonthlyStudyStats['next'] = null;
  for (let offset = 0; offset < 14 && !next; offset++) {
    const date = new Date(year, month, today.getDate() + offset);
    const dateKey = toDateKey(date);
    const hour = hoursFor(date).find(h =>
      !completed[`${dateKey}_${h}`] && (offset > 0 || parseInt(h, 10) >= today.getHours())
    );
    if (hour) next = { date, hour, offset };
  }

  return {
    planned,
    worked,
    missed,
    remaining: Math.max(0, planned - worked - missed),
    percent: Math.min(100, Math.round((worked / planned) * 100)),
    next,
  };
};

export const useMonthlyStudyStats = (uid: string | undefined): MonthlyStudyStats | null => {
  const [schedule, setSchedule] = useState<{ [day: string]: string } | null>(null);
  const [completed, setCompleted] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!uid) {
      setSchedule(null);
      setCompleted({});
      return;
    }
    return onSnapshot(
      doc(db, 'students', uid),
      snapshot => {
        const data = snapshot.exists() ? snapshot.data() : {};
        setSchedule(data.profile?.workSchedule || {});
        setCompleted(data.completedSessions || {});
      },
      () => setSchedule(null)
    );
  }, [uid]);

  if (!schedule) return null;
  return computeMonthlyStats(schedule, completed);
};
