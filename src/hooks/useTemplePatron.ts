import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { isPatron, type Patron } from '../utils/dayService';

// The reader's temple for „დღის მსახურება“ (2026-11-09, the user: „ვისი სახლეობის ტაძარია თავად ჩავწერ“; picked from a
// list). Kept in students/{uid}.templePatron (every device of mine), on the device for guests (`sg-temple`).

const KEY = 'sg-temple';
const fromDevice = (): Patron | null => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return isPatron(v) ? v : null; } catch { return null; }
};
const subs = new Set<(p: Patron | null) => void>();

export const useTemplePatron = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [kept, setKept] = useState<Patron | null | undefined>(undefined);
  const [here, setHere] = useState<Patron | null>(fromDevice);
  useEffect(() => {
    if (!uid) { setKept(undefined); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.templePatron;
      setKept(isPatron(v) ? v : null);
    }, () => setKept(null));
  }, [uid]);
  useEffect(() => {
    const on = (p: Patron | null) => (uid ? setKept(p) : setHere(p));
    subs.add(on);
    return () => { subs.delete(on); };
  }, [uid]);
  const save = (p: Patron | null) => {
    const clean = p ? { name: p.name, kind: p.kind, ...(p.md ? { md: p.md } : { easter: p.easter ?? 0 }), ...(p.id ? { id: p.id } : {}) } : null;
    subs.forEach(f => f(clean));
    if (uid) setDoc(doc(db, 'students', uid), { templePatron: clean }, { mergeFields: ['templePatron'] }).catch(() => {});
    else try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* private window */ }
  };
  return { patron: uid ? kept ?? null : here, loaded: !uid || kept !== undefined, save };
};
