// Loaded into the PWA service worker (vite.config.ts → workbox.importScripts).

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
// the clock tells which hour is coming and how long is left.
self.addEventListener('push', (event) => {
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

// A tap on a prayer reminder focuses the open site and opens that prayer, or opens the site.
self.addEventListener('notificationclick', (event) => {
  const prayerId = event.notification.data && event.notification.data.prayerId;
  event.notification.close();
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
