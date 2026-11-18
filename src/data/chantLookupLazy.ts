import { useEffect, useState } from 'react';
import type { VersionInfo } from './chantLookup';

// The chant books' index (data/chantLookup — every book's chants, ~1 MB) loads only when something needs it (redesign stage 3
// „სიჩქარე“): a notes page, the program, a chant's home button, a shared notes link. Until then `chantLookupNow()` is null and
// callers wait for `loadChantLookup()`. Any page that imports the books itself makes it known at once (chantLookup.ts calls
// `noteChantLookup` when it runs), so after that it answers immediately.

interface Lookup { findVersion: (variantId: string | null | undefined) => VersionInfo | undefined }

let mod: Lookup | null = null;
let loading: Promise<void> | null = null;
const waiting = new Set<() => void>();

/** chantLookup.ts says it is here */
export const noteChantLookup = (m: Lookup) => {
  if (mod) return;
  mod = m;
  waiting.forEach(f => f());
  waiting.clear();
};

export const loadChantLookup = (): Promise<void> => {
  if (mod) return Promise.resolve();
  return (loading ??= import('./chantLookup').then(m => noteChantLookup(m)));
};

/** the index if it is already here, else null (and start loading it) */
export const chantLookupNow = (): Lookup | null => {
  if (!mod) void loadChantLookup();
  return mod;
};

/** whether the index is already here (without starting to load it) */
export const chantLookupLoaded = () => mod !== null;

/** True once the index is here. `wanted`: start loading it (a little after the first screen); a page that brings the books
 *  in by itself also turns it true. */
export const useChantLookupReady = (wanted: boolean) => {
  const [ready, setReady] = useState(chantLookupLoaded);
  useEffect(() => {
    if (ready) return;
    let gone = false;
    const done = () => { if (!gone) setReady(true); };
    if (mod) { done(); return; }
    waiting.add(done);
    let t = 0;
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    if (wanted) {
      const go = () => void loadChantLookup();
      t = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 2500);
    }
    return () => { gone = true; waiting.delete(done); if (wanted && !w.requestIdleCallback) window.clearTimeout(t); };
  }, [wanted, ready]);
  return ready;
};
