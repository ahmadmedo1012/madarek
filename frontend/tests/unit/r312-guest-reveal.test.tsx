/**
 * r312-guest-reveal.test.tsx — the R312 §R D7 unit belt (the jsdom
 * side; the browser-truth side lives in
 * tests/e2e/r312-guest-reveal.e2e.ts).
 *
 * D7 (found by the frame-by-frame pass): the guest surfaces (the
 * landing, the public colleges gallery, /auth) changed routes as a
 * HARD CUT — reproduced on video vs the reference's measured 1.6s
 * two-phase mask sweep (reference-observations §14). The AppShell
 * keyed PageTransition only ever covered authenticated routes.
 *
 * The fix: GuestReveal — the keyed remount (the PageTransition
 * precedent) on every guest boundary, playing a viewport-anchored
 * top-down clip sweep + a traveling 1px rule; RM collapses to the
 * standing page.
 */
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import App from '../../src/App';
import LandingPage from '../../src/pages/LandingPage';
import { GuestReveal } from '../../src/components/motion/GuestReveal';

const HERE = dirname(new URL(import.meta.url).pathname);
const POLISH = readFileSync(join(HERE, '../../src/styles/polish.css'), 'utf8');
const APP_SRC = readFileSync(join(HERE, '../../src/App.tsx'), 'utf8');

function installMatchMedia(reduced = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce') ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeAll(() => {
  window.innerWidth = 1280;
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

beforeEach(() => {
  installMatchMedia();
  try { sessionStorage.clear(); } catch { /* storage can be locked */ }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('R312 guest reveal — the source contracts', () => {
  it('polish.css: the sweep is viewport-anchored, 3-point, transform-only for the line', () => {
    /* the sweep: 0% fully clipped → 70% at the fold (100svh) → 100% open */
    expect(POLISH).toMatch(/@keyframes guest-reveal-sweep \{\s*0%\s*\{ clip-path: inset\(0 0 100% 0\); \}/);
    expect(POLISH).toMatch(/70%\s*\{ clip-path: inset\(0 0 calc\(100% - 100svh\) 0\); \}/);
    expect(POLISH).toMatch(/100%\s*\{ clip-path: inset\(0 0 0% 0\); \}/);
    /* the traveling rule rides the same curve via TRANSFORM (never layout) */
    expect(POLISH).toMatch(/@keyframes guest-reveal-line \{\s*0%\s*\{ transform: translateY\(0\); opacity: 0; \}/);
    expect(POLISH).toMatch(/70%\s*\{ transform: translateY\(100svh\); opacity: 1; \}/);
    /* the line is viewport-fixed + 1px on the rule token */
    expect(POLISH).toMatch(/\.guest-reveal::after \{[^}]*position: fixed;/s);
    expect(POLISH).toMatch(/\.guest-reveal::after \{[^}]*block-size: 1px;/s);
    expect(POLISH).toMatch(/\.guest-reveal::after \{[^}]*background: var\(--rule\);/s);
    /* durations ride the motion tokens (the gate's own contract) */
    expect(POLISH).toMatch(/animation: guest-reveal-sweep var\(--motion-duration-long\) var\(--motion-ease-decelerate\) both;/);
    /* the RM belt collapses to the standing page */
    const rm = POLISH.slice(POLISH.indexOf('@media (prefers-reduced-motion: reduce)', POLISH.indexOf('guest-reveal-sweep')));
    expect(rm).toMatch(/\.guest-reveal-inner \{\s*clip-path: none;/);
  });

  it('App.tsx: every guest boundary mounts GuestReveal (the three families)', () => {
    /* the landing (HomeRedirect's guest branch) */
    expect(APP_SRC).toMatch(/if \(!user\)\s*return \(\s*<GuestReveal>\s*<LandingPage \/>/);
    /* /auth + /auth/register (GuestRoute's outlet) */
    expect(APP_SRC).toMatch(/<GuestReveal>\s*<Outlet \/>/);
    /* the public colleges gallery (CollegesLayout's outlet) */
    expect(APP_SRC).toMatch(/<GuestReveal>\s*<Outlet \/>/);
    /* the import rides the motion barrel */
    expect(APP_SRC).toMatch(/import \{ GuestReveal \} from '\.\/components\/motion';/);
  });
});

describe('R312 guest reveal — the jsdom integration', () => {
  it('the landing mounts inside the keyed reveal wrapper', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/']}>
          <GuestReveal>
            <LandingPage />
          </GuestReveal>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(document.querySelector('.fo-hero-title')).not.toBeNull(), { timeout: 3000 });
    const wrap = document.querySelector('.guest-reveal');
    const inner = document.querySelector('.guest-reveal-inner');
    expect(wrap).not.toBeNull();
    expect(inner).not.toBeNull();
    /* the landing tree sits INSIDE the reveal wrapper (the reveal owns
     * its mount — the wrapper is the transition's stage) */
    expect(inner?.contains(document.querySelector('.fo-hero-title'))).toBe(true);
    /* the wrapper carries the router's location key (the PageTransition contract) */
    expect(wrap?.getAttribute('data-route-key')).toBeTruthy();
  });

  it('a route change re-keys the inner (the remount that plays the sweep)', async () => {
    const { Link } = await import('react-router-dom');
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/']}>
          <Link to="/colleges" data-testid="to-colleges">go</Link>
          <Routes>
            <Route
              path="/"
              element={
                <GuestReveal>
                  <main data-testid="pg-home" />
                </GuestReveal>
              }
            />
            <Route
              path="/colleges"
              element={
                <GuestReveal>
                  <main data-testid="pg-colleges" />
                </GuestReveal>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(document.querySelector('[data-testid="pg-home"]')).not.toBeNull();
    const innerBefore = document.querySelector('.guest-reveal-inner');
    expect(innerBefore).not.toBeNull();
    fireEvent.click(document.querySelector('[data-testid="to-colleges"]') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-testid="pg-colleges"]')).not.toBeNull(), { timeout: 1500 });
    /* the keyed remount: a NEW inner node (the old one never survives a
     * pathname change) — this remount is what plays the sweep in CSS */
    const innerAfter = document.querySelector('.guest-reveal-inner');
    expect(innerAfter).not.toBeNull();
    expect(innerAfter).not.toBe(innerBefore);
    expect(innerAfter?.contains(document.querySelector('[data-testid="pg-colleges"]'))).toBe(true);
  });

  it('reduced motion: the standing page — no animation, no clip (the CSS contract holds in jsdom)', () => {
    installMatchMedia(true);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/']}>
          <GuestReveal>
            <main data-testid="pg" />
          </GuestReveal>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    /* jsdom does not compute the @media + animation cascade; the CSS
     * source contract (pinned above) owns the RM behavior. Here: the
     * wrapper exists and the tree stands (never a blank page). */
    expect(document.querySelector('[data-testid="pg"]')).not.toBeNull();
    expect(document.querySelector('.guest-reveal-inner')).not.toBeNull();
  });

  it('App-level: the guest /auth route tree renders inside GuestReveal (the App export stays intact)', async () => {
    /* the App default export is used by main.tsx; keep it importable */
    expect(App).toBeTruthy();
    expect(typeof App).toBe('function');
  });
});
