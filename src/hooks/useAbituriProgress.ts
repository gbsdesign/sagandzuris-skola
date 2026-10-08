import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { useMembership } from '../utils/memberAccess';

// The abituri theory progress: lessons marked „გავიარე“, practice counts and the mock tests' scores.
// A member keeps it in students/{uid}.abituri (their teachers may read it, the rules allow it already); a guest or a
// newcomer not let in yet keeps it on the device — so a waiting newcomer never gets a students document this way.

export interface TestResult { at: number; score: number; max: number; parts: number[] }
export interface AbituriProgress {
  lessons: string[];
  /** per practice kind: [right, all] */
  drills: Record<string, [number, number]>;
  /** the latest mock tests, newest last */
  tests: TestResult[];
}

const EMPTY: AbituriProgress = { lessons: [], drills: {}, tests: [] };
const KEY = 'abituriProgress';
const KEEP_TESTS = 20;

const clean = (a: unknown): AbituriProgress => {
  const o = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
  const drills: AbituriProgress['drills'] = {};
  if (o.drills && typeof o.drills === 'object') {
    for (const [k, v] of Object.entries(o.drills as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'number')) drills[k] = [v[0], v[1]];
    }
  }
  return {
    lessons: Array.isArray(o.lessons) ? o.lessons.filter((x): x is string => typeof x === 'string') : [],
    drills,
    tests: Array.isArray(o.tests)
      ? o.tests.filter((t): t is TestResult => Boolean(t) && typeof (t as TestResult).score === 'number' && typeof (t as TestResult).max === 'number')
      : [],
  };
};
const readLocal = () => {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return EMPTY; }
};
const writeLocal = (p: AbituriProgress) => {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: kept for this visit only */ }
};
const isEmpty = (p: AbituriProgress) => !p.lessons.length && !Object.keys(p.drills).length && !p.tests.length;

export const useAbituriProgress = () => {
  const { user } = useAuth();
  const { isMember } = useMembership();
  const uid = user && isMember ? user.uid : null;
  const [progress, setProgress] = useState<AbituriProgress>(readLocal);
  const current = useRef(progress);
  current.current = progress;

  useEffect(() => {
    if (!uid) { setProgress(readLocal()); return; }
    const ref = doc(db, 'students', uid);
    return onSnapshot(ref, snap => {
      const saved = clean(snap.data()?.abituri);
      // what was done on this device before signing in goes to the account once
      const local = readLocal();
      if (isEmpty(saved) && !isEmpty(local)) {
        setProgress(local);
        setDoc(ref, { abituri: local }, { mergeFields: ['abituri'] }).catch(e => console.warn('abituri progress:', e));
        return;
      }
      setProgress(saved);
    }, e => console.warn('abituri progress:', e));
  }, [uid]);

  const update = useCallback((change: (p: AbituriProgress) => AbituriProgress) => {
    const next = change(current.current);
    current.current = next;
    setProgress(next);
    if (uid) setDoc(doc(db, 'students', uid), { abituri: next }, { mergeFields: ['abituri'] }).catch(e => console.warn('abituri progress:', e));
    else writeLocal(next);
  }, [uid]);

  const toggleLesson = useCallback((id: string) => update(p => ({
    ...p, lessons: p.lessons.includes(id) ? p.lessons.filter(x => x !== id) : [...p.lessons, id],
  })), [update]);

  const countDrill = useCallback((kind: string, right: boolean) => update(p => {
    const [r, all] = p.drills[kind] ?? [0, 0];
    return { ...p, drills: { ...p.drills, [kind]: [r + (right ? 1 : 0), all + 1] } };
  }), [update]);

  const addTest = useCallback((t: TestResult) => update(p => ({ ...p, tests: [...p.tests, t].slice(-KEEP_TESTS) })), [update]);

  return { progress, toggleLesson, countDrill, addTest, onAccount: Boolean(uid) };
};

export type AbituriProgressApi = ReturnType<typeof useAbituriProgress>;
