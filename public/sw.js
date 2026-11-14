// Lightweight Bangla AI Service Worker for PWA installability
// Passes dynamic API, auth, and streaming chat traffic straight to network.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never intercept non-GET requests, API routes, or cross-origin traffic
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Transparent network pass-through so content is always fresh and never stale-cached
  event.respondWith(fetch(request));
});
