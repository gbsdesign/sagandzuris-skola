import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// The order a member chose for the path page ("საგანძურის გზა"): its tabs left to right, and each tab's
// cards top to bottom. Kept on the account (students/{uid}.pathOrder) so every device shows the same order;
// a guest keeps it on this device. Unknown ids are dropped and new ones join at the end, so the lists
// stay valid when cards are added or removed later.
export type PathOrder = Record<string, string[]>;

const LOCAL_KEY = 'pathOrder';

const clean = (v: unknown): PathOrder => {
  if (!v || typeof v !== 'object') return {};
  const out: PathOrder = {};
  for (const [k, list] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(list)) out[k] = list.filter((x): x is string => typeof x === 'string');
  }
  return out;
};

const readLocal = (): PathOrder => {
  try { return clean(JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')); } catch { return {}; }
};

/** `ids` in the saved order: saved ones first (as saved), then any the saved list does not know yet. */
export const ordered = <T extends string>(ids: readonly T[], saved?: string[]): T[] => {
  const known = (saved ?? []).filter((x): x is T => ids.includes(x as T));
  return [...new Set(known), ...ids.filter(x => !known.includes(x))];
};

/** One step left/up (-1) or right/down (+1); the list itself is not changed. */
export const moveItem = <T>(list: T[], item: T, dir: -1 | 1): T[] => {
  const i = list.indexOf(item);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export const usePathOrder = (uid?: string | null) => {
  const [order, setOrder] = useState<PathOrder>(() => (uid ? {} : readLocal()));

  useEffect(() => {
    if (!uid) { setOrder(readLocal()); return; }
    return onSnapshot(doc(db, 'students', uid), snap => setOrder(clean(snap.data()?.pathOrder)), () => {});
  }, [uid]);

  const save = (key: string, list: string[]) => {
    const next = { ...order, [key]: list };
    setOrder(next); // shown at once; the account copy follows
    if (uid) {
      setDoc(doc(db, 'students', uid), { pathOrder: next }, { mergeFields: ['pathOrder'] }).catch(() => {});
    } else {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* just not remembered */ }
    }
  };

  return { order, save };
};
