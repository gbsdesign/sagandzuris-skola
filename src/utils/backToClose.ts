// The phone's back closes what is open on top (a sheet, a panel) instead of leaving the page (the user, 2026-11-19:
// „ჩასაკეცი არ არის სანამ უკან არ გამოვალ და უკან გამოსვლისას კიდე მაგდებს“).
//
// Every overlay that asks (`useBackToClose`) is one history entry while it is open: the page's own state copied, plus
// `sgOv: { d, r, id }` (d = how many overlays are open at that entry, r = how many of OUR entries lie there in a row).
// One manager keeps them all, so:
// • closing one and opening another in the same moment reuses the entry (no step back racing the new step);
// • an entry left behind (the person went on to another page from inside a sheet) is skipped when history returns to it;
// • a copy of our mark inside another part's own entry (they copy `history.state`) is never stepped back by us;
// • a step back the APP asks for (`history.back()` — a page's „უკან“, a window closing itself) means „leave my own
//   entry“, so our entries lying on top of it go with it: `history.back` / `history.go(-n)` are wrapped for that.
import { useEffect, useRef } from 'react';

const KEY = 'sgOv';
// the page steps' own keys (NavigationContext) — they may be written onto our entry later and do not make it another's
const NAV = ['sgNav', 'sgDepth', 'sgScroll', 'sgExp', 'sgSearch'];

type St = Record<string, unknown>;
interface Mark { d: number; r: number; id: string }
interface Open { close: (left: boolean) => void }

const stack: Open[] = [];
/** our entries of this visit: id → the other keys each was pushed with */
const mine = new Map<string, string>();
let started = false;
/** a step back of our own is on its way */
let pending = false;
let after: (() => void) | null = null;
/** nothing is pushed again until the open ones are gone (`leaveOverlaySteps`) */
let held = false;
let queued = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let nativeGo: (n: number) => void = () => {};
/** the step on its way was asked by the app (a page's own „უკან“) and takes our entries with it: what closes then was
 *  left behind, not closed by hand */
let byApp = false;
let byAppTimer: ReturnType<typeof setTimeout> | undefined;
const markByApp = () => {
  byApp = true;
  if (byAppTimer) clearTimeout(byAppTimer);
  byAppTimer = setTimeout(() => { byApp = false; }, 1500); // no step came: the next back is the person's own again
};

const stateNow = (): St => {
  try { return (window.history.state as St | null) || {}; } catch { return {}; }
};
const markOf = (s: St | null | undefined): Mark | null => {
  const m = s?.[KEY] as Mark | undefined;
  return m && typeof m.d === 'number' && typeof m.r === 'number' && typeof m.id === 'string' ? m : null;
};
const sig = (s: St) => Object.keys(s).filter(k => k !== KEY && !NAV.includes(k)).sort().join(',');
const isMine = (s: St) => {
  const m = markOf(s);
  return !!m && mine.get(m.id) === sig(s);
};
const without = (s: St): St => {
  const rest = { ...s };
  delete rest[KEY];
  return rest;
};

const queue = () => {
  if (queued) return;
  queued = true;
  void Promise.resolve().then(sync);
};

const stepBack = (n: number, then?: () => void) => {
  pending = true;
  after = then ?? null;
  if (timer) clearTimeout(timer);
  // no step came back (a browser that swallowed it): go on as if it had
  timer = setTimeout(() => { if (pending) stepDone(); }, 900);
  nativeGo(-n);
};

const stepDone = () => {
  pending = false;
  if (timer) clearTimeout(timer);
  const f = after;
  after = null;
  if (f) {
    try { f(); } catch { /* the caller's own trouble */ }
  }
  queue();
};

/** history is made to match what is open: an entry more, an entry less, or a stale mark cleaned */
function sync() {
  queued = false;
  if (pending) return;
  if (held) {
    if (stack.length) return;
    held = false;
  }
  const s = stateNow();
  const have = markOf(s)?.d ?? 0;
  const want = stack.length;
  try {
    if (want > have) {
      let top = s;
      for (let d = have + 1; d <= want; d++) {
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        const r = isMine(top) ? (markOf(top) as Mark).r + 1 : 1;
        const next: St = { ...top, [KEY]: { d, r, id } };
        mine.set(id, sig(next));
        window.history.pushState(next, '');
        top = next;
      }
    } else if (want < have) {
      // ours: one step back (the entry under it is looked at when it arrives); another's copy of the mark: only corrected
      if (isMine(s)) stepBack(1);
      else window.history.replaceState(want ? { ...s, [KEY]: { ...(markOf(s) as Mark), d: want } } : without(s), '');
    }
  } catch { /* history is not ours to write (a sandboxed frame): the overlays still open and close by their own buttons */ }
}

const onPop = (e: PopStateEvent) => {
  if (pending) { stepDone(); return; }
  // the person's own back / forward: everything open above this entry closes
  const have = markOf((e.state as St | null) || null)?.d ?? 0;
  const left = byApp;
  byApp = false;
  while (stack.length > have) {
    const top = stack.pop() as Open;
    try { top.close(left); } catch { /* one overlay's trouble never keeps the rest open */ }
  }
  if (stack.length < have) queue(); // an entry left behind: skipped (ours) or its mark corrected
};

const start = () => {
  if (started) return;
  started = true;
  const h = window.history;
  nativeGo = h.go.bind(h);
  try {
    const go = nativeGo;
    h.back = () => {
      const k = overlaySteps();
      if (k) markByApp();
      go(-1 - k);
    };
    h.go = (n?: number) => {
      const k = typeof n === 'number' && n < 0 ? overlaySteps() : 0;
      if (k) markByApp();
      go(k ? (n as number) - k : (n as number));
    };
  } catch { /* a browser that keeps them fixed: the phone's own back still closes */ }
  window.addEventListener('popstate', onPop, true);
  // a reload with something open: nothing is open now, so the mark is stale
  try {
    const s = stateNow();
    if (markOf(s)) h.replaceState(without(s), '');
  } catch { /* as above */ }
};

/** How many of our entries lie on top of the page's (or a window's) own entry. */
export const overlaySteps = (): number => {
  const s = stateNow();
  return isMine(s) ? (markOf(s) as Mark).r : 0;
};

/**
 * Closes what is open on top exactly as the phone's back would — for a key (Escape) inside a full-screen window that
 * catches the keys itself. False when nothing of ours is open there (the caller then closes itself).
 */
export const closeTopOverlay = (): boolean => {
  if (!overlaySteps()) return false;
  nativeGo(-1);
  return true;
};

/**
 * Leaves our entries on top, then runs `then` on the entry under them (at once when there is none) — for a page that
 * closes itself without a step back (the notes opened from a link) while a sheet or its panel is still open.
 */
export const leaveOverlaySteps = (then: () => void) => {
  const k = overlaySteps();
  if (!k) { then(); return; }
  held = true;
  setTimeout(() => { held = false; queue(); }, 1500);
  stepBack(k, then);
};

/**
 * One overlay is open: the phone's back calls `close`. Returns what to call when it closes by itself.
 * `close(left)`: `left` is true when it closes only because the app stepped back past it (the page under it was left
 * by its own „უკან“) — not because the person closed this very thing.
 */
export const openOverlay = (close: (left: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  start();
  const entry: Open = { close };
  stack.push(entry);
  queue();
  return () => {
    const i = stack.indexOf(entry);
    if (i < 0) return; // closed by the back itself
    stack.splice(i, 1);
    queue();
  };
};

/** While `open`, the phone's (and the browser's) back closes this instead of leaving the page. */
export function useBackToClose(open: boolean, onClose: (left: boolean) => void) {
  const fn = useRef(onClose);
  fn.current = onClose;
  useEffect(() => {
    if (!open) return;
    return openOverlay(left => fn.current(left));
  }, [open]);
}
