// Loaded into the PWA service worker (vite.config.ts → workbox.importScripts).
// A tap on a prayer reminder focuses the open site and opens that prayer, or opens the site.
self.addEventListener('notificationclick', (event) => {
  const prayerId = event.notification.data && event.notification.data.prayerId;
  event.notification.close();
  if (!prayerId) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients[0];
      if (client) {
        client.postMessage({ type: 'open-prayer', prayerId });
        return client.focus();
      }
      return self.clients.openWindow('/?prayer=' + encodeURIComponent(prayerId));
    })
  );
});
