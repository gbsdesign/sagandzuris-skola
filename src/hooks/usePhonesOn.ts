import { useEffect, useState } from 'react';
import { phonesOf, type PhonesOf } from '../utils/groupPush';

// Who of a class has a phone that rings for calls with the app closed (2026-11-24, the user: „ზარი არ შედის არავისთან“):
// a teacher's or an admin's look, asked of the reminders Worker (/phones) once a visit — kept two minutes, so the members'
// tab can be opened again without asking. null while it is not known (or the person may not ask).

const kept = new Map<string, { at: number; map: Record<string, PhonesOf> }>();
const FRESH_MS = 2 * 60_000;

export const usePhonesOn = (uids: string[], on: boolean): Record<string, PhonesOf> | null => {
  const key = [...uids].sort().join(',');
  const [map, setMap] = useState<Record<string, PhonesOf> | null>(() => kept.get(key)?.map ?? null);
  useEffect(() => {
    if (!on || !key) return;
    const k = kept.get(key);
    if (k && Date.now() - k.at < FRESH_MS) { setMap(k.map); return; }
    let live = true;
    void phonesOf(key.split(',')).then(m => {
      if (!m) return;
      kept.set(key, { at: Date.now(), map: m });
      if (live) setMap(m);
    });
    return () => { live = false; };
  }, [key, on]);
  return on ? map : null;
};
