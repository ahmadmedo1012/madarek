/**
 * r162 → r172a — UX cohesion regression pins.
 *
 * r162 shipped three contracts as one transition story (the landing
 * world's front door). r172a re-grounded the landing on the platform's
 * two-theme system and RETIRED the first of them:
 *
 * R1 (r162) — landing boot ground — RETIRED by r172a: the landing no
 *      longer paints a private Orbit Ink stage; it is a first-class
 *      two-theme surface grounded on the canonical var(--bg) (the
 *      --ln-* family remaps per data-theme in tokens.css), so
 *      body/splash/landing paint ONE ground from the first styled
 *      frame and there is no world-crossing flash left to own. The
 *      whole html[data-landing-boot] machinery (index.html heuristic
 *      + #252A3E theme-color override, App.tsx useLandingBootGround,
 *      polish.css boot rules) is deleted — pinned ABSENT below.
 *
 * R2 (r162) — auth chunk warm-up: the landing idle-prefetches the
 *      AuthPage dynamic import (PROD only) so the #1 public CTA
 *      navigates with the chunk warm. UNCHANGED by r172a — still
 *      pinned.
 *
 * R3 (r162) — content-mount fade: the page-enter animation targets
 *      `.content-inner > *` (the content child). UNCHANGED — pinned.
 *
 * r172a pins (the two-theme landing):
 *   §1 token theme-flip resolution (tokens.css on disk, both blocks)
 *   §2 canonical-accent CTA + skip-link (landing.css)
 *   §3 focus-ring unification (the private :focus-visible language gone)
 *   §4 grain polarity (black noise in light)
 *   §5 scene vars in the landing TSX (no frozen cream rgba literals)
 *   §6 OrbitScene theme-following contract (pure-function parts +
 *      the MutationObserver wiring on disk)
 *   §7 boot-hack absence (end-to-end)
 *   §8 ThemeToggle presence (rendered guest DOM: header + mobile row)
 *
 * Part A (jsdom) pins the warm-up's PROD gating + the rendered
 * ThemeToggle contracts. Part B (fs) pins the CSS/token/bootstrap
 * contracts on disk (landing-scrollspy-grain.test.ts's stripComments
 * pattern).
 */
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync, existsSync as existsSyncRaw } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { queryClient } from '../../src/lib/queryClient';
import { useThemeStore } from '../../src/stores/theme.store';
import LandingPage from '../../src/pages/LandingPage';

/* JourneyLightPath + CollegeConstellation boot ResizeObservers jsdom
 * doesn't ship — the same per-file stub landing-funnel.test.tsx uses. */
beforeAll(() => {
  if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const existsSyncP = (p: string) => existsSyncRaw(path.join(root, p));
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a selector pin. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/* ═══ Part A — rendered contracts (jsdom) ═══════════════════════════ */

/* ── r172a §8 — ThemeToggle presence: header + labeled mobile row ── */

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderLanding() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('r172a §8 — the landing carries the REAL theme control', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'dark', modeUpdatedAt: 0 });
    window.localStorage.clear();
  });
  afterEach(() => {
    useThemeStore.setState({ mode: 'dark', modeUpdatedAt: 0 });
    document.documentElement.removeAttribute('data-theme');
  });

  it('the shared ThemeToggle mounts in the landing header (فاتح · داكن · تلقائي)', () => {
    const { container } = renderLanding();
    const headerToggle = container.querySelector<HTMLDivElement>(
      '.fo-header-actions .theme-toggle',
    );
    expect(headerToggle).not.toBeNull();
    expect(headerToggle?.getAttribute('aria-label')).toBe('السمة');
    for (const label of ['فاتح', 'داكن', 'تلقائي']) {
      expect(within(headerToggle as HTMLElement).getByRole('button', { name: label }));
    }
  });

  it('the mobile menu carries the LABELED theme row (المظهر) with its own toggle', () => {
    const { container } = renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const row = container.querySelector('.fo-mobile-theme');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('المظهر');
    expect(row?.querySelector('.theme-toggle')).not.toBeNull();
  });

  it('flipping the header toggle flips data-theme AND persists to the shared store', () => {
    const { container } = renderLanding();
    const headerToggle = container.querySelector('.fo-header-actions .theme-toggle') as HTMLElement;
    act(() => {
      fireEvent.click(within(headerToggle).getByRole('button', { name: 'فاتح' }));
    });
    // useThemeSync (mounted by the page) applies the resolved theme…
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    // …and the SHARED store carries the choice (no second theme state
    // anywhere — this is the same madarek-theme store the shell reads).
    expect(useThemeStore.getState().mode).toBe('light');
    // The persist layer wrote the serialized state to ITS storage
    // surface (the store captured the polyfill at import time — read
    // it through the store's own persist API, not window.localStorage,
    // which the global setup re-installs per test).
    const storage = useThemeStore.persist.getOptions().storage;
    const raw = storage ? storage.getItem('madarek-theme') : null;
    // (the persist surface may hand back the serialized string or its
    // parsed shape — both carry the mode choice)
    expect(JSON.stringify(raw)).toContain('"mode":"light"');
    // flip back through the same control — dark round-trips too
    act(() => {
      fireEvent.click(within(headerToggle).getByRole('button', { name: 'داكن' }));
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('the mobile theme row does NOT close the menu (stopPropagation contract)', () => {
    const { container } = renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const row = container.querySelector('.fo-mobile-theme') as HTMLElement;
    act(() => {
      fireEvent.click(within(row).getByRole('button', { name: 'فاتح' }));
    });
    // the menu's own click-to-close contract must not eat a theme flip —
    // the visitor may want to try both looks before navigating.
    expect(container.querySelector('.fo-mobile-menu')).not.toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

/* ── r162 R2 — AuthPage warm-up from the landing (UNCHANGED) ─────── */

describe('r162 R2 — the landing warms the AuthPage chunk (PROD, idle)', () => {
  // jsdom has no requestIdleCallback → the effect's setTimeout(2500)
  // fallback is what fires; fake timers drive it deterministically.
  const OriginalRO = (window as unknown as { ResizeObserver?: unknown }).ResizeObserver;
  class MockResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  let authModuleRequested: { count: number };
  let landingPage: typeof import('../../src/pages/LandingPage');

  beforeEach(async () => {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
    vi.resetModules();
    vi.useFakeTimers();
    authModuleRequested = { count: 0 };
    vi.doMock('../../src/pages/AuthPage', () => {
      authModuleRequested.count += 1;
      return { default: () => <div data-testid="auth-page" /> };
    });
    // The landing's own module is re-imported AFTER doMock so the
    // dynamic import inside its effect resolves the counting mock.
    vi.doMock('../../src/pages/LandingPage', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/pages/LandingPage')>();
      return actual;
    });
    landingPage = await import('../../src/pages/LandingPage');
  });

  afterEach(() => {
    if (OriginalRO === undefined) delete (window as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    else (window as unknown as { ResizeObserver: unknown }).ResizeObserver = OriginalRO;
    vi.useRealTimers();
    vi.doUnmock('../../src/pages/AuthPage');
    vi.doUnmock('../../src/pages/LandingPage');
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('DEV/TEST never warms — no idle network work outside production', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <landingPage.default />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(authModuleRequested.count).toBe(0);
  });

  it('PROD warms the exact AuthPage dynamic import once, on idle', async () => {
    vi.stubEnv('PROD', true);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <landingPage.default />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // The effect's fallback timer is 2500ms; the idle timeout budget
    // is 4000ms. Firing the timeout path deterministically:
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(authModuleRequested.count).toBe(1);
  });
});

/* ═══ Part B — on-disk contracts (CSS + tokens + bootstrap) ════════ */

/* ── r197 §1 tombstone — the --ln-* Orbit Ink family is RETIRED ──── */

describe('r197 — the landing scene family is retired from tokens.css', () => {
  const tokens = read('src/styles/tokens.css');
  const live = stripComments(tokens);

  it('no --ln-* definitions remain (family deleted r197; BLUEPRINT §8 rebuilds the landing in stage 2)', () => {
    expect(live).not.toMatch(/--ln-[\w-]+\s*:/);
  });

  it('no --stage-*/--aura-*/--glow-* definitions remain (the r195 stage/aura/glow register retired r197)', () => {
    expect(live).not.toMatch(/--stage-[\w-]+\s*:/);
    expect(live).not.toMatch(/--aura-[\w-]+\s*:/);
    expect(live).not.toMatch(/--glow-[\w-]+\s*:/);
  });

  it('the r172a ink-stage hexes stay dead', () => {
    // (comment-stripped: tombstone prose legitimately quotes the
    // retired hexes while documenting the retirement)
    expect(live).not.toContain('#252A3E');
    expect(live).not.toContain('#1C2032');
  });
});

/* ── r172a §2 — canonical-accent CTA + skip-link (landing.css) ───── */

describe('r172a §2 → r188 — the landing CTA rides the canonical accent pair', () => {
  const css = stripComments(read('src/styles/landing.css'));

  it('the folio landing declares NO landing-private CTA colors — .btn.accent/.btn.primary ARE the recipes', () => {
    // r188: the hero/finale primary is the app's own .btn.accent and the
    // header/mobile primary is .btn.primary (components.css recipes) —
    // the landing re-declares neither background nor color for any
    // button (no .ln-btn-gold-style private CTA sheet exists anymore).
    for (const sel of ['.fo-hero-cta', '.fo-cta-actions', '.fo-header-actions .btn', '.fo-mobile-menu .btn']) {
      const ruleRe = new RegExp(`${sel.replace(/\./g, '\\.')}(?![\\w-])[^{]*\\{[^}]*\\}`, 'g');
      for (const rule of css.match(ruleRe) ?? []) {
        expect(rule, `${sel} must not paint a private CTA color`).not.toMatch(/background\s*:/);
      }
    }
  });

  it('no CTA rule paints the retired lime roster — the space palette is gone', () => {
    for (const sel of ['.btn.accent', '.btn.primary']) {
      const ruleRe = new RegExp(`\\.landing ${sel.replace('.', '\\.')}(?![\\w-])[^{]*\\{[^}]*\\}`, 'g');
      for (const rule of css.match(ruleRe) ?? []) {
        expect(rule).not.toContain('var(--ln-lime');
      }
    }
    // …and the sheet never consumes the scene inks at all.
    expect(css).not.toMatch(/var\(--ln-(cream|lime|violet)/);
  });

  it('the skip-link joins the accent family', () => {
    const at = css.indexOf('.fo-skip-link {');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('background: var(--accent)');
    expect(body).toContain('color: var(--accent-fg)');
  });

  it('the landing CTA markup consumes the canonical classes (no private CTA class)', () => {
    const tsx = read('src/pages/LandingPage.tsx');
    expect(tsx).toContain('btn accent lg fo-hero-cta');
    expect(tsx).toContain('btn primary sm');
    expect(tsx).not.toContain('ln-btn-gold');
  });
});

/* ── r172a §3 — one focus language (the private ring is gone) ─────── */

describe('r172a §3 — the landing\'s private :focus-visible sub-language is deleted', () => {
  const css = stripComments(read('src/styles/landing.css'));

  it('no :focus-visible rule in landing.css writes an outline', () => {
    const rules = css.match(/[^{}]*:focus-visible[^{}]*\{[^}]*\}/g) ?? [];
    // r190: the sheet now carries ZERO :focus-visible rules — all
    // focus behavior (visibility included, via the token routing)
    // is delegated to the universal language in base.css. Zero is
    // the purest form of "no private sub-language"; if a future
    // behavior (scale-pop/reveal) needs a rule, it still may not
    // write an outline — the loop below stays the enforcement.
    expect(rules.length).toBe(0);
    for (const rule of rules) {
      expect(rule).not.toMatch(/outline(-color)?:/);
    }
  });

  it('the universal cream-outline rule + the CTA ring-swap overrides are gone', () => {
    expect(css).not.toMatch(/\.landing\s+:focus-visible\s*\{/);
    expect(css).not.toMatch(/\.ln-btn-ghost:focus-visible/);
    expect(css).not.toContain('outline: 2px solid var(--ln-cream)');
    // r188: every folio focus ring IS the product outline token — no
    // private focus color anywhere in the sheet.
    expect(css).not.toMatch(/outline-color:/);
  });
});

/* ── r172a §4 — grain polarity follows the theme ──────────────────── */

describe('r172a §4 → r188 — the grain veil is retired with the Orbit-Ink world', () => {
  const css = stripComments(read('src/styles/landing.css'));

  it('no grain layer exists in the folio sheet (clean paper world)', () => {
    expect(css).not.toContain('.ln-grain');
    expect(css).not.toMatch(/--ln-grain-op/);
    expect(css).not.toMatch(/feColorMatrix/);
  });
});

/* ── r172a §5 — scene vars in the landing TSX ─────────────────────── */

describe('r172a §5 → r198 — the Orbit-Ink scene components are retired', () => {
  it('the canvas/scene components are gone from the tree (poster = vector figure, no canvas)', () => {
    for (const f of ['OrbitScene.tsx', 'HeroDepthLayer.tsx', 'CollegeConstellation.tsx', 'JourneyLightPath.tsx']) {
      const p = `src/components/landing/${f}`;
      expect(existsSyncP(p), `${f} must stay deleted (r188)`).toBe(false);
    }
    // r198 (stage 2): TestimonialSection (rendered null since r188 —
    // external testimonials blocked on real consent) is deleted with
    // the folio world; the poster lands Constellation.tsx instead.
    expect(existsSyncP('src/components/landing/TestimonialSection.tsx')).toBe(false);
    expect(existsSyncP('src/components/landing/KnowledgeMap.tsx')).toBe(false);
    expect(existsSyncP('src/components/landing/OrbitPath.tsx')).toBe(false);
  });
});

/* ── r172a §6 — OrbitScene theme contract (pure-function parts) ──── */

describe('r172a §6 → r188 — the OrbitScene theme contract retired with the component', () => {
  it('no landing TSX reads --ln-* scene tokens (the folio is canonical-token only)', () => {
    const tsx = read('src/pages/LandingPage.tsx');
    expect(tsx).not.toMatch(/--ln-/);
  });
});

/* ── r172a §7 — boot-hack absence (end-to-end) ────────────────────── */

describe('r172a §7 — the html[data-landing-boot] machinery is retired end-to-end', () => {
  it('index.html: no boot heuristic, no #252A3E theme-color override, theme-only observer', () => {
    const index = stripComments(read('index.html'));
    expect(index).not.toContain('data-landing-boot');
    expect(index).not.toContain('#252A3E');
    expect(index).not.toContain("localStorage.getItem('mdrk-auth')");
    expect(index).toContain("attributeFilter: ['data-theme']");
    // the theme bootstrap itself still resolves the theme pre-paint
    expect(index).toContain("setAttribute('data-theme', resolved)");
  });

  it('App.tsx: the useLandingBootGround React owner is gone', () => {
    const app = stripComments(read('src/App.tsx'));
    expect(app).not.toContain('useLandingBootGround');
    expect(app).not.toContain('data-landing-boot');
  });

  it('polish.css: no boot-ground override rules (body/splash keep their own var(--bg))', () => {
    const polish = stripComments(read('src/styles/polish.css'));
    expect(polish).not.toMatch(/html\[data-landing-boot\]/);
  });
});

/* ── r162 R3 — content-mount fade (UNCHANGED by r172a) ───────────── */

describe('r162 R3 — content-mount fade (CSS)', () => {
  const polish = stripComments(read('src/styles/polish.css'));

  it('page-enter targets the content CHILD — every content mount fades', () => {
    expect(polish).toMatch(
      /\.content-inner > \*\s*\{\s*animation:\s*page-enter var\(--motion-duration-short\) var\(--ease-out\) both;/,
    );
  });

  it('the old container-level page-enter rule is gone (no double fade)', () => {
    expect(polish).not.toMatch(/\.content-inner\s*\{[^}]*animation:/);
  });

  it('reduced-motion kills the child-level entrance too', () => {
    expect(polish).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.content-inner > \* \{ animation: none; \}/,
    );
  });
});
