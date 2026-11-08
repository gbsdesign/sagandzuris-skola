import { useEffect, useRef, useState } from 'react';
import { Timestamp, collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/** One unread chat to count: its messages under `base` written after `since` (ms; 0 = never opened). `upTo` = its
 *  newest message's time — a new one asks again. */
export interface CountAsk { id: string; base: string; since: number; upTo: number }

// counted once per chat and newest message, for the whole visit (a count costs one read per thousand messages)
const known = new Map<string, number>();
const asking = new Set<string>();
const keyOf = (a: CountAsk) => `${a.base}|${a.since}|${a.upTo}`;

/** How many messages wait in each unread chat (id → number); a chat not counted yet (or offline) is missing. */
export const useUnreadCounts = (asks: CountAsk[]) => {
  const [, redraw] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const key = asks.map(keyOf).join(',');
  useEffect(() => {
    for (const a of asks) {
      const k = keyOf(a);
      if (known.has(k) || asking.has(k)) continue;
      asking.add(k);
      const all = collection(db, a.base, 'messages');
      const q = a.since ? query(all, where('createdAt', '>', Timestamp.fromMillis(a.since))) : all;
      getCountFromServer(q)
        .then(s => { known.set(k, s.data().count); if (mounted.current) redraw(n => n + 1); })
        .catch(e => console.warn('unread count: ', e?.code || e))
        .finally(() => asking.delete(k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const out: Record<string, number> = {};
  for (const a of asks) {
    const n = known.get(keyOf(a));
    if (n !== undefined) out[a.id] = n;
  }
  return out;
};
