import { useSyncExternalStore } from 'react';

// Which engine the assistant asks (plan 2.0, the user: „გუგლის პროგრამა · ლადოს პროგრამა“). „ლადოს პროგრამა“ = Claude through
// the reminders Worker's /lado (the key only on the server; it spends the Max plan's monthly API credit) — superadmins
// only; everyone else always asks Google. Kept on the device (`sg-program-engine`); Lado by default (the user: „ჩართე ლადო“).

export type Engine = 'google' | 'lado';

const KEY = 'sg-program-engine';
const listeners = new Set<() => void>();

const read = (): Engine => {
  try { return localStorage.getItem(KEY) === 'google' ? 'google' : 'lado'; } catch { return 'lado'; }
};

export const setEngine = (e: Engine) => {
  try { localStorage.setItem(KEY, e); } catch { /* storage off: the default stays */ }
  listeners.forEach(l => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) l(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

export const useEngine = (): Engine => useSyncExternalStore(subscribe, read, () => 'lado');
