import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { useMembership } from '../utils/memberAccess';
import { type HangiDay } from '../utils/hangi';

// The record of a daily game („დღის ჰანგი“, „დღის სიტყვა“, „ოთხეული“): one entry per day played, keyed by the Tbilisi
// day. A member keeps it in students/{uid}.games.<game>.days (the member writes it; teachers and admins may read the
// document already); a guest or a newcomer not let in yet keeps it on the device — as the abituri progress does. The
// device copy is kept for a member too, so the day's game goes on offline and reaches Firestore when the network is
// back (setDoc queues it).

export type DailyGame = 'hangi' | 'sitqva' | 'otkheuli';
type Days = Record<string, HangiDay>;

const MAX_GUESSES = 20;

const cleanDay = (iso: string, d: unknown): HangiDay | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  if (typeof o.id !== 'string' || !Array.isArray(o.guesses)) return null;
  const guesses = o.guesses.filter((g): g is string => typeof g === 'string').slice(0, MAX_GUESSES);
  return { id: o.id, guesses, won: Boolean(o.won), done: Boolean(o.done) };
};
const clean = (v: unknown): Days => {
  const out: Days = {};
  if (v && typeof v === 'object') {
    for (const [iso, d] of Object.entries(v as Record<string, unknown>)) {
      const day = cleanDay(iso, d);
      if (day) out[iso] = day;
    }
  }
  return out;
};
const readLocal = (key: string): Days => {
  try { return clean(JSON.parse(localStorage.getItem(key) || 'null')); } catch { return {}; }
};
const writeLocal = (key: string, days: Days) => {
  try { localStorage.setItem(key, JSON.stringify(days)); } catch { /* private mode: kept for this visit only */ }
};

export const useDailyRecord = (game: DailyGame) => {
  const { user } = useAuth();
  const { isMember } = useMembership();
  const uid = user && isMember ? user.uid : null;
  const key = `sg-${game}`;
  const [days, setDays] = useState<Days>(() => readLocal(key));
  const [loaded, setLoaded] = useState(!uid);
  const merged = useRef(false);

  useEffect(() => {
    if (!uid) { setDays(readLocal(key)); setLoaded(true); return; }
    setLoaded(false);
    merged.current = false;
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const remote = clean(s.data()?.games?.[game]?.days);
        const local = readLocal(key);
        // days played on this device before signing in (or offline) reach the member's record once
        const missing = Object.fromEntries(Object.entries(local).filter(([iso]) => !remote[iso]));
        const all = { ...local, ...remote };
        setDays(all);
        writeLocal(key, all);
        setLoaded(true);
        if (!merged.current && Object.keys(missing).length) {
          merged.current = true;
          setDoc(doc(db, 'students', uid), { games: { [game]: { days: missing } } }, { merge: true }).catch(err => console.warn(`${game}: `, err?.code || err));
        }
      },
      err => { console.warn(`${game}: `, err?.code || err); setLoaded(true); },
    );
  }, [uid, game, key]);

  const save = useCallback((iso: string, day: HangiDay) => {
    setDays(prev => {
      const next = { ...prev, [iso]: day };
      writeLocal(key, next);
      return next;
    });
    if (uid) setDoc(doc(db, 'students', uid), { games: { [game]: { days: { [iso]: day } } } }, { merge: true }).catch(err => console.warn(`${game}: `, err?.code || err));
  }, [uid, game, key]);

  return { days, loaded, save, member: Boolean(uid) };
};
