/*
 * sw.js — r323 B6 — the honest pilot service worker.
 *
 * Scope (deliberately small):
 *  - PRECACHE: the offline shell + the brand marks (small, stable).
 *  - /assets/*: cache-first — Vite emits CONTENT-HASHED immutable
 *    filenames, so a hit is always correct and a miss fetches once.
 *  - navigations: network-first with the offline shell as the honest
 *    fallback («لا يوجد اتصال»).
 *  - everything else (API calls!): the network, untouched — student
 *    data is never served stale from here.
 * Updates: a new SW activates immediately (skipWaiting) + tells the
 * clients (CONTENTS_UPDATED) so the app can toast «نسخة جديدة».
 */
const VERSION = 'r324-p0-1';
const STATIC_CACHE = `madarek-static-${VERSION}`;
const ASSET_CACHE = `madarek-assets-${VERSION}`;

const PRECACHE = [
  '/offline.html',
  '/brand/madarek-mark.svg',
  '/brand/icon-192.png',
  '/brand/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, ASSET_CACHE]);
      for (const name of await caches.keys()) {
        if (!keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.postMessage({ type: 'CONTENTS_UPDATED', version: VERSION });
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // API responses are NEVER cached here — the app's React Query layer
  // owns freshness; a stale grade list would be a lie.
  if (url.pathname.startsWith('/api/')) return;

  // Hashed build assets: cache-first (immutable by construction).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Navigations: network-first, offline shell as the honest fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          return (await cache.match('/offline.html')) ?? new Response('offline', { status: 503 });
        }
      })(),
    );
  }
});
