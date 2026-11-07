// A newly published version reaches every phone as fast as possible (the user, 2026-11-07: „ჩემთვის მთავარია სწრაფად
// განახლდეს ყველასთან … ან გახსნილი დაიხუროს და გაიხსნას“).
//
// • Opening the app always shows the newest version: the service worker asks the site for the page first and opens the
//   copy kept on the phone only without internet (public/prayer-notify-sw.js).
// • While open, the site is asked every 2 minutes (the owner's account every minute — `setUpdateCheckEvery`, AuthContext),
//   on opening and on coming back; with the app closed, the worker asks on every push and on the phone's periodic
//   background sync (`sg-update`, registered below where the phone allows it).
// • Once the site has a newer version than this page, the page restarts at once — on screen too, notes too (they reopen at
//   their place). It waits only while a restart would break something: church mode, a call, a recording or the
//   synthesizer sounding, the microphone recording (`holdUpdates`), words typed in a field, or a finger just on the screen
//   (3 s) — and restarts the moment that ends.
// sagandzureli.ge tells phones to keep .js files for 4 hours, so the worker is registered with updateViaCache 'none' and
// /sw.js is asked past the cache.

import { recordingSounds } from './mediaControls';

const CHECK_EVERY = 2 * 60_000;
const IDLE = 3_000;
const LEFT_KEY = 'sg-left-version';

const holds = new Set<string>();
const holdsUntil = new Map<string, number>();
let pending = false;
let checkEvery = CHECK_EVERY;
let lastCheck = 0;
let lastTouch = 0;
let poll = 0;

/** How often the site is asked while the app is on screen (the owner: every minute); none = the usual 2 minutes. */
export const setUpdateCheckEvery = (ms?: number) => { checkEvery = ms ?? CHECK_EVERY; };

/** Keep the old version running while `on` (church mode, a call, a sound, the microphone): a restart would break it. */
export const holdUpdates = (why: string, on: boolean) => {
  if (on) holds.add(why); else holds.delete(why);
  if (!on && pending) tryRestart();
};

/** Keep the old version a while longer (a take just recorded waits to be heard and sent). */
export const holdUpdatesFor = (why: string, ms: number) => { holdsUntil.set(why, Date.now() + ms); };
const heldAWhile = () => [...holdsUntil.values()].some(t => t > Date.now());

/** This page's own start files (assets/index-<hash>.js and .css): the newest version's worker lists them, an older one
 *  does not. */
const myEntry = (): string | null => {
  if (typeof document === 'undefined') return null;
  const files = [
    document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src,
    document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="/assets/index-"]')?.href,
  ].filter((u): u is string => !!u).map(u => new URL(u).pathname.replace(/^\//, ''));
  return files.length ? files.join(' ') : null;
};

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'password']);
const typedText = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return !!el.textContent?.trim();
  if (el instanceof HTMLTextAreaElement) return !!el.value.trim();
  return el instanceof HTMLInputElement && TEXT_INPUTS.has(el.type) && !!el.value.trim();
};
const busy = () => holds.size > 0 || heldAWhile() || recordingSounds() || typedText() || Date.now() - lastTouch < IDLE;

const restart = () => {
  try { const me = myEntry(); if (me) sessionStorage.setItem(LEFT_KEY, me); } catch { /* storage off */ }
  window.location.reload();
};

function tryRestart() {
  if (!pending) return;
  if (!busy()) { restart(); return; }
  if (!poll) poll = window.setInterval(() => { if (!busy()) { window.clearInterval(poll); poll = 0; restart(); } }, 2_000);
}

/** The live version's worker — does it list this page's start script? null = could not tell. */
const liveHasMe = async (): Promise<boolean | null> => {
  const me = myEntry();
  if (!me || !import.meta.env.PROD) return null;
  try {
    const res = await fetch('/sw.js', { cache: 'no-cache' });
    if (!res.ok) return null;
    const text = await res.text();
    return me.split(' ').every(f => text.includes(f));
  } catch { return null; }
};

/** Does the worker now in charge give pages from the site (public/prayer-notify-sw.js answers „sg-fresh?“)? An older
 *  one gives the copy kept on the phone, so a restart there would show the old version again. */
const workerOpensFresh = () => new Promise<boolean>(resolve => {
  const c = navigator.serviceWorker.controller;
  if (!c) { resolve(true); return; } // no worker: the page comes from the site anyway
  const ch = new MessageChannel();
  const t = window.setTimeout(() => resolve(false), 1_500);
  ch.port1.onmessage = e => { window.clearTimeout(t); resolve(e.data === true); };
  try { c.postMessage({ type: 'sg-fresh?' }, [ch.port2]); } catch { window.clearTimeout(t); resolve(false); }
});

const check = async () => {
  lastCheck = Date.now();
  const sw = navigator.serviceWorker;
  const has = await liveHasMe();
  // the site already has a newer version: restart now, the page will come from the site — once for this version per tab
  // (no internet then = the kept copy again); with an older worker the worker's own change restarts it.
  if (has === false) {
    let tried = false;
    try { tried = sessionStorage.getItem(LEFT_KEY) === myEntry(); } catch { /* storage off */ }
    if (!tried && await workerOpensFresh()) { pending = true; tryRestart(); }
  }
  try {
    const r = await sw.getRegistration();
    if (!r) return;
    r.waiting?.postMessage({ type: 'SKIP_WAITING' }); // a newer worker left waiting takes over
    await r.update();
    r.waiting?.postMessage({ type: 'SKIP_WAITING' });
  } catch { /* offline */ }
};

type PeriodicSync = { register: (tag: string, o: { minInterval: number }) => Promise<void> };
/** Let the phone wake the worker now and then to fetch a new version while the app is closed (where it allows it). */
const askPeriodicSync = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as ServiceWorkerRegistration & { periodicSync?: PeriodicSync }).periodicSync;
    if (!sync || !navigator.permissions) return;
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (st.state === 'granted') await sync.register('sg-update', { minInterval: 60 * 60_000 });
  } catch { /* not on this phone */ }
};

/** A move to another page of the app (NavigationContext): a good moment for a waiting new version. */
export const atPageChange = () => { if (pending) tryRestart(); };

export const startAppUpdates = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  if (import.meta.env.PROD) {
    const register = () => {
      sw.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
      void askPeriodicSync();
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  // a finger on the screen: no restart under it (and a write it started has time to finish)
  for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(ev, () => { lastTouch = Date.now(); }, { capture: true, passive: true });
  }

  let controlled = !!sw.controller; // the very first install on a device needs no restart
  sw.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    // a page opened from the site may already be the new version: restart only an older one
    void liveHasMe().then(has => { if (has !== true) { pending = true; tryRestart(); } });
  });
  document.addEventListener('visibilitychange', () => {
    if (pending) { tryRestart(); return; }
    if (document.visibilityState === 'visible') void check();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= checkEvery - 5_000) void check();
  }, 15_000);

  // a part of the old version that the site no longer has (it was published anew): the new version has it
  window.addEventListener('vite:preloadError', (e) => {
    if (!navigator.onLine || holds.size > 0) return;
    try {
      if (Date.now() - Number(sessionStorage.getItem('sg-reload-at') || 0) < 20_000) return; // never round and round
      sessionStorage.setItem('sg-reload-at', String(Date.now()));
    } catch { return; }
    e.preventDefault();
    restart();
  });

  void check();
};
