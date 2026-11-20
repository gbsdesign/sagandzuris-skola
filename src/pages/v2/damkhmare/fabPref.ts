import { useSyncExternalStore } from 'react';

// Whether the superadmin's floating cog shows on this device (the user: „კბილანას გათიშვა და ჩართვა შემეძლოს … რომ ეკრანებზე
// არ მიედოს“). Off = `sg-program-fab-off` on the device; the program itself still opens from the admin's home, a class's bar
// and the search page. Switched in „პარამეტრები“ and by the small window's „დამალვა“.

const KEY = 'sg-program-fab-off';
const listeners = new Set<() => void>();

const read = (): boolean => {
  try { return localStorage.getItem(KEY) !== '1'; } catch { return true; }
};

export const setFabShown = (shown: boolean) => {
  try {
    if (shown) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, '1');
  } catch { /* storage off: it stays shown */ }
  listeners.forEach(l => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  // another tab's switch
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) l(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

export const useFabShown = (): boolean => useSyncExternalStore(subscribe, read, () => true);
