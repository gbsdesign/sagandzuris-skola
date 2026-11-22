import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { pearlCounts } from '../../../utils/pathPearls';

// How many pearls each student of the letters' list has gathered (2026-11-22, the user: „ვის რამდენი მარგალიტი აქვს შეგროვებილი …
// თუნდაც 1 ხმა იცოდეს მაინც … მარტო საერთო ციფრი“): every item of the path with at least one voice marked (a poem or an
// instrument learned) counts — `pearlCounts(…).polished`. Each student's record is read once, again only after a few minutes.

const FRESH = 3 * 60_000;
const kept = new Map<string, { n: number; at: number }>();
const asking = new Map<string, Promise<void>>();

const ask = (uid: string) => {
  let p = asking.get(uid);
  if (!p) {
    p = getDoc(doc(db, 'students', uid)).then(
      s => {
        const path = (s.data()?.selectedChantVariants || {}) as Parameters<typeof pearlCounts>[0];
        kept.set(uid, { n: pearlCounts(path, null).polished, at: Date.now() });
      },
      () => { kept.set(uid, { n: 0, at: Date.now() }); },
    ).finally(() => { asking.delete(uid); });
    asking.set(uid, p);
  }
  return p;
};

/** uid → pearls (only the students already read). */
export const usePearlTotals = (uids: string[]) => {
  const [, redraw] = useState(0);
  const key = [...new Set(uids.filter(Boolean))].sort().join(',');
  useEffect(() => {
    let live = true;
    for (const uid of key ? key.split(',') : []) {
      const k = kept.get(uid);
      if (k && Date.now() - k.at < FRESH) continue;
      void ask(uid).then(() => { if (live) redraw(x => x + 1); });
    }
    return () => { live = false; };
  }, [key]);
  const out: Record<string, number> = {};
  for (const uid of uids) {
    const k = kept.get(uid);
    if (k) out[uid] = k.n;
  }
  return out;
};
