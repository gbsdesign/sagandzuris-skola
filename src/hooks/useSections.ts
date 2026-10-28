import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_KIDS_SECTIONS, DEFAULT_SECTION_STATE, SectionId, SectionState, stateOnDay } from '../data/sections';
import { tbilisiToday } from '../utils/hangi';

// settings/sections (admins write, everyone reads): { state: { galoba: 'open' | 'soon' | 'hidden', … },
// openOn: { medavitneobaTopic: '2026-11-01', … }, kidsDefault: SectionId[] } — which sections the home page and header
// show, the day a „მალე“ one opens by itself, and the kids' mode default.
interface Stored {
  state: Record<SectionId, SectionState>;
  openOn: Partial<Record<SectionId, string>>;
  kidsDefault: SectionId[];
}
export interface SectionSettings extends Stored {
  /** as set, before the days (the admin's list) */
  stored: Record<SectionId, SectionState>;
}

let cache: Stored = { state: DEFAULT_SECTION_STATE, openOn: {}, kidsDefault: DEFAULT_KIDS_SECTIONS };
const listeners = new Set<(s: Stored) => void>();
let started = false;

const start = () => {
  if (started) return;
  started = true;
  onSnapshot(
    doc(db, 'settings', 'sections'),
    snap => {
      const d = snap.data() || {};
      cache = {
        state: { ...DEFAULT_SECTION_STATE, ...(d.state || {}) },
        openOn: d.openOn && typeof d.openOn === 'object' ? d.openOn : {},
        kidsDefault: Array.isArray(d.kidsDefault) ? d.kidsDefault : DEFAULT_KIDS_SECTIONS,
      };
      listeners.forEach(l => l(cache));
    },
    () => { /* offline or not yet set: defaults */ }
  );
};

/** `state` = what shows today (a „მალე“ section whose day has come is open); `stored` = as the admin set it. */
export const useSections = (): SectionSettings => {
  const [s, setS] = useState(cache);
  useEffect(() => {
    start();
    listeners.add(setS);
    setS(cache);
    return () => { listeners.delete(setS); };
  }, []);
  const today = tbilisiToday();
  return useMemo(() => ({ ...s, stored: s.state, state: stateOnDay(s.state, s.openOn, today) }), [s, today]);
};
