import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';

// „მომლოცველის წიგნაკი“ (pages/ChurchesPage.tsx): the churches I have been to, each with the day I marked it.
// students/{uid}.churchVisits { <church id>: 'YYYY-MM-DD' } on every device of mine; `sg-church-visits` on the device for
// guests. A member writes their own record — no rules change.

export type Visits = Record<string, string>;
const KEY = 'sg-church-visits';
const deviceVisits = (): Visits => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? clean(v) : {};
  } catch { return {}; }
};
const clean = (v: Record<string, unknown>): Visits =>
  Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e[1])));

// this device's changes reach every user of the hook at once (the window's button, the lists' ✓, the book)
const subs = new Set<(v: Visits) => void>();

export const useChurchVisits = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [kept, setKept] = useState<Visits | null>(null);
  const [here, setHere] = useState<Visits>(deviceVisits);
  useEffect(() => {
    if (!uid) { setKept(null); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.churchVisits;
      setKept(v && typeof v === 'object' ? clean(v) : {});
    }, () => setKept({}));
  }, [uid]);
  useEffect(() => {
    const on = (v: Visits) => (uid ? setKept(v) : setHere(v));
    subs.add(on);
    return () => { subs.delete(on); };
  }, [uid]);
  const visits = uid ? kept ?? {} : here;
  const current = useRef(visits);
  current.current = visits;
  const save = (next: Visits) => {
    current.current = next;
    subs.forEach(f => f(next));
    if (uid) setDoc(doc(db, 'students', uid), { churchVisits: next }, { mergeFields: ['churchVisits'] }).catch(() => {});
    else try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private window */ }
  };
  return {
    visits,
    has: (id: string) => id in visits,
    mark: (id: string, day: string) => save({ ...current.current, [id]: day }),
    unmark: (id: string) => {
      const { [id]: _gone, ...rest } = current.current;
      save(rest);
    },
  };
};
