import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// settings/removedMembers { uids } — the members a superadmin deleted from the school (utils/memberRemoval.ts): every chat list
// hides them. Only ids, like settings/leftMembers.
let now = new Set<string>();
const subs = new Set<() => void>();
let off: (() => void) | null = null;

export const useRemovedMembers = (): Set<string> => {
  const [, redraw] = useState(0);
  useEffect(() => {
    const r = () => redraw(x => x + 1);
    subs.add(r);
    if (!off) {
      off = onSnapshot(doc(db, 'settings', 'removedMembers'), s => {
        const u = s.data()?.uids;
        now = new Set(Array.isArray(u) ? u.filter((x): x is string => typeof x === 'string') : []);
        subs.forEach(f => f());
      }, () => {});
    }
    return () => { subs.delete(r); if (!subs.size && off) { off(); off = null; } };
  }, []);
  return now;
};
