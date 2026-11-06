import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startOffline } from './utils/offlineFiles';
import { applyKhutsuri, isKhutsuri } from './utils/khutsuri';
import { markAndroidApp } from './utils/androidApp';
import { recordingSounds } from './utils/mediaControls';

// Auto-clean stale Service Workers on dev/preview so the app never freezes or serves stale assets
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update().catch(() => {});
    }
  }).catch(() => {});
}

// The service worker (vite.config.ts, injectRegister false). updateViaCache 'none': the check for a new version always
// asks the site, also for the worker's own prayer-notify-sw.js — sagandzureli.ge tells phones to keep .js files for 4
// hours, and a new version could otherwise start with the old notices and calls part.
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const register = () => { navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {}); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// A newer version of the site took over (skipWaiting + clientsClaim in vite.config.ts), but this tab still runs the
// old one. Start the new one at once if the app was opened or brought back just now; otherwise when the app goes out
// of sight, or when it is brought back after a minute away — never in the middle of use: not while notes or the
// Liturgy program are open (the choir reads them live), a recording sounds (utils/mediaControls.ts) or something is
// being typed. Coming back to the app also asks the site for a newer version.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const sw = navigator.serviceWorker;
  let controlled = !!sw.controller; // the very first install on a device needs no restart
  let freshSince = Date.now();
  let hiddenAt = 0;
  let pending = false;
  const notesOpen = () => { const q = new URLSearchParams(window.location.search); return q.has('v') || q.has('p'); };
  const typing = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  };
  const busy = () => notesOpen() || recordingSounds() || typing();
  sw.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    if (Date.now() - freshSince < 30_000 && !busy()) window.location.reload();
    else pending = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      if (pending && !busy()) window.location.reload();
    } else {
      if (pending && hiddenAt && Date.now() - hiddenAt > 60_000 && !busy()) { window.location.reload(); return; }
      freshSince = Date.now();
      sw.getRegistration().then(r => r?.update()).catch(() => {});
    }
  });
}

// offline mode: the light data downloads by itself in the background (utils/offlineFiles.ts)
startOffline();

// ხუცური (the header's „Ⴞ“): set before the first paint, so the page doesn't flash in mkhedruli
applyKhutsuri(isKhutsuri());
markAndroidApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
