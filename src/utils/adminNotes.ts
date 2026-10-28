import { useEffect, useState } from 'react';
import { deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// An admin's private note on a person (admin review, idea 10, 2026-10-28): „დაურეკე ოთხშაბათს“, „დედამ დაწერა“. One note
// per person, adminNotes/{uid} = { text (≤2000), by: the writer's e-mail, at }; only admins read or write it
// (firestore.rules), the person never sees it. An emptied note is deleted.

export const NOTE_MAX = 2000;
export interface AdminNote { text: string; by: string; at: string }

export const useAdminNote = (uid: string) => {
  const [note, setNote] = useState<AdminNote | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    return onSnapshot(doc(db, 'adminNotes', uid),
      s => {
        const d = s.data();
        setNote(d ? { text: String(d.text || ''), by: String(d.by || ''), at: String(d.at || '') } : null);
        setLoaded(true);
      },
      () => { setNote(null); setLoaded(true); });
  }, [uid]);
  return { note, loaded };
};

export const saveAdminNote = (uid: string, text: string, by: string) => {
  const t = text.trim().slice(0, NOTE_MAX);
  const ref = doc(db, 'adminNotes', uid);
  return t ? setDoc(ref, { text: t, by, at: new Date().toISOString() }) : deleteDoc(ref);
};
