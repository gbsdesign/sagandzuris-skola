import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { georgiaToday } from '../utils/psalter';

// „ნანახია“ on every film of „ვიდეოები“ (2026-11-08, the user: „ვიდეობის განყოფილებას ყველას დაუმატე პატარა ლამაზად ღილაკი
// ნანახია“): a member's in students/{uid}.videosSeen {YouTube id: the Georgian day}, a guest's on this device. Their number
// fills „ნასწავლი“'s films chest with medallions (utils/pathChests).
const KEY = 'sg-videos-seen';
const EVENT = 'sg-videos-seen';

const readLocal = (): Record<string, string> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
};

const clean = (raw: unknown): Record<string, string> =>
  raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'))
    : {};

export const useWatchedVideos = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [seen, setSeen] = useState<Record<string, string>>(() => (uid ? {} : readLocal()));
  useEffect(() => {
    if (!uid) {
      setSeen(readLocal());
      const on = () => setSeen(readLocal());
      window.addEventListener(EVENT, on);
      return () => window.removeEventListener(EVENT, on);
    }
    return onSnapshot(doc(db, 'students', uid), snap => setSeen(clean(snap.data()?.videosSeen)), () => {});
  }, [uid]);

  const toggle = (id: string) => {
    const on = !seen[id];
    const next = { ...seen };
    if (on) next[id] = georgiaToday();
    else delete next[id];
    setSeen(next);
    if (uid) {
      const ref = doc(db, 'students', uid);
      (on ? setDoc(ref, { videosSeen: { [id]: next[id] } }, { merge: true }) : updateDoc(ref, { [`videosSeen.${id}`]: deleteField() })).catch(() => {});
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage off: it lasts this visit */ }
      window.dispatchEvent(new Event(EVENT));
    }
    return on;
  };

  return { seen, count: Object.keys(seen).length, isSeen: (id: string) => !!seen[id], toggle };
};
