import { useSyncExternalStore } from 'react';

// „ახალი სახე“ (redesign stage 2): the bottom menu, one top bar, the settings, notices and search as pages. Its switch is
// `newLook` (settings/sections, data/sections EXTRA_SWITCHES): hidden = admins only, open = everyone. App.tsx reads the
// switch (useAccess) and sets it here, so low-level parts (the old kit's PageBar) can follow without the access hooks.

let on = false;
const subs = new Set<() => void>();

export const setNewLook = (v: boolean) => {
  if (v === on) return;
  on = v;
  try { document.documentElement.classList.toggle('sg-new', v); } catch { /* no document (tests) */ }
  subs.forEach(f => f());
};

export const isNewLook = () => on;

export const useNewLook = () => useSyncExternalStore(
  f => { subs.add(f); return () => { subs.delete(f); }; },
  () => on,
  () => false,
);

// the bottom menu steps aside while a page asks it to (a chat's own field at the bottom, a full-screen tool)
let hiders = 0;
const navSubs = new Set<() => void>();
export const hideNav = () => {
  hiders += 1; navSubs.forEach(f => f());
  return () => { hiders = Math.max(0, hiders - 1); navSubs.forEach(f => f()); };
};
export const useNavHidden = () => useSyncExternalStore(
  f => { navSubs.add(f); return () => { navSubs.delete(f); }; },
  () => hiders > 0,
  () => false,
);
