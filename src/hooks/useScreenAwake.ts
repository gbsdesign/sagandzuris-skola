import { useEffect } from 'react';

// The screen stays on while a long reading is open (the reader's „დღის მსახურება“): the phone lies on the lectern between
// the reader's parts and must not go dark. It may sleep again `idleMs` after the last touch — a forgotten phone does not burn
// its battery — and the next touch wakes the wish again.

type Lock = { release: () => Promise<void> };
type Nav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } };

/** the longest quiet stretch of a service the screen waits through */
export const AWAKE_IDLE_MS = 30 * 60_000;

/** whether this browser can keep the screen on at all (the switch shows only then) */
export const canKeepAwake = () => typeof navigator !== 'undefined' && !!(navigator as Nav).wakeLock;

export const useScreenAwake = (on: boolean, idleMs = AWAKE_IDLE_MS) => {
  useEffect(() => {
    const nav = navigator as Nav;
    if (!on || !nav.wakeLock) return;
    let lock: Lock | null = null;
    let asking = false;
    let gone = false;
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const drop = () => { const l = lock; lock = null; l?.release().catch(() => {}); };
    const take = () => {
      if (gone || lock || asking || document.visibilityState !== 'visible') return;
      asking = true;
      nav.wakeLock!.request('screen').then(
        l => { asking = false; if (gone) l.release().catch(() => {}); else lock = l; },
        () => { asking = false; },
      );
    };
    const touched = (force?: boolean) => {
      const now = Date.now();
      // a scroll fires many times a second: once in five seconds is enough
      if (force !== true && now - last < 5000) return;
      last = now;
      clearTimeout(timer);
      timer = setTimeout(drop, idleMs);
      take();
    };
    const onTouch = () => touched();
    // a hidden page loses the lock by itself: forget it, and ask again on coming back
    const onSeen = () => { if (document.visibilityState === 'visible') touched(true); else lock = null; };
    touched(true);
    document.addEventListener('visibilitychange', onSeen);
    window.addEventListener('pointerdown', onTouch, { passive: true, capture: true });
    window.addEventListener('keydown', onTouch, { passive: true, capture: true });
    window.addEventListener('scroll', onTouch, { passive: true, capture: true });
    return () => {
      gone = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onSeen);
      window.removeEventListener('pointerdown', onTouch, { capture: true });
      window.removeEventListener('keydown', onTouch, { capture: true });
      window.removeEventListener('scroll', onTouch, { capture: true });
      drop();
    };
  }, [on, idleMs]);
};
