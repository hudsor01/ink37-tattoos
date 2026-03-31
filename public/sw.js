/**
 * Ink37 Tattoos -- Shell-Only Service Worker
 *
 * VERSIONING STRATEGY:
 * - Cache name includes a version suffix (e.g., 'ink37-shell-v1').
 * - When deploying changes that affect cached assets, increment the
 *   version number (e.g., v1 -> v2).
 * - The activate handler automatically deletes old caches when a
 *   new version is installed.
 * - skipWaiting() ensures the new SW takes over immediately.
 * - clients.claim() ensures all open tabs use the new SW.
 *
 * This is intentionally simple. For advanced strategies (e.g.,
 * build-hash-based caching), consider migrating to Serwist.
 */
const CACHE_NAME = 'ink37-shell-v1';

const SHELL_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
