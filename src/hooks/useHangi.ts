import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { useMembership } from '../utils/memberAccess';
import { MAX_TRIES, type HangiDay } from '../utils/hangi';

// The daily game's record („დღის ჰანგი“): one entry per day played. A member keeps it in students/{uid}.games.hangi.days
// (the member writes it; teachers and admins may read the document already); a guest or a newcomer not let in yet keeps
// it on the device — as the abituri progress does. The device copy is kept for a member too, so the day's game goes on
// offline and reaches Firestore when the network is back (setDoc queues it).

const KEY = 'sg-hangi';
type Days = Record<string, HangiDay>;

const cleanDay = (iso: string, d: unknown): HangiDay | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  if (typeof o.id !== 'string' || !Array.isArray(o.guesses)) return null;
  const guesses = o.guesses.filter((g): g is string => typeof g === 'string').slice(0, MAX_TRIES);
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
const readLocal = (): Days => {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return {}; }
};
const writeLocal = (days: Days) => {
  try { localStorage.setItem(KEY, JSON.stringify(days)); } catch { /* private mode: kept for this visit only */ }
};

export const useHangi = () => {
  const { user } = useAuth();
  const { isMember } = useMembership();
  const uid = user && isMember ? user.uid : null;
  const [days, setDays] = useState<Days>(readLocal);
  const [loaded, setLoaded] = useState(!uid);
  const merged = useRef(false);

  useEffect(() => {
    if (!uid) { setDays(readLocal()); setLoaded(true); return; }
    setLoaded(false);
    merged.current = false;
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const remote = clean(s.data()?.games?.hangi?.days);
        const local = readLocal();
        // days played on this device before signing in (or offline) reach the member's record once
        const missing = Object.fromEntries(Object.entries(local).filter(([iso]) => !remote[iso]));
        const all = { ...local, ...remote };
        setDays(all);
        writeLocal(all);
        setLoaded(true);
        if (!merged.current && Object.keys(missing).length) {
          merged.current = true;
          setDoc(doc(db, 'students', uid), { games: { hangi: { days: missing } } }, { merge: true }).catch(err => console.warn('hangi: ', err?.code || err));
        }
      },
      err => { console.warn('hangi: ', err?.code || err); setLoaded(true); },
    );
  }, [uid]);

  const save = useCallback((iso: string, day: HangiDay) => {
    setDays(prev => {
      const next = { ...prev, [iso]: day };
      writeLocal(next);
      return next;
    });
    if (uid) setDoc(doc(db, 'students', uid), { games: { hangi: { days: { [iso]: day } } } }, { merge: true }).catch(err => console.warn('hangi: ', err?.code || err));
  }, [uid]);

  return { days, loaded, save, member: Boolean(uid) };
};
