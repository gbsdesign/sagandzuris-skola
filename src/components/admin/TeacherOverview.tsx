import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { TriangleAlert } from 'lucide-react';
import { db } from '../../firebase';
import { SchoolClass } from '../../hooks/useClasses';
import { shortDate } from '../../utils/dateNames';

// The teachers' overview (admin review, idea 7, 2026-10-28): under the filters „მასწავლებლები“ and „ადმინები“ a row of
// one who teaches says, instead of their own classes, what they lead — how many classes, how many members and the day
// of the last lesson (the last attendance marked). A teacher without a class, or whose last lesson is more than two
// weeks old (or none yet), turns amber: who may need a hand.

const STALE_DAYS = 14;

/** The day of each class's last lesson ('' before the first), only while `on`: one small listener per class. */
export const useLastLessons = (classIds: string[], on: boolean) => {
  const [last, setLast] = useState<Record<string, string>>({});
  const key = on ? classIds.join(',') : '';
  useEffect(() => {
    if (!key) return;
    const offs = key.split(',').map(id => onSnapshot(
      query(collection(db, 'classes', id, 'attendance'), orderBy('date', 'desc'), limit(1)),
      s => setLast(m => ({ ...m, [id]: (s.docs[0]?.data().date as string) || '' })),
      () => setLast(m => ({ ...m, [id]: '' }))
    ));
    return () => offs.forEach(off => off());
  }, [key]);
  return last;
};

const daysSince = (day: string, now = Date.now()) => Math.floor((now - new Date(`${day}T12:00:00`).getTime()) / 86_400_000);

/** The row's second line for one who teaches; `teacher` = their role is „მასწავლებელი“ (an admin needs no class). */
export const TeachLine: React.FC<{ uid: string; classes: SchoolClass[]; last: Record<string, string>; teacher: boolean }> = ({ uid, classes, last, teacher }) => {
  const mine = classes.filter(c => c.teacherIds.includes(uid));
  if (!mine.length) {
    return teacher ? (
      <span className="flex items-center gap-1 text-xs font-semibold text-[#9a6212] truncate">
        <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> კლასი არ აქვს
      </span>
    ) : null;
  }
  const members = new Set(mine.flatMap(c => c.memberIds)).size;
  const known = mine.every(c => c.id in last);
  const day = mine.map(c => last[c.id] || '').sort().pop() || '';
  const stale = known && (!day || daysSince(day) > STALE_DAYS);
  const lesson = !known ? '' : day ? `ბოლო გაკვეთილი ${shortDate(`${day}T12:00:00`)}` : 'გაკვეთილი ჯერ არ ჩაწერილა';
  return (
    // it may wrap to a second line on a phone (only the teachers' rows show it): the lesson's day must stay readable
    <span className={`block text-xs leading-snug ${stale ? 'font-semibold text-[#9a6212]' : 'text-[#8a7a6a]'}`}
      title={mine.map(c => c.name).join(', ')}>
      {mine.length} კლასი · {members} წევრი{lesson && ` · ${lesson}`}
    </span>
  );
};
