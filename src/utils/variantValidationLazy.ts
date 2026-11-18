import { useEffect, useState } from 'react';
import type * as Validation from './variantValidation';

// The check of a member's saved chants against every book and song (utils/variantValidation → data/registry, which holds
// all the chant and song data) loads a little after the first screen (redesign stage 3 „სიჩქარე“). Until then a saved list
// passes as it is — the check only ever drops ids that no longer exist, so nothing is lost — and it is checked again on arrival.

let mod: typeof Validation | null = null;
let loading: Promise<typeof Validation> | null = null;
export const loadValidation = () => (loading ??= import('./variantValidation').then(m => (mod = m)));

export const filterValidSoft = <T extends Record<string, unknown>>(map: T): T => (mod ? mod.filterValidVariants(map) : map);

export const useValidationReady = (wanted: boolean) => {
  const [ready, setReady] = useState(() => mod !== null);
  useEffect(() => {
    if (!wanted || ready) return;
    let gone = false;
    const go = () => void loadValidation().then(() => { if (!gone) setReady(true); });
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const t = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 2500);
    return () => { gone = true; if (!w.requestIdleCallback) window.clearTimeout(t); };
  }, [wanted, ready]);
  return ready;
};
