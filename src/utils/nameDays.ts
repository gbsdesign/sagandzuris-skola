import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { NameDayChoice } from './nameDayMatch';

// „ანგელოზის დღე“ (redesign stage 4): the day of the saint whose name a member bears. A name stands in the church
// calendar in many cases („გიორგი“, „გიორგისა“, „მარიამისა“, „ნინოსი“) and on many days (გიორგი: 31), so the member
// picks their own saint's day from the days that name the same name (utils/nameDayMatch.ts); it is kept beside the
// birthdays: nameDays/{uid} {uid, name, photoURL, month, day, saint, updatedAt} — read by every admitted member.

export interface NameDay { uid: string; name: string; photoURL?: string; month: number; day: number; saint: string }

/** everyone's name days; null while loading */
export const useNameDays = (enabled: boolean): NameDay[] | null => {
  const [list, setList] = useState<NameDay[] | null>(null);
  useEffect(() => {
    if (!enabled) { setList(null); return; }
    return onSnapshot(
      collection(db, 'nameDays'),
      s => setList(s.docs.map(d => {
        const x = d.data();
        return { uid: d.id, name: typeof x.name === 'string' ? x.name : '', photoURL: x.photoURL || '', month: Number(x.month), day: Number(x.day), saint: typeof x.saint === 'string' ? x.saint : '' };
      }).filter(b => b.name && b.month >= 1 && b.month <= 12 && b.day >= 1 && b.day <= 31)),
      err => { console.warn('name days:', err?.message || err); setList([]); },
    );
  }, [enabled]);
  return list;
};

export const saveNameDay = (uid: string, name: string, photoURL: string, c: NameDayChoice) =>
  setDoc(doc(db, 'nameDays', uid), { uid, name, photoURL, month: c.month, day: c.day, saint: c.saint, updatedAt: new Date().toISOString() });

export const clearNameDay = (uid: string) => deleteDoc(doc(db, 'nameDays', uid));
