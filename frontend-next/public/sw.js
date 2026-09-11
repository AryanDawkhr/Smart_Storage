// Service Worker for Offline-First Support
const CACHE_NAME = 'smart-storage-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/scan.html',
  '/storage.html',
  '/add-produce.html',
  '/compatibility.html',
  '/live-storage.html',
  '/alerts.html',
  '/history.html',
  '/market.html',
  '/recommendation.html',
  '/profile.html',
  '/settings.html',
  '/css/style.css',
  '/css/responsive.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let API and WebSocket requests go directly to network
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/home.html');
        }
      });
    })
  );
});
