// EVACORE Service Worker - Instant Cache Buster & Asset Refresher
// Forces all mobile devices and browsers to drop stale CSS/JS bundles and load fresh SIH Evacore UI
// Cache version: v9-20260914-glassmorphism-bottomnav

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh network assets, with network-first fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
