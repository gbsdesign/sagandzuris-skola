// Loaded into the PWA service worker (vite.config.ts → workbox.importScripts).

// A newer version of the site is fetched while the app is closed too (the user's wish, 2026-11-07: „რომც არ გახსნან,
// უეჭველი განახლდეს“): every push that wakes this worker and the phone's periodic background sync (`sg-update`,
// registered by src/utils/appUpdate.ts where allowed) ask the site; a new version installs and takes over by itself
// (skipWaiting + clientsClaim), so the next opening already shows it. At most once a minute.
let lastUpdateAsk = 0;
const askForUpdate = () => {
  if (Date.now() - lastUpdateAsk < 60000) return Promise.resolve();
  lastUpdateAsk = Date.now();
  return self.registration.update().catch(() => {});
};
self.addEventListener('push', (event) => { event.waitUntil(askForUpdate()); });
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sg-update') event.waitUntil(askForUpdate());
});

// Seven-times prayer hours (same as src/data/prayers.ts).
const PRAYER_HOURS = [
  { id: 'hour-6', hour: 6, label: 'დილის 6 საათის' },
  { id: 'hour-9', hour: 9, label: 'დილის 9 საათის' },
  { id: 'hour-12', hour: 12, label: 'დღის 12 საათის' },
  { id: 'hour-15', hour: 15, label: 'დღის 3 საათის' },
  { id: 'hour-18', hour: 18, label: 'საღამოს 6 საათის' },
  { id: 'hour-21', hour: 21, label: 'საღამოს 9 საათის' },
  { id: 'hour-24', hour: 0, label: 'ღამის 12 საათის' },
];

// The reminder server (worker/reminders) sends empty pushes 10, 5 or 1 minute before an hour;
// the clock tells which hour is coming and how long is left. Group and assignment reminders carry
// their own text: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  let message = null;
  try {
    message = event.data ? event.data.json() : null;
  } catch (e) {
    message = null;
  }
  if (message && (message.kind === 'call' || message.kind === 'call-end' || message.kind === 'chat')) {
    event.waitUntil(showTalk(message));
    return;
  }
  if (message && message.title) {
    event.waitUntil(
      self.registration.showNotification(message.title, {
        body: message.body || '',
        tag: message.tag || undefined,
        data: { url: message.url || '/' },
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      })
    );
    return;
  }
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let best = null;
  for (const h of PRAYER_HOURS) {
    const left = (h.hour * 60 - minutesNow + 1440) % 1440;
    if (!best || left < best.left) best = { h, left };
  }
  const near = best && best.left <= 15;
  const minutes = near ? Math.max(1, Math.round(best.left)) : 0;
  const title = 'შვიდგზის ლოცვა';
  const options = near
    ? {
        body: `${best.h.label} ლოცვამდე ${minutes} წუთი დარჩა`,
        tag: `${best.h.id}-${minutes}`,
        data: { prayerId: best.h.id },
      }
    : { body: 'ლოცვის დრო ახლოვდება', tag: 'prayer-hour', data: {} };
  event.waitUntil(self.registration.showNotification(title, { ...options, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' }));
});

// ---- calls and messages (worker/reminders /ring and /chat-notify, 2026-11-05) -----------------------------------
// While the site is on screen it rings and shows the message itself, so the phone's notice is left out then (an „ended“
// ring still clears its notice). A ring: „პასუხი“ / „უარი“, kept until touched, vibrating; the Android app turns it into
// a real ring (android/ BellDelegationService, by the tag `call-d-…` / `call-c-…` and its two buttons). „უარი“ ends a private call for
// both through the Worker with the ring's own signature.
const RING_VIBRATE = [700, 400, 700, 400, 700, 400, 700, 400, 700, 400, 700];
const onScreen = () =>
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => list.some((c) => c.visibilityState === 'visible'));

async function showTalk(m) {
  const visible = await onScreen();
  if (m.kind === 'call-end') {
    const open = await self.registration.getNotifications({ tag: m.tag });
    open.forEach((n) => n.close());
    if (visible || !open.length) return;
    return self.registration.showNotification(m.title, {
      body: m.body || '', tag: m.tag, silent: true, data: { url: m.url || '/' }, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
    });
  }
  if (visible) return;
  if (m.kind === 'call') {
    return self.registration.showNotification(m.title, {
      body: m.body || '', tag: m.tag, renotify: true, requireInteraction: true, vibrate: RING_VIBRATE,
      actions: [{ action: 'answer', title: 'პასუხი' }, { action: 'decline', title: 'უარი' }],
      data: { url: m.url || '/', answer: m.answer || null, decline: m.decline || null }, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
    });
  }
  return self.registration.showNotification(m.title, {
    body: m.body || '', tag: m.tag, renotify: !!m.renotify, data: { url: m.url || '/' }, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
  });
}

const REMINDERS = 'https://sagandzuri-reminders.mr-gabunia.workers.dev';
const declineCall = (d) =>
  fetch(`${REMINDERS}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).catch(() => {});

// A tap on a prayer reminder focuses the open site and opens that prayer, or opens the site.
// A group reminder opens its page (/?prayer=kathisma-8, /?open=psalter …).
self.addEventListener('notificationclick', (event) => {
  const prayerId = event.notification.data && event.notification.data.prayerId;
  const answer = event.notification.data && event.notification.data.answer;
  // a ring's „პასუხი“ opens the app on the call itself; a tap on the notice, its chat with the ringing screen
  const url = event.action === 'answer' && answer ? answer : event.notification.data && event.notification.data.url;
  const decline = event.notification.data && event.notification.data.decline;
  event.notification.close();
  // „უარი“ on a ring: the call ends (a class's call only stops ringing); the site stays closed
  if (event.action === 'decline') {
    if (decline) event.waitUntil(declineCall(decline));
    return;
  }
  if (url) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const client = clients[0];
        if (client) {
          client.postMessage({ type: 'open-url', url });
          return client.focus();
        }
        return self.clients.openWindow(url);
      })
    );
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients[0];
      if (client) {
        if (prayerId) client.postMessage({ type: 'open-prayer', prayerId });
        return client.focus();
      }
      return self.clients.openWindow(prayerId ? '/?prayer=' + encodeURIComponent(prayerId) : '/');
    })
  );
});

// ---- „გაზიარება → საგანძური“ (the Android app's share target, manifest share_target) ----------------------------
// Another app shares a recording or a text: Chrome posts it here as a form. It waits in the cache 'sg-share' until the
// page (components/app/ShareHost.tsx) picks a class chat for it; the page opens at /?open=share.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return;
  event.respondWith((async () => {
    const form = await event.request.formData();
    const cache = await caches.open('sg-share');
    await Promise.all((await cache.keys()).map((k) => cache.delete(k)));
    const file = form.get('audio');
    const text = [form.get('title'), form.get('text'), form.get('url')].filter((x) => typeof x === 'string' && x.trim()).join('\n');
    if (file && typeof file !== 'string' && file.size) {
      await cache.put('/share/audio', new Response(file, { headers: { 'Content-Type': file.type || 'audio/mpeg', 'X-Name': encodeURIComponent(file.name || '') } }));
    }
    if (text) await cache.put('/share/text', new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    return Response.redirect('/?open=share', 303);
  })());
});
