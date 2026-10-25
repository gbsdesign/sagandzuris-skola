import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { fullName } from './memberName';
import { isPlaceholderBirth, validBirth } from './profileFields';
import { useMembership } from './memberAccess';

// Birthdays (redesign stage 4, 2026-10-25). The day and month of every member who wrote a birth date in their
// profile: birthdays/{uid} {uid, name, photoURL, month, day}, readable by every admitted member. The year is kept
// apart, birthYears/{uid} {year}, for teachers and admins only (firestore.rules) — a member never sees anyone's age.
// Each member's own two documents are written from their profile by useBirthdaySync (App), so nobody fills them in.

export interface Birthday { uid: string; name: string; photoURL?: string; month: number; day: number; year?: number }

/** Everyone's birthdays (with years for staff); null while loading. */
export const useBirthdays = (enabled: boolean, withYears: boolean): Birthday[] | null => {
  const [list, setList] = useState<Birthday[] | null>(null);
  const [years, setYears] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!enabled) { setList(null); return; }
    return onSnapshot(
      collection(db, 'birthdays'),
      s => setList(s.docs.map(d => {
        const x = d.data();
        return { uid: d.id, name: typeof x.name === 'string' ? x.name : '', photoURL: x.photoURL || '', month: Number(x.month), day: Number(x.day) };
      }).filter(b => b.name && b.month >= 1 && b.month <= 12 && b.day >= 1 && b.day <= 31)),
      err => { console.warn('birthdays:', err?.message || err); setList([]); },
    );
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !withYears) { setYears({}); return; }
    return onSnapshot(
      collection(db, 'birthYears'),
      s => setYears(Object.fromEntries(s.docs.flatMap(d => (typeof d.data().year === 'number' ? [[d.id, d.data().year as number]] : [])))),
      err => { console.warn('birth years:', err?.message || err); setYears({}); },
    );
  }, [enabled, withYears]);
  return list && list.map(b => ({ ...b, year: years[b.uid] }));
};

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// 29 February, in a year without it, falls on the 28th
const dateIn = (year: number, month: number, day: number) => new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));

/** The next birthday (today counts) and how many days are left to it. */
export const nextBirthday = (b: Pick<Birthday, 'month' | 'day'>, now = new Date()) => {
  const today = midnight(now);
  let at = dateIn(today.getFullYear(), b.month, b.day);
  if (at < today) at = dateIn(today.getFullYear() + 1, b.month, b.day);
  return { at, days: Math.round((at.getTime() - today.getTime()) / 86_400_000) };
};

/** The age the person turns on their next birthday (staff only: needs the year). */
export const turning = (b: Birthday, now = new Date()) => (b.year ? nextBirthday(b, now).at.getFullYear() - b.year : undefined);

/** How old the person is today (staff only). */
export const ageNow = (b: Birthday, now = new Date()) => {
  if (!b.year) return undefined;
  const had = nextBirthday(b, now).days === 0 || now.getMonth() + 1 > b.month || (now.getMonth() + 1 === b.month && now.getDate() >= b.day);
  return now.getFullYear() - b.year - (had ? 0 : 1);
};

export const inDaysText = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

/** Writes my own birthday documents from my profile when it has a real birth date (once per change, per device). */
export const useBirthdaySync = () => {
  const { user } = useAuth();
  const { isMember } = useMembership();
  useEffect(() => {
    if (!user || !isMember) return;
    return onSnapshot(doc(db, 'students', user.uid), snap => {
      const data = snap.data() || {};
      const p = data.profile || {};
      const b = p.birthDate;
      if (!validBirth(b) || (isPlaceholderBirth(b) && !data.firstMeeting)) return;
      const name = fullName({ firstName: p.firstName || '', lastName: p.lastName || '', churchName: '' }) || user.displayName || '';
      if (!name) return;
      const photoURL = user.photoURL || '';
      const stamp = `${b.year}-${b.month}-${b.day}|${name}|${photoURL}`;
      const key = `sg-birthday-${user.uid}`;
      try { if (localStorage.getItem(key) === stamp) return; } catch { /* write again */ }
      const at = new Date().toISOString();
      Promise.all([
        setDoc(doc(db, 'birthdays', user.uid), { uid: user.uid, name, photoURL, month: b.month, day: b.day, updatedAt: at }),
        setDoc(doc(db, 'birthYears', user.uid), { year: b.year, updatedAt: at }),
      ]).then(() => { try { localStorage.setItem(key, stamp); } catch { /* next time */ } }).catch(() => {});
    }, () => {});
  }, [user, isMember]);
};
