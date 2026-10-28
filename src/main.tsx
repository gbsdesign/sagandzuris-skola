import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startOffline } from './utils/offlineFiles';
import { applyKhutsuri, isKhutsuri } from './utils/khutsuri';

// Auto-clean stale Service Workers on dev/preview so the app never freezes or serves stale assets
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update().catch(() => {});
    }
  }).catch(() => {});
}

// A newer version of the site took over (the service worker updates itself — registerType 'autoUpdate'), but this
// tab still runs the old one. Start the new one at once if the app was opened or brought back just now; otherwise
// as soon as the app is out of sight — never in the middle of use, and not while notes or the Liturgy program are
// open (the choir reads them live). Coming back to the app also asks the site for a newer version.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const sw = navigator.serviceWorker;
  let controlled = !!sw.controller; // the very first install on a device needs no restart
  let freshSince = Date.now();
  let pending = false;
  const notesOpen = () => { const q = new URLSearchParams(window.location.search); return q.has('v') || q.has('p'); };
  sw.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    if (Date.now() - freshSince < 20_000 && !notesOpen()) window.location.reload();
    else pending = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (pending && !notesOpen()) window.location.reload();
    } else {
      freshSince = Date.now();
      sw.getRegistration().then(r => r?.update()).catch(() => {});
    }
  });
}

// offline mode: the light data downloads by itself in the background (utils/offlineFiles.ts)
startOffline();

// ხუცური (the header's „Ⴞ“): set before the first paint, so the page doesn't flash in mkhedruli
applyKhutsuri(isKhutsuri());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
