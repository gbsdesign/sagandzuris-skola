import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_KIDS_SECTIONS, DEFAULT_SECTION_STATE, SectionId, SectionState } from '../data/sections';

// settings/sections (admins write, everyone reads): { state: { galoba: 'open' | 'soon' | 'hidden', … },
// kidsDefault: SectionId[] } — which sections the home page and header show, and the kids' mode default.
export interface SectionSettings {
  state: Record<SectionId, SectionState>;
  kidsDefault: SectionId[];
}

let cache: SectionSettings = { state: DEFAULT_SECTION_STATE, kidsDefault: DEFAULT_KIDS_SECTIONS };
const listeners = new Set<(s: SectionSettings) => void>();
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
        kidsDefault: Array.isArray(d.kidsDefault) ? d.kidsDefault : DEFAULT_KIDS_SECTIONS,
      };
      listeners.forEach(l => l(cache));
    },
    () => { /* offline or not yet set: defaults */ }
  );
};

export const useSections = () => {
  const [s, setS] = useState(cache);
  useEffect(() => {
    start();
    listeners.add(setS);
    setS(cache);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
};
