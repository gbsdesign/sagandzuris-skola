import { useEffect, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { SchoolClass } from './useClasses';
import type { AttendanceDay, StudentRecord } from './useTeaching';

// The path's „კლასი“ button (2026-11-09, the user: „აჩვენებდეს გაკვეთილზე დასწრების პროცენტულ მაჩვენებელს“). The attendance
// is the teachers' own record (members do not read it — firestore.rules), so the teacher's app leaves each member their
// own share of the class's last lessons in students/{uid}.classAttendance = { [classId]: { came, of } } — no rules change:
// a class's teacher may write a member's record. A teacher's button shows the classes' average instead.

/** How many of the latest lessons count (as the class roll's „დასწრება“). */
export const LAST_LESSONS = 8;

export interface AttendanceShare { came: number; of: number }

export const shareOf = (uid: string, days: AttendanceDay[]): AttendanceShare => ({
  came: days.filter(d => d.present.includes(uid)).length,
  of: days.length,
});

/** The class roll (a teacher's or an admin's view) keeps every member's share right: written only when it changed. */
export const useSyncAttendanceShares = (
  cls: SchoolClass,
  records: Record<string, StudentRecord>,
  days: AttendanceDay[],
  ready: boolean,
) => {
  // one try a member and value (a write the rules refuse is not repeated on every record's change)
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (!ready) return;
    for (const uid of cls.memberIds) {
      const data = records[uid]?.data;
      if (!data) continue;
      const want = shareOf(uid, days);
      const have = data.classAttendance?.[cls.id] as AttendanceShare | undefined;
      if (have ? have.came === want.came && have.of === want.of : want.of === 0) continue;
      const key = `${uid}:${cls.id}:${want.came}/${want.of}`;
      if (tried.current.has(key)) continue;
      tried.current.add(key);
      updateDoc(doc(db, 'students', uid), { [`classAttendance.${cls.id}`]: want }).catch(() => {});
    }
  }, [cls.id, cls.memberIds, records, days, ready]);
};

const share = (came: number, of: number): AttendanceShare | null => (of > 0 ? { came, of } : null);

/** A member's own attendance over their classes' latest lessons: came to N of M (null before any lesson is marked).
 *  Shown as „6 / 8“ since 2026-11-09 (the user: „სადაც პროცენტებია უბრალოდ ციფრები იყოს“). */
export const useMyAttendance = (uid: string | undefined, classIds: string[]): AttendanceShare | null => {
  const [shares, setShares] = useState<Record<string, AttendanceShare>>({});
  useEffect(() => {
    if (!uid) { setShares({}); return; }
    return onSnapshot(doc(db, 'students', uid), s => {
      const v = s.data()?.classAttendance;
      setShares(v && typeof v === 'object' ? v : {});
    }, () => setShares({}));
  }, [uid]);
  let came = 0, of = 0;
  for (const id of classIds) {
    const s = shares[id];
    if (s && typeof s.came === 'number' && typeof s.of === 'number') { came += s.came; of += s.of; }
  }
  return share(came, of);
};

/** A teacher's classes at their last lesson: how many of the members came (null before any lesson is marked). */
export const useTeachingAttendance = (classes: SchoolClass[]): AttendanceShare | null => {
  const [days, setDays] = useState<Record<string, AttendanceDay[]>>({});
  const ids = classes.map(c => c.id).join(',');
  useEffect(() => {
    if (!ids) { setDays({}); return; }
    const offs = ids.split(',').map(id => onSnapshot(
      query(collection(db, 'classes', id, 'attendance'), orderBy('date', 'desc'), limit(LAST_LESSONS)),
      s => setDays(d => ({ ...d, [id]: s.docs.map(x => ({ date: x.data().date || x.id, present: Array.isArray(x.data().present) ? x.data().present : [] })) })),
      () => setDays(d => ({ ...d, [id]: [] })),
    ));
    return () => offs.forEach(off => off());
  }, [ids]);
  let came = 0, of = 0;
  for (const c of classes) {
    const last = (days[c.id] || [])[0];
    if (!last || !c.memberIds.length) continue;
    came += last.present.filter(u => c.memberIds.includes(u)).length;
    of += c.memberIds.length;
  }
  return share(came, of);
};
