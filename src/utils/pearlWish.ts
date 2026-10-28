import { useEffect, useRef } from 'react';

// One pearl opened from elsewhere („დღის მარგალიტი“ on the home page): openPearl() leaves a one-time wish that the
// pearls panel (components/pearls/PearlChests.tsx) uses up when it mounts, or hears at once while it is shown. The
// caller also opens the panel itself (openPathPanel('pearls') and the path page).

let wish: string | null = null;
const EVENT = 'open-pearl';

export const openPearl = (id: string) => {
  wish = id;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
};

export const usePearlWish = (onOpen: (id: string) => void) => {
  const cb = useRef(onOpen);
  cb.current = onOpen;
  useEffect(() => {
    const take = () => {
      const id = wish;
      wish = null;
      if (id) cb.current(id);
    };
    take();
    window.addEventListener(EVENT, take);
    return () => window.removeEventListener(EVENT, take);
  }, []);
};
