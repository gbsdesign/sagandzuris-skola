import { useSyncExternalStore } from 'react';

// One quiet „აპის ახალი ვერსია იტვირთება…“ line on the screen at most (the user, 2026-11-24: the same line stood four
// times, one under another, under „ინტერნეტი არ არის“). Every part of a page that failed to load asks for the line; only the
// first one shows it, and none shows while the full „ვერ ჩაიტვირთა“ / „ინტერნეტი არ არის“ screen already says it.

let lines: number[] = [];
let fullScreens = 0;
let nextId = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const openChunkLine = (): number => { const id = nextId++; lines = [...lines, id]; emit(); return id; };
export const closeChunkLine = (id: number) => { lines = lines.filter(x => x !== id); emit(); };

/** The full „ვერ ჩაიტვირთა“ screen is on (true) / gone (false). */
export const fullScreenShown = (on: boolean) => { fullScreens = Math.max(0, fullScreens + (on ? 1 : -1)); emit(); };

/** Does this line show? Only the first one, and none under the full screen. */
export const useChunkLineShows = (id: number | null) =>
  useSyncExternalStore(subscribe, () => id !== null && fullScreens === 0 && lines[0] === id, () => false);

/** Does the site answer at all? Any answer counts (the phone has internet); none within 8 s = no internet. */
export const siteAnswers = async (): Promise<boolean> => {
  const stop = new AbortController();
  const t = window.setTimeout(() => stop.abort(), 8_000);
  try {
    await fetch(`/sw.js?ping=${Date.now()}`, { cache: 'no-store', signal: stop.signal });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(t);
  }
};
