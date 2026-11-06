import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useRealAuth } from '../context';

// What admins add to a church of „ეკლესია-მონასტრები“ (pages/ChurchesPage.tsx), keyed by the church's id:
// • churchInfo/{id} { hours, note, by, at } — when it is open, services; everyone reads it.
// • churchContacts/{id} { person, phone, other, by, at } — read only by admins and the people an admin turned it on for:
//   settings/churchContactViewers { uids } (admins write; the switch is in the person's window, ⚙ PersonSheet).

export interface ChurchInfo { hours: string; note: string }
export interface ChurchContact { person: string; phone: string; other: string }

let viewers: string[] = [];
const listeners = new Set<(u: string[]) => void>();
let started = false;
const viewersRef = () => doc(db, 'settings', 'churchContactViewers');

const start = () => {
  if (started) return;
  started = true;
  onSnapshot(viewersRef(), snap => {
    const d = snap.data() || {};
    viewers = Array.isArray(d.uids) ? d.uids : [];
    listeners.forEach(l => l(viewers));
  }, () => { /* offline or not set yet: admins only */ });
};

/** the people (besides admins) who see the churches' contacts */
export const useChurchContactViewers = () => {
  const [u, setU] = useState(viewers);
  useEffect(() => {
    start();
    listeners.add(setU);
    setU(viewers);
    return () => { listeners.delete(setU); };
  }, []);
  return u;
};

export const setChurchContactViewer = (uid: string, on: boolean) =>
  setDoc(viewersRef(), { uids: on ? arrayUnion(uid) : arrayRemove(uid) }, { merge: true });

/** may the signed-in person see the contacts? (admins always) */
export const useCanSeeChurchContacts = () => {
  const { user, isAdmin } = useRealAuth();
  const uids = useChurchContactViewers();
  return isAdmin || (!!user && uids.includes(user.uid));
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** undefined while loading, null when nothing was added */
const useDoc = <T,>(path: 'churchInfo' | 'churchContacts', id: string | undefined, allowed: boolean, read: (d: Record<string, unknown>) => T) => {
  const [value, setValue] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    setValue(undefined);
    if (!id || !allowed) { setValue(null); return; }
    return onSnapshot(doc(db, path, id), snap => setValue(snap.exists() ? read(snap.data()) : null), () => setValue(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, id, allowed]);
  return value;
};

export const useChurchInfo = (id?: string) =>
  useDoc<ChurchInfo>('churchInfo', id, true, d => ({ hours: text(d.hours, 300), note: text(d.note, 600) }));

export const useChurchContact = (id: string | undefined, allowed: boolean) =>
  useDoc<ChurchContact>('churchContacts', id, allowed, d => ({ person: text(d.person, 100), phone: text(d.phone, 60), other: text(d.other, 600) }));

/** empty fields = the document goes away */
export const saveChurchInfo = (id: string, info: ChurchInfo, uid: string) => {
  const hours = info.hours.trim().slice(0, 300);
  const note = info.note.trim().slice(0, 600);
  const ref = doc(db, 'churchInfo', id);
  return hours || note ? setDoc(ref, { hours, note, by: uid, at: serverTimestamp() }) : deleteDoc(ref);
};

export const saveChurchContact = (id: string, c: ChurchContact, uid: string) => {
  const person = c.person.trim().slice(0, 100);
  const phone = c.phone.trim().slice(0, 60);
  const other = c.other.trim().slice(0, 600);
  const ref = doc(db, 'churchContacts', id);
  return person || phone || other ? setDoc(ref, { person, phone, other, by: uid, at: serverTimestamp() }) : deleteDoc(ref);
};
