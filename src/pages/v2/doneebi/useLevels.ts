import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import { useViewing } from '../../../context/AuthContext';
import { useMasteryPath } from '../../../components/mastery/useMasteryPath';
import { findDrill } from '../../../data/vocalDrills';
import { certLevels, shortTitle, unseenCert } from '../../../utils/levelsView';
import { kaName } from '../../../utils/georgianName';

// The levels page's data: the path's record (useMasteryPath) + the days exercises were done (students.drillDone, and this
// device's own days) and the tips a teacher marked (students.maneraReview) — for the certificate's date and its line.

const DONE_KEY = 'sg-manera-done';

const localDays = (): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) || '{}') as Record<string, unknown>;
    for (const [id, days] of Object.entries(raw)) if (Array.isArray(days) && days.length) out[id] = String([...days].sort().pop());
  } catch { /* storage off */ }
  return out;
};

export const useLevels = () => {
  const path = useMasteryPath();
  const { user } = useAuth();
  const viewing = useViewing();
  const uid = user?.uid;
  const [doc_, setDoc] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!uid) { setDoc(null); return; }
    return onSnapshot(doc(db, 'students', uid), s => setDoc(s.data() ?? {}), () => {});
  }, [uid]);
  const { days, marked } = useMemo(() => {
    const days: Record<string, string> = viewing ? {} : localDays();
    const dd = doc_?.drillDone;
    if (dd && typeof dd === 'object') for (const [k, v] of Object.entries(dd)) if (typeof v === 'string' && (!days[k] || v > days[k])) days[k] = v;
    const mr = doc_?.maneraReview;
    const marked = new Set(mr && typeof mr === 'object' ? Object.keys(mr).map(k => `tip-${k}`) : []);
    return { days, marked };
  }, [doc_, viewing]);
  const closed = useMemo(() => certLevels(path.record), [path.record]);
  return { ...path, days, marked, closed, uid, viewing: !!viewing, loaded: doc_ !== null, name: kaName(user?.displayName) || '' };
};

export const drillName = (id: string) => shortTitle(findDrill(id)?.title ?? id);

const seenKey = (uid: string) => `sg-cert-seen:${uid}`;

/** the one certificate to show now (a level closed for the first time on this device), and marks it seen */
export const useFreshCert = (uid: string | undefined, closed: number[], ready: boolean, off: boolean): number | null => {
  const [show, setShow] = useState<number | null>(null);
  const key = closed.join(',');
  useEffect(() => {
    if (!uid || !ready || off) return;
    try {
      const raw = localStorage.getItem(seenKey(uid));
      const seen = raw === null ? null : (JSON.parse(raw) as number[]);
      const r = unseenCert(closed, seen);
      localStorage.setItem(seenKey(uid), JSON.stringify(r.keep));
      setShow(r.show);
    } catch { /* storage off: nothing shown */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ready, off, key]);
  return show;
};
