import { useEffect, useRef } from 'react';

// The drill screen's own history step (`sgDrill`, ManeraLessonSheet's DrillScreen and the new look's DrillScreenV2): the
// phone's back closes it, Escape too unless a window lies over it, and the page under it does not scroll meanwhile.
// `back(then)` closes it; `then` (a trainer that opens the learning mode, a game or the notes) waits for the step to be
// taken back first, so the next page's step is not the one taken back.

const HISTORY_KEY = 'sgDrill';

export const useDrillHistory = (onClose: () => void) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const after = useRef<(() => void) | null>(null);
  const back = useRef((then?: () => void) => {
    if (window.history.state?.[HISTORY_KEY]) {
      after.current = then ?? null;
      window.history.back();
    } else {
      closeRef.current();
      then?.();
    }
  }).current;

  useEffect(() => {
    try { if (!window.history.state?.[HISTORY_KEY]) window.history.pushState({ ...(window.history.state || {}), [HISTORY_KEY]: 1 }, ''); } catch { /* still opens */ }
    const onPop = (e: PopStateEvent) => {
      if (e.state?.[HISTORY_KEY]) return;
      const then = after.current;
      after.current = null;
      closeRef.current();
      if (then) window.setTimeout(then, 0);
    };
    // Escape closes the screen unless a window opened over it has it
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && document.querySelectorAll('[role="dialog"]').length < 2) back(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [back]);

  return back;
};
