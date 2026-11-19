import { useEffect, useRef, useState } from 'react';

// Opening „მკითხე“ from anywhere (the search page's row, a page's „?“ → „არა“ / „სხვა რამ მკითხე“): it lies over the whole
// app with a history step of its own (`sgMkitkhe`), so the phone's „back“ closes it — as the school assistant does
// (pages/v2/damkhmare/open.ts). Kept tiny: the screen loads only when opened.

export interface MkitkheRequest {
  /** words to ask at once (the search's words that found nothing) */
  query?: string;
}

const EVENT = 'sg-mkitkhe';
let wanted: MkitkheRequest | null = null;

export const openMkitkhe = (req: MkitkheRequest = {}) => {
  wanted = req;
  window.dispatchEvent(new Event(EVENT));
};

/** App's side: the open screen (or null) and how to close it — `then` runs once its history step is gone. */
export const useMkitkheOpen = () => {
  const [req, setReq] = useState<MkitkheRequest | null>(null);
  const after = useRef<(() => void) | null>(null);
  useEffect(() => {
    const show = () => {
      if (!wanted) return;
      const r = wanted;
      wanted = null;
      // opened again while open (a new question from the search): only the words change
      if (!window.history.state?.sgMkitkhe) {
        try { window.history.pushState({ ...(window.history.state || {}), sgMkitkhe: 1 }, ''); } catch { /* opens anyway */ }
      }
      setReq({ ...r });
    };
    const onPop = (e: PopStateEvent) => {
      if (e.state?.sgMkitkhe) return;
      setReq(null);
      const then = after.current;
      after.current = null;
      // after every other listener of this step (the navigation's own) has run
      if (then) window.setTimeout(then, 0);
    };
    show();
    window.addEventListener(EVENT, show);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener(EVENT, show); window.removeEventListener('popstate', onPop); };
  }, []);
  const close = (then?: () => void) => {
    if (window.history.state?.sgMkitkhe) { after.current = then ?? null; window.history.back(); }
    else { setReq(null); then?.(); }
  };
  return { mkitkhe: req, close };
};
