import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { PageType } from '../context/NavigationContext';
import { KidsMode, SECTIONS, SectionId, sectionOfPage } from '../data/sections';
import { useSections } from './useSections';

// Who sees which section, in one place:
// • admins see everything that is built;
// • the admin's switches (settings/sections) hide a section or mark it "მალე";
// • a student whose teacher turned on the kids' mode sees only the chosen sections;
// • guests may open only the chant books, songs and მთქმელი lists (and the prayers); the rest asks to sign in.
export type Access = 'open' | 'soon' | 'hidden' | 'locked';
export const GUEST_OPEN: SectionId[] = ['galoba', 'simghera', 'mtkmeli'];

// the signed-in person's kids' mode (live; one listener for the whole app)
let kidsCache: { uid: string | null; mode: KidsMode | null } = { uid: null, mode: null };
const kidsListeners = new Set<() => void>();
let kidsOff: (() => void) | null = null;
const watchKids = (uid: string | null) => {
  if (kidsCache.uid === uid && (kidsOff || !uid)) return;
  kidsOff?.();
  kidsOff = null;
  kidsCache = { uid, mode: null };
  kidsListeners.forEach(l => l());
  if (!uid) return;
  kidsOff = onSnapshot(doc(db, 'students', uid), snap => {
    const k = snap.data()?.kidsMode;
    kidsCache = { uid, mode: k && k.on ? { on: true, sections: Array.isArray(k.sections) ? k.sections : [] } : null };
    kidsListeners.forEach(l => l());
  }, () => {});
};

export const useKidsMode = (): KidsMode | null => {
  const { user, isTeacher } = useAuth();
  const [, setTick] = useState(0);
  useEffect(() => {
    watchKids(user?.uid ?? null);
    const l = () => setTick(t => t + 1);
    kidsListeners.add(l);
    return () => { kidsListeners.delete(l); };
  }, [user?.uid]);
  // teachers and admins are never in the kids' mode
  return !isTeacher && kidsCache.uid === (user?.uid ?? null) ? kidsCache.mode : null;
};

export const useAccess = () => {
  const { user, isAdmin } = useAuth();
  const { state } = useSections();
  const kids = useKidsMode();
  const section = (id: SectionId): Access => {
    const built = Boolean(SECTIONS.find(s => s.id === id)?.page);
    if (isAdmin) return built ? 'open' : 'soon';
    if (state[id] === 'hidden') return 'hidden';
    if (kids && !kids.sections.includes(id)) return 'hidden';
    if (state[id] === 'soon' || !built) return 'soon';
    if (!user && !GUEST_OPEN.includes(id)) return 'locked';
    return 'open';
  };
  const page = (p: PageType): Access => {
    const id = sectionOfPage(p);
    return id ? section(id) : 'open';
  };
  return { section, page, kids };
};
