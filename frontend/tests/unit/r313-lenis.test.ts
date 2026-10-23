/**
 * r313-lenis.test.ts — the 4-b (D6) scroll-engine belt.
 *
 * Pins the guest smooth-scroll integration end to end, against the
 * MEASURED Heron spec (audits/evidence/r313/reference/digest.json →
 * `scroll`):
 *
 *   · Lenis 1.1.5, lerp 0.1 (lerp mode, duration undefined), the
 *     default easing, wheelMultiplier 1, touchMultiplier 1,
 *     smoothWheel true, syncTouch true, smoothTouch false,
 *     infinite false — on the WINDOW (owner decision), driven by the
 *     shared motion conductor;
 *   · reduced-motion NEVER initializes (native scroll under RM);
 *   · init/destroy lifecycle + the html engine chrome markers;
 *   · the 150ms scroll-quiet idle marker (Heron's contract);
 *   · the zero-idle property: the conductor holds ZERO subscribers
 *     while the page sits still, and the driver attaches on input;
 *   · base.css: scroll-behavior:smooth gone (the D6 pin — grep zero on
 *     guest pages across both html-level sheets, base + polish), the
 *     engine's scrollbar-hiding rules present;
 *   · App.tsx wires the mount + the engine-aware reset;
 *   · the landing's mobile menu carries data-lenis-prevent.
 *
 * Pure fs assertions follow the landing-scrollspy-grain/assets pattern;
 * lifecycle specs run against real jsdom + a ResizeObserver stub (the
 * pattern from r311-cursor-ownership — Lenis's Dimensions observer).
 */
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  HERON_LENIS_PARAMS,
  getLenis,
  initGuestLenis,
  destroyGuestLenis,
  isGuestLenisOn,
} from '../../src/lib/motion/sheetLenis';
import { sheetSubscriberCount } from '../../src/lib/motion/sheetConductor';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a pin. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── jsdom plumbing (r311-cursor-ownership pattern) ───────────────── */

function installMatchMedia({ reduced = false }: { reduced?: boolean } = {}) {
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
  /* Lenis's Dimensions attaches a ResizeObserver — jsdom ships none. */
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
  destroyGuestLenis();
});

afterEach(() => {
  destroyGuestLenis();
  vi.restoreAllMocks();
});

/* ═══ the measured Heron params ════════════════════════════════════ */

describe('r313 4-b — Heron\'s measured Lenis params', () => {
  it('exports the engine surface', async () => {
    const mod = await import('../../src/lib/motion/sheetLenis');
    expect(mod.HERON_LENIS_PARAMS).toBeTruthy();
    expect(mod.getLenis).toBeInstanceOf(Function);
    expect(mod.initGuestLenis).toBeInstanceOf(Function);
    expect(mod.destroyGuestLenis).toBeInstanceOf(Function);
    expect(mod.isGuestLenisOn).toBeInstanceOf(Function);
  });

  it('HERON_LENIS_PARAMS matches the digest scroll section', () => {
    // R313 override: smooth → Lenis (owner decision) — the pinned curve:
    expect(HERON_LENIS_PARAMS.lerp).toBe(0.1);
    expect(HERON_LENIS_PARAMS.duration).toBeUndefined();
    expect(HERON_LENIS_PARAMS.smoothWheel).toBe(true);
    expect(HERON_LENIS_PARAMS.syncTouch).toBe(true);
    expect(HERON_LENIS_PARAMS.smoothTouch).toBe(false);
    expect(HERON_LENIS_PARAMS.infinite).toBe(false);
    expect(HERON_LENIS_PARAMS.wheelMultiplier).toBe(1);
    expect(HERON_LENIS_PARAMS.touchMultiplier).toBe(1);
    // the 1.1.5 default easing, restated: min(1, 1.001 - 2^(-10t))
    expect(typeof HERON_LENIS_PARAMS.easing).toBe('function');
    const easing = HERON_LENIS_PARAMS.easing as (t: number) => number;
    expect(easing(0)).toBeCloseTo(0.001, 6);
    expect(easing(1)).toBe(1);
  });

  it('the live instance resolves the same effective options on window', () => {
    expect(initGuestLenis()).toBe(true);
    const engine = getLenis();
    expect(engine).toBeTruthy();
    expect(engine?.options.lerp).toBe(0.1);
    expect(engine?.options.duration).toBeUndefined();
    expect(engine?.options.smoothWheel).toBe(true);
    expect(engine?.options.syncTouch).toBe(true);
    // smoothTouch is asserted on HERON_LENIS_PARAMS only: Lenis 1.1.5
    // DROPPED the key (touch smoothing is syncTouch alone — verified in
    // node_modules/lenis/dist/lenis.js); Heron still passes it literally
    // from its older config, so the param travels in the spec but never
    // lands in the resolved options.
    expect(engine?.options.infinite).toBe(false);
    expect(engine?.options.wheelMultiplier).toBe(1);
    expect(engine?.options.touchMultiplier).toBe(1);
    expect(engine?.options.wrapper).toBe(window);
    expect(engine?.options.content).toBe(document.documentElement);
    expect(engine?.rootElement).toBe(document.documentElement);
  });
});

/* ═══ lifecycle + guards ════════════════════════════════════════════ */

describe('r313 4-b — init/destroy lifecycle', () => {
  it('reduced motion NEVER initializes — native scroll under RM', () => {
    installMatchMedia({ reduced: true });
    expect(initGuestLenis()).toBe(false);
    expect(getLenis()).toBeNull();
    expect(isGuestLenisOn()).toBe(false);
    expect(document.documentElement.hasAttribute('data-lenis-on')).toBe(false);
  });

  it('init is idempotent; destroy restores <html> exactly', () => {
    expect(initGuestLenis()).toBe(true);
    const first = getLenis();
    expect(initGuestLenis()).toBe(true); // StrictMode double-invoke nets out
    expect(getLenis()).toBe(first);

    expect(document.documentElement.hasAttribute('data-lenis-on')).toBe(true);
    expect(document.documentElement.className).toContain('lenis'); // Lenis's own root class

    destroyGuestLenis();
    expect(getLenis()).toBeNull();
    expect(isGuestLenisOn()).toBe(false);
    expect(document.documentElement.hasAttribute('data-lenis-on')).toBe(false);
    expect(document.documentElement.hasAttribute('data-lenis-idle')).toBe(false);
    expect(document.documentElement.className).not.toMatch(/lenis/);
  });

  it('the zero-idle property: no conductor subscribers at rest, driver attaches on input', async () => {
    expect(initGuestLenis()).toBe(true);
    expect(sheetSubscriberCount()).toBe(0); // idle page = zero awake frames

    fireEvent.wheel(window, { deltaY: 100, deltaMode: 0 });
    expect(sheetSubscriberCount()).toBe(1); // the raf driver attached

    // jsdom has no layout → Lenis clamps to limit 0 → no glide: the
    // driver must detach itself on the next frame (self-sleeping).
    await new Promise((r) => setTimeout(r, 80));
    expect(sheetSubscriberCount()).toBe(0);

    // after destroy, input no longer touches the conductor
    destroyGuestLenis();
    fireEvent.wheel(window, { deltaY: 100, deltaMode: 0 });
    expect(sheetSubscriberCount()).toBe(0);
  });

  it('the 150ms scroll-quiet idle marker (Heron contract)', async () => {
    expect(initGuestLenis()).toBe(true);
    const html = document.documentElement;

    fireEvent.wheel(window, { deltaY: 100, deltaMode: 0 }); // activity
    expect(html.hasAttribute('data-lenis-idle')).toBe(false);

    await new Promise((r) => setTimeout(r, 240)); // > 150ms quiet
    expect(html.hasAttribute('data-lenis-idle')).toBe(true);

    fireEvent.wheel(window, { deltaY: 100, deltaMode: 0 }); // wake
    expect(html.hasAttribute('data-lenis-idle')).toBe(false);

    destroyGuestLenis();
    expect(html.hasAttribute('data-lenis-idle')).toBe(false);
  });
});

/* ═══ the D6 CSS pin ════════════════════════════════════════════════ */

describe('r313 4-b — the D6 CSS pin (scroll-behavior → Lenis)', () => {
  it('base.css carries no live scroll-behavior:smooth and keeps the RM auto belt', () => {
    const live = stripComments(read('src/styles/base.css'));
    expect(live).not.toMatch(/scroll-behavior:\s*smooth/);
    // R313 override: smooth → Lenis (owner decision)
    expect(live).toMatch(/scroll-behavior:\s*auto\s*!important/); // RM belt stays
  });

  it('polish.css (the overrides layer) drops it too — guest pages grep to zero', () => {
    const live = stripComments(read('src/styles/polish.css'));
    expect(live).not.toMatch(/scroll-behavior:\s*smooth/);
  });

  it('base.css carries the engine\'s scrollbar-hiding rules', () => {
    const live = stripComments(read('src/styles/base.css'));
    expect(live).toContain('html[data-lenis-on]');
    expect(live).toMatch(/html\[data-lenis-on\]\s*{\s*scrollbar-width:\s*none\s*!important/);
    expect(live).toMatch(/html\[data-lenis-on\]::-webkit-scrollbar\s*{\s*display:\s*none\s*!important/);
  });
});

/* ═══ the wiring contracts ═══════════════════════════════════════════ */

describe('r313 4-b — App wiring + the prevent vocabulary', () => {
  it('App.tsx mounts the engine inside the router and resets through it', () => {
    const src = read('src/App.tsx');
    expect(src).toContain('export function GuestLenisMount');
    expect(src).toMatch(/<GuestLenisMount\s*\/>/);
    expect(src).toContain('initGuestLenis()');
    expect(src).toContain('destroyGuestLenis()');
    // the engine-aware PUSH reset (in-flight glides ignore external scrollTo)
    expect(src).toContain("engine.scrollTo(0, { immediate: true })");
  });

  it('the authenticated shell surfaces are excluded by prefix', () => {
    const src = read('src/App.tsx');
    for (const p of [
      '/student', '/teacher', '/admin', '/quality', '/owner',
      '/vision', '/document', '/competitions', '/community', '/training', '/achievements',
    ]) {
      expect(src).toContain(`'${p}'`);
    }
  });

  it('the landing mobile menu carries data-lenis-prevent', () => {
    const tsx = read('src/pages/LandingPage.tsx');
    expect(tsx).toContain('data-lenis-prevent');
    const css = stripComments(read('src/styles/landing.css'));
    expect(css).toMatch(/\.fo-mobile-menu[^{]*{\s*[^}]*overflow-y:\s*auto/); // it IS an inner scroller
  });
});
