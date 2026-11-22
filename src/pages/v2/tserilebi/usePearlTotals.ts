import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { pearlCounts } from '../../../utils/pathPearls';

// How many pearls each student of the letters' list has gathered (2026-11-22, the user: „ვის რამდენი მარგალიტი აქვს შეგროვებილი …
// თუნდაც 1 ხმა იცოდეს მაინც … მარტო საერთო ციფრი“): every item of the path with at least one voice marked (a poem or an
// instrument learned) counts — `pearlCounts(…).polished`. Live since the same evening (the user: „განახლებას აგვიანებს … სანამ არ
// დარეფრეშდება გვერდი ციფრი არ იცვლება“): one listener a student while the list is open, shared by every row that shows them.

type Kept = { n: number };
const kept = new Map<string, Kept>();
const live = new Map<string, { users: number; stop: () => void }>();
const redraws = new Set<() => void>();

const listen = (uid: string) => {
  const now = live.get(uid);
  if (now) { now.users++; return; }
  const stop = onSnapshot(
    doc(db, 'students', uid),
    s => {
      const path = (s.data()?.selectedChantVariants || {}) as Parameters<typeof pearlCounts>[0];
      kept.set(uid, { n: pearlCounts(path, null).polished });
      redraws.forEach(r => r());
    },
    // not readable (not this teacher's student): no number rather than a wrong 0
    () => { kept.set(uid, { n: -1 }); redraws.forEach(r => r()); },
  );
  live.set(uid, { users: 1, stop });
};

const leave = (uid: string) => {
  const now = live.get(uid);
  if (!now) return;
  if (--now.users > 0) return;
  now.stop();
  live.delete(uid);
};

/** uid → pearls (only the students already read). */
export const usePearlTotals = (uids: string[]) => {
  const [, redraw] = useState(0);
  const key = [...new Set(uids.filter(Boolean))].sort().join(',');
  useEffect(() => {
    const again = () => redraw(x => x + 1);
    redraws.add(again);
    const list = key ? key.split(',') : [];
    list.forEach(listen);
    return () => { redraws.delete(again); list.forEach(leave); };
  }, [key]);
  const out: Record<string, number> = {};
  for (const uid of uids) {
    const k = kept.get(uid);
    if (k && k.n >= 0) out[uid] = k.n;
  }
  return out;
};
