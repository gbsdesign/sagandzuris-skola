import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { useMembership } from '../utils/memberAccess';

// The „მედავითნეობა“ lessons marked „ვისწავლე“. Like the abituri progress (useAbituriProgress): a member keeps it
// in students/{uid}.medavitne, a guest or a newcomer not let in yet on the device; what was done on the device
// before signing in goes to the account once.

const KEY = 'medavitneProgress';

const clean = (a: unknown): string[] => {
  const done = (a && typeof a === 'object' ? (a as { done?: unknown }).done : null);
  return Array.isArray(done) ? done.filter((x): x is string => typeof x === 'string') : [];
};
const readLocal = () => {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return []; }
};
const writeLocal = (done: string[]) => {
  try { localStorage.setItem(KEY, JSON.stringify({ done })); } catch { /* private mode: kept for this visit only */ }
};

export const useMedavitneProgress = () => {
  const { user } = useAuth();
  const { isMember } = useMembership();
  const uid = user && isMember ? user.uid : null;
  const [done, setDone] = useState<string[]>(readLocal);
  const current = useRef(done);
  current.current = done;

  useEffect(() => {
    if (!uid) { setDone(readLocal()); return; }
    const ref = doc(db, 'students', uid);
    return onSnapshot(ref, snap => {
      const saved = clean(snap.data()?.medavitne);
      const local = readLocal();
      if (!saved.length && local.length) {
        setDone(local);
        setDoc(ref, { medavitne: { done: local } }, { mergeFields: ['medavitne'] }).catch(e => console.warn('medavitne progress:', e));
        return;
      }
      setDone(saved);
    }, e => console.warn('medavitne progress:', e));
  }, [uid]);

  const save = useCallback((next: string[]) => {
    current.current = next;
    setDone(next);
    if (uid) setDoc(doc(db, 'students', uid), { medavitne: { done: next } }, { mergeFields: ['medavitne'] }).catch(e => console.warn('medavitne progress:', e));
    else writeLocal(next);
  }, [uid]);

  const setLearned = useCallback((id: string, on: boolean) => {
    const has = current.current.includes(id);
    if (on !== has) save(on ? [...current.current, id] : current.current.filter(x => x !== id));
  }, [save]);

  return { done, setLearned, onAccount: Boolean(uid) };
};
