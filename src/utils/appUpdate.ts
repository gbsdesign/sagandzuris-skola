// The app moves to a newly published version by itself, as soon as that does not get in the way (the user's goal,
// 2026-11-07: „ყველა სიახლე მაქსიმალურად მალე ყველასთვის … ყველას ტელეფონზე“).
//
// The service worker (vite.config.ts: skipWaiting + clientsClaim) takes over once it has downloaded a new version, but
// this tab still runs the old one. It restarts on the new one:
//  • at once, when the app was opened or brought back in the last 30 s;
//  • when it goes out of sight (screen off, another app) — notes too: they come back at the same place and zoom;
//  • when it is brought back after a minute away;
//  • while it stays on screen, at the next move to another page (`atPageChange`, NavigationContext).
// Never while held — church mode, a call, the synthesizer sounding (`holdUpdates`) —, while a recording sounds
// (utils/mediaControls.ts) or while words typed in a field would be lost; on screen also not while notes or the Liturgy
// program are open or a field is in use.
// The site is asked for a newer version on opening, on coming back and every 2 minutes while on screen — every minute
// on the owner's account (`setUpdateCheckEvery`, AuthContext; the user's wish, 2026-11-07, to see a change at once).
// With the app closed, the worker asks too (public/prayer-notify-sw.js): on every push that wakes it and on Chrome's
// periodic background sync (`sg-update`, registered below where the phone allows it — Android's installed app; the phone
// decides how often), so the next opening already shows the new version. sagandzureli.ge
// tells phones to keep .js files for 4 hours, so the worker is registered with updateViaCache 'none' and /sw.js is asked
// again past the cache before each check, for browsers that ignore that setting.

import { recordingSounds } from './mediaControls';

const CHECK_EVERY = 2 * 60_000;
const FRESH = 30_000;
const AWAY = 60_000;

const holds = new Set<string>();
/** Keep the old version running while `on` (e.g. church mode): a restart now would get in the way. */
export const holdUpdates = (why: string, on: boolean) => { if (on) holds.add(why); else holds.delete(why); };

let pending = false;
let checkEvery = CHECK_EVERY;
/** How often the site is asked while the app is on screen (the owner: every minute); none = the usual 2 minutes. */
export const setUpdateCheckEvery = (ms?: number) => { checkEvery = ms ?? CHECK_EVERY; };

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

const notesOpen = () => { const q = new URLSearchParams(window.location.search); return q.has('v') || q.has('p'); };
const TEXT_INPUTS = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'password']);
/** The text field in use now (a checkbox, slider or button is none). */
const field = (): { value: string } | null => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return null;
  if (el.isContentEditable) return { value: el.textContent ?? '' };
  if (el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLInputElement && TEXT_INPUTS.has(el.type)) return el;
  return null;
};
/** out of sight: nothing sounding, talking or half typed may be lost */
const busyAway = () => holds.size > 0 || recordingSounds() || !!field()?.value.trim();
/** on screen: not while notes are read or a field is in use either */
const busyHere = () => busyAway() || notesOpen() || !!field();

const restart = () => { window.location.reload(); };

let lastCheck = 0;
const check = () => {
  lastCheck = Date.now();
  const sw = navigator.serviceWorker;
  const ask = () => sw.getRegistration().then(r => {
    if (!r) return;
    // a newer worker left waiting (an old one without skipWaiting) is told to take over
    r.waiting?.postMessage({ type: 'SKIP_WAITING' });
    return r.update().then(() => { r.waiting?.postMessage({ type: 'SKIP_WAITING' }); });
  }).catch(() => {});
  if (import.meta.env.PROD) fetch('/sw.js', { cache: 'no-cache' }).catch(() => {}).finally(ask);
  else void ask();
};

/** A move to another page of the app: while the app stays on screen, the moment for the new version. */
export const atPageChange = () => {
  if (pending && document.visibilityState === 'visible' && !busyHere()) restart();
};

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

  let controlled = !!sw.controller; // the very first install on a device needs no restart
  let freshSince = Date.now();
  let hiddenAt = 0;
  sw.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    pending = true;
    if (document.visibilityState === 'hidden' ? !busyAway() : Date.now() - freshSince < FRESH && !busyHere()) restart();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      if (pending && !busyAway()) restart();
      return;
    }
    if (pending && hiddenAt && Date.now() - hiddenAt > AWAY && !busyAway()) { restart(); return; }
    freshSince = Date.now();
    check();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= checkEvery - 5_000) check();
  }, 15_000);

  // a part of the old version that the site no longer has (it was published anew): the new version has it
  window.addEventListener('vite:preloadError', (e) => {
    if (!navigator.onLine || busyAway()) return;
    try {
      if (Date.now() - Number(sessionStorage.getItem('sg-reload-at') || 0) < 20_000) return; // never round and round
      sessionStorage.setItem('sg-reload-at', String(Date.now()));
    } catch { return; }
    e.preventDefault();
    restart();
  });

  check();
};
