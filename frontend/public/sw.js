/*
 * sw.js — r323 B6 — the honest pilot service worker.
 *
 * Scope (deliberately small):
 *  - PRECACHE: the offline shell + the brand marks (small, stable).
 *  - Hashed build assets (/assets/*): cache-first — Vite emits
 *    CONTENT-HASHED immutable filenames, so a hit is always correct
 *    and a miss fetches once.
 *  - Stable static files (/fonts/*.woff2, /brand/*, /favicon.svg):
 *    cache-first too (r327 E2 · P5) — self-hosted fonts and brand
 *    marks carry STABLE filenames that only move with a deploy, so
 *    a cached copy is the right copy. Without this belt an offline
 *    navigation rendered the cached shell in system fonts — the
 *    paper/ink voice needs the real Plex faces. These ride the same
 *    versioned STATIC_CACHE as the precache: a VERSION bump flushes
 *    them together.
 *  - Navigations: network-first with the offline shell as the honest
 *    fallback («لا يوجد اتصال»).
 *  - Everything else (API calls!): the network, untouched — student
 *    data is never served stale from here.
 *  - Periodic purge (r327 E2 · P5): the ASSET_CACHE is capped — on
 *    every activate, entries beyond ASSET_CACHE_CAP are evicted
 *    oldest-first (Cache.keys() returns insertion order in Chromium;
 *    best-effort FIFO, honest enough for build-asset litter).
 * Updates: a new SW activates immediately (skipWaiting) + tells the
 * clients (CONTENTS_UPDATED) so the app can toast «نسخة جديدة».
 */
const VERSION = 'r327-e2-1';
const STATIC_CACHE = `madarek-static-${VERSION}`;
const ASSET_CACHE = `madarek-assets-${VERSION}`;

/** Cap for the hashed-build-assets cache. A full build emits ~120
 *  chunk files; a visitor touches a fraction of them. 120 keeps a
 *  whole session's working set while bounding long-lived litter. */
const ASSET_CACHE_CAP = 120;

const PRECACHE = [
  '/offline.html',
  '/brand/madarek-mark.svg',
  '/brand/icon-192.png',
  '/brand/icon-512.png',
  '/manifest.webmanifest',
];

/** Stable, non-hashed static files: cache-first at runtime. */
const STATIC_PREFIXES = ['/fonts/', '/brand/'];
const STATIC_FILES = ['/favicon.svg'];

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
      // Periodic purge — evict the oldest cached build assets beyond
      // the cap so a long-lived install doesn't hoard every chunk it
      // ever fetched (hashes are unique per build; litter only grows).
      const assets = await caches.open(ASSET_CACHE);
      const keys = await assets.keys();
      if (keys.length > ASSET_CACHE_CAP) {
        for (const key of keys.slice(0, keys.length - ASSET_CACHE_CAP)) {
          await assets.delete(key);
        }
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

  const isStatic =
    STATIC_PREFIXES.some((p) => url.pathname.startsWith(p)) ||
    STATIC_FILES.includes(url.pathname);

  // Hashed build assets + stable static files: cache-first.
  // (/assets/* → ASSET_CACHE, capped+purged; /fonts, /brand, favicon →
  //  STATIC_CACHE, flushed wholesale on the next VERSION bump.)
  if (url.pathname.startsWith('/assets/') || isStatic) {
    const cacheName = url.pathname.startsWith('/assets/') ? ASSET_CACHE : STATIC_CACHE;
    event.respondWith(
      (async () => {
        const cache = await caches.open(cacheName);
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
