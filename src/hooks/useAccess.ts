import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useRealAuth } from '../context/AuthContext';
import type { PageType } from '../context/NavigationContext';
import { ExtraId, KidsMode, SECTIONS, SectionId, sectionOfPage } from '../data/sections';
import { useSections } from './useSections';
import { FeatureId, useMembership } from '../utils/memberAccess';

// Who sees which section, in one place:
// • admins see everything that is built;
// • the admin's switches (settings/sections) hide a section or mark it "მალე";
// • a student whose teacher turned on the kids' mode sees only the chosen sections;
// • guests may open only the chant books, songs and მთქმელი lists (and the prayers); the rest asks to sign in.
export type Access = 'open' | 'soon' | 'hidden' | 'locked';
export const GUEST_OPEN: SectionId[] = ['galoba', 'simghera', 'mtkmeli', 'videoebi', 'eklesiebi'];
// sections for everyone: a member sees them without a superadmin giving them (the admin's switch still hides them)
const FOR_EVERYONE: SectionId[] = ['videoebi', 'eklesiebi'];

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
  const { user, isTeacher } = useRealAuth();
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

// a member's features are given per section
const featureOf = (id: SectionId): FeatureId => id;

export const useAccess = () => {
  const { isAdmin } = useRealAuth();
  const { state } = useSections();
  const kids = useKidsMode();
  // a member a superadmin has not let in yet sees what guests see; one let in sees only what was given
  // (utils/memberAccess) — what was not given is hidden, never shown as locked
  const membership = useMembership();
  const member = membership.isMember;
  const section = (id: SectionId): Access => {
    const built = Boolean(SECTIONS.find(s => s.id === id)?.page);
    if (isAdmin) return built ? 'open' : 'soon';
    if (state[id] === 'hidden') return 'hidden';
    if (kids && !kids.sections.includes(id)) return 'hidden';
    if (member && !FOR_EVERYONE.includes(id) && !membership.can(featureOf(id))) return 'hidden';
    if (state[id] === 'soon' || !built) return 'soon';
    if (!member && !GUEST_OPEN.includes(id)) return 'locked';
    return 'open';
  };
  // a part of the site with its own switch (data/sections EXTRA_SWITCHES): admins always, others while it is open
  const on = (id: ExtraId): boolean => isAdmin || state[id] === 'open';
  const page = (p: PageType): Access => {
    // „საგანძურის გზა“ holds the habits, the outfit, the learned…: it stays while any of its parts is open
    if (p === 'gz') {
      const g = section('gza');
      if (g === 'open' || g === 'locked') return g;
      const habits = section('chvevebi');
      if (habits === 'open' || habits === 'locked') return habits;
      if (member && (['samosi', 'learn', 'manera', 'work'] as ExtraId[]).some(on)) return 'open';
      return g;
    }
    const id = sectionOfPage(p);
    if (id) return section(id);
    if (p === 'class' || p === 'teacher') return membership.can('classes') ? 'open' : 'hidden';
    if (p === 'messages' || p === 'dm') return membership.can('messages') ? 'open' : 'hidden';
    if (p === 'prayer' || p === 'commemoration') return on('prayers') ? 'open' : 'hidden';
    if (p === 'abituri') return on('abituri') ? 'open' : 'hidden';
    if (p === 'birthdays') return on('birthdays') ? 'open' : 'hidden';
    return 'open';
  };
  return { section, page, on, kids, member, can: membership.can, status: membership.status };
};
