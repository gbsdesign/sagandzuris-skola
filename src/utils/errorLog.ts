import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, increment, limit, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { isAndroidApp } from './androidApp';
import { isIosApp } from './iosApp';
import { allow, buildEntry, deviceKind, setReporter, type ErrorEntry, type ErrorKind, type LimitState } from './errorLogCore';

// The app's error log (2026-11-18): when the app breaks on someone's phone, its admins see what broke, on which page and
// how many times — ⚙ „სკოლა“ → „შეცდომების ჟურნალი“ (components/admin/ErrorLogFold.tsx). No name, uid or typed words:
// errorLogCore.ts scrubs every line. errorLog/{fingerprint}; firestore.rules: the signed-in add or count up, admins
// read and clear. A member cannot read, so nothing is read before writing: count up, else create.

export type { ErrorEntry, ErrorKind } from './errorLogCore';

const OFF = import.meta.env.DEV || import.meta.env.VITE_EMULATORS === '1';
const DAY_KEY = 'sg-errlog-day';

const today = () => new Date().toISOString().slice(0, 10);
const readDay = (): { d: string; n: number } => {
  try {
    const v = JSON.parse(localStorage.getItem(DAY_KEY) || 'null');
    if (v && typeof v.d === 'string' && typeof v.n === 'number') return v;
  } catch { /* storage may be closed */ }
  return { d: today(), n: 0 };
};
let limits: LimitState = (() => { const v = readDay(); return { seen: [], day: v.d, n: v.n }; })();

// only the page's id — the rest of the navigation state holds people's ids
const pageNow = () => {
  const page = (window.history.state as { sgNav?: { page?: unknown } } | null)?.sgNav?.page;
  return typeof page === 'string' ? page : '';
};

const device = () => deviceKind(navigator.userAgent, isAndroidApp() ? 'android' : isIosApp() ? 'ios' : null);

const send = async (e: ErrorEntry) => {
  const ref = doc(db, 'errorLog', e.id);
  try {
    await updateDoc(ref, { count: increment(1), last: e.last, ver: e.ver, dev: e.dev, where: e.where });
  } catch {
    const { id: _id, ...fresh } = e;
    await setDoc(ref, fresh).catch(() => undefined);
  }
};

// errors that come before the sign-in is known wait here (a few), then go — or are dropped for a guest
let waiting: ErrorEntry[] = [];
let signedIn: boolean | null = null;

const take = (kind: ErrorKind, error: unknown, extraStack?: string) => {
  if (OFF || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const entry = buildEntry({ kind, error, extraStack, where: pageNow(), ver: __SG_BUILD__, dev: device(), now: new Date().toISOString() });
  if (!entry) return;
  if (signedIn === false) return;
  const { ok, state } = allow(limits, entry.id, today());
  limits = state;
  if (!ok) return;
  try { localStorage.setItem(DAY_KEY, JSON.stringify({ d: state.day, n: state.n })); } catch { /* no storage */ }
  if (signedIn === null) { if (waiting.length < 5) waiting.push(entry); return; }
  void send(entry);
};

/** An error the app caught itself (a failed save, a screen that could not draw). Best effort, never throws. */
export const reportError = (error: unknown, kind: ErrorKind = 'report', extraStack?: string) => {
  try { take(kind, error, extraStack); } catch { /* the log must never break the app */ }
};

let started = false;
/** Listens for the errors nobody caught. Called once, first thing, from main.tsx. */
export const startErrorLog = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  setReporter(e => reportError(e));
  window.addEventListener('error', ev => reportError(ev.error ?? ev.message, 'error'));
  window.addEventListener('unhandledrejection', ev => reportError(ev.reason, 'promise'));
  onAuthStateChanged(auth, u => {
    signedIn = !!u;
    const queued = waiting;
    waiting = [];
    if (u) queued.forEach(e => void send(e));
  });
};

/** The newest lines first (admins only). */
export const useErrorLog = (enabled: boolean, count = 100) => {
  const [lines, setLines] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  useEffect(() => {
    if (!enabled) { setLines([]); setLoading(false); return; }
    return onSnapshot(
      query(collection(db, 'errorLog'), orderBy('last', 'desc'), limit(count)),
      s => { setLines(s.docs.map(d => ({ ...(d.data() as Omit<ErrorEntry, 'id'>), id: d.id }))); setLoading(false); },
      () => { setLines([]); setLoading(false); }
    );
  }, [enabled, count]);
  return { lines, loading };
};

export const deleteError = (id: string) => deleteDoc(doc(db, 'errorLog', id));

export const clearErrorLog = async (ids: string[]) => {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'errorLog', id)));
    await batch.commit();
  }
};
