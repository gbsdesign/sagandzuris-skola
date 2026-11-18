import { useEffect, useState } from 'react';

// The holy fathers' saying on the home page changes every quarter hour, the same one for everyone at the same time, and
// moves on by itself while the page is open (the old home page's own rule, pages/HomePage.tsx).

const ROTATE_MS = 15 * 60 * 1000;

export const useSayingSlot = (): number => {
  const [slot, setSlot] = useState(() => Math.floor(Date.now() / ROTATE_MS));
  useEffect(() => {
    const id = window.setTimeout(() => setSlot(Math.floor(Date.now() / ROTATE_MS)), ROTATE_MS - (Date.now() % ROTATE_MS) + 500);
    return () => window.clearTimeout(id);
  }, [slot]);
  return slot;
};
