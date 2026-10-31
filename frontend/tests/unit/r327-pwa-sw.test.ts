/**
 * r327-pwa-sw.test.ts — E2 (P5) PWA gates: the service worker's
 * honest-pilot contract, pinned as source text so a future edit can't
 * silently drop a strategy (the SW has no jsdom harness — the offline
 * behaviour itself was proven live against the production build: the
 * sw-probe run in the E2 worklog shows precache + font cache-first +
 * the offline-shell navigation fallback all working under
 * context.setOffline(true)).
 *
 *   1. Navigations: network-first, /offline.html as the fallback —
 *      never a cached stale page (student data must not lie).
 *   2. /api/** is NEVER intercepted — freshness belongs to React
 *      Query, not the cache.
 *   3. Cache-first belt: /assets/* (Vite content-hashed, immutable)
 *      + the STABLE static files (/fonts/*.woff2, /brand/*,
 *      /favicon.svg) — without the fonts an offline shell rendered
 *      in system fonts, losing the paper/ink voice.
 *   4. Periodic purge: the ASSET_CACHE is capped (ASSET_CACHE_CAP)
 *      and evicted oldest-first on activate — hashed litter only
 *      grows between VERSION bumps otherwise.
 *   5. Registration is PRODUCTION-ONLY and never blocks dev
 *      (import.meta.env.PROD in main.tsx — r323 B6 seat).
 *
 * Pure fs assertions — no browser, no network.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(FRONTEND, p), 'utf8');

describe('r327 E2 — the honest pilot service worker contract', () => {
  const sw = read('public/sw.js');

  it('navigations stay network-first with the offline shell as the fallback', () => {
    expect(sw).toContain("req.mode === 'navigate'");
    expect(sw).toContain("fetch(req)");
    // the fallback reads the offline shell from the STATIC cache —
    // never a cached copy of the page itself
    expect(sw).toContain("cache.match('/offline.html')");
    expect(sw).toContain("new Response('offline', { status: 503 })");
  });

  it('API responses are never intercepted (freshness belongs to the app layer)', () => {
    expect(sw).toContain("url.pathname.startsWith('/api/')");
  });

  it('cache-first covers the hashed build assets AND the stable static files', () => {
    expect(sw).toContain("url.pathname.startsWith('/assets/')");
    // the r327 E2 belt: self-hosted fonts + brand marks + favicon ride
    // cache-first too (stable filenames — a cached copy is the right copy)
    expect(sw).toContain("'/fonts/'");
    expect(sw).toContain("'/brand/'");
    expect(sw).toContain("'/favicon.svg'");
  });

  it('the asset cache is capped and purged oldest-first (periodic cleanup)', () => {
    expect(sw).toMatch(/ASSET_CACHE_CAP\s*=\s*\d+/);
    expect(sw).toContain('keys.length > ASSET_CACHE_CAP');
    expect(sw).toContain('assets.delete(key)');
  });

  it('the offline shell + brand marks are precached at install', () => {
    expect(sw).toContain("'/offline.html'");
    expect(sw).toContain("'/manifest.webmanifest'");
    expect(sw).toContain("'/brand/icon-192.png'");
    expect(sw).toContain("'/brand/icon-512.png'");
  });

  it('the offline shell exists on disk and speaks Arabic with a reload action', () => {
    const html = read('public/offline.html');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('لا يوجد اتصال');
    expect(html).toContain('location.reload()');
    // the paper/ink palette (no shadows, square corners — the boot plate's
    // exact ground/ink pair)
    expect(html).toContain('background: #F6F6EE');
    expect(html).toContain('color: #282828');
    expect(html).toContain('border-radius: 0');
  });
});

describe('r327 E2 — SW registration seat (main.tsx)', () => {
  it('registers /sw.js under import.meta.env.PROD only — dev stays SW-free', () => {
    const main = read('src/main.tsx');
    expect(main).toContain("import.meta.env.PROD && 'serviceWorker' in navigator");
    expect(main).toContain("register('/sw.js')");
  });

  it('index.html links the manifest (the installable identity)', () => {
    const html = read('index.html');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });
});
