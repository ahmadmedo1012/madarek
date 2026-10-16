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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { queryClient } from '../../src/lib/queryClient';
import { parseColorTriplet, ORBIT_LIGHT_ALPHA } from '../../src/components/landing/OrbitScene';
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
      '.landing-header-cta .theme-toggle',
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
    const row = container.querySelector('.landing-mobile-theme');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('المظهر');
    expect(row?.querySelector('.theme-toggle')).not.toBeNull();
  });

  it('flipping the header toggle flips data-theme AND persists to the shared store', () => {
    const { container } = renderLanding();
    const headerToggle = container.querySelector('.landing-header-cta .theme-toggle') as HTMLElement;
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
    const row = container.querySelector('.landing-mobile-theme') as HTMLElement;
    act(() => {
      fireEvent.click(within(row).getByRole('button', { name: 'فاتح' }));
    });
    // the menu's own click-to-close contract must not eat a theme flip —
    // the visitor may want to try both looks before navigating.
    expect(container.querySelector('.landing-mobile-menu')).not.toBeNull();
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

/* ── r172a §1 — the --ln-* family resolves per theme in tokens.css ── */

describe('r172a §1 — --ln-* token theme-flip resolution (tokens.css)', () => {
  const tokens = read('src/styles/tokens.css');
  const live = stripComments(tokens);

  it('the grounds alias the canonical var(--bg) in BOTH theme blocks', () => {
    const defs = (live.match(/--ln-ink:\s*var\(--bg\)/g) ?? []).length;
    expect(defs).toBe(2); // light block + dark block
    // the fixed ink stage is gone from the family definition
    expect(live).not.toMatch(/--ln-ink:\s*#252A3E/);
  });

  it('the frozen single :root color definitions are gone (the family moved into the theme blocks)', () => {
    // the color half lived on plain :root pre-r172a; only the
    // theme-independent half (grain/radius/type/motion) may remain
    const rootBlock = live.slice(0, live.indexOf('[data-theme="dark"]'));
    const head = rootBlock.slice(0, rootBlock.indexOf(':root,\n  [data-theme="light"]'));
    for (const name of ['--ln-ink', '--ln-ink-2', '--ln-cream', '--ln-cream-dim',
      '--ln-lime', '--ln-lime-deep', '--ln-violet', '--ln-violet-deep',
      '--ln-line', '--ln-line-soft', '--ln-scene-line', '--ln-scene-soft']) {
      expect(head).not.toMatch(new RegExp(`${name}\\s*:`));
    }
    // …and the theme-independent half is still there
    expect(head).toMatch(/--ln-grain-op:\s*0\.075/);
    expect(head).toMatch(/--ln-radius-pill:/);
  });

  it('light: cream = the ink family, dim = #5F5D57 (sand-safe), ink-2 = the sand step', () => {
    const light = live.slice(0, live.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ln-cream:\s*var\(--neutral-900\)/);
    expect(light).toMatch(/--ln-cream-dim:\s*#5F5D57/);
    expect(light).toMatch(/--ln-ink-2:\s*var\(--c-sand-bg\)/);
  });

  it('light: the lime pair collapses to the lime ink #55701D (pistachio is illegible on paper)', () => {
    const light = live.slice(0, live.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ln-lime:\s*#55701D/);
    expect(light).toMatch(/--ln-lime-deep:\s*#55701D/);
  });

  it('light: hairlines alias the canonical --rule family + the scene pair doubles the ink alpha', () => {
    const light = live.slice(0, live.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ln-line:\s*var\(--rule\)/);
    expect(light).toMatch(/--ln-line-soft:\s*var\(--border-faint\)/);
    expect(light).toMatch(/--ln-scene-line:\s*rgba\(25,25,24,0\.28\)/);
    expect(light).toMatch(/--ln-scene-soft:\s*rgba\(25,25,24,0\.14\)/);
  });

  it('dark: the authored night palette on the canonical night ground', () => {
    const dark = live.slice(live.indexOf('[data-theme="dark"]'));
    expect(dark).toMatch(/--ln-ink:\s*var\(--bg\)/);
    expect(dark).toMatch(/--ln-ink-2:\s*var\(--neutral-100\)/);
    expect(dark).toMatch(/--ln-cream:\s*#F5F3E7/);
    expect(dark).toMatch(/--ln-cream-dim:\s*#C9C6B4/);
    expect(dark).toMatch(/--ln-lime:\s*#DFEDB2/);
    expect(dark).toMatch(/--ln-lime-deep:\s*#B9D778/);
    expect(dark).toMatch(/--ln-violet:\s*#7A6BF2/);
    expect(dark).toMatch(/--ln-scene-line:\s*rgba\(245,243,231,0\.14\)/);
    expect(dark).toMatch(/--ln-scene-soft:\s*rgba\(245,243,231,0\.07\)/);
  });

  it('no #252A3E / #1C2032 anywhere in the token source — the ink stage is dead', () => {
    // (comment-stripped: r172a tombstone prose legitimately quotes the
    // retired hexes while documenting the re-grounding)
    expect(live).not.toContain('#252A3E');
    expect(live).not.toContain('#1C2032');
  });
});

/* ── r172a §2 — canonical-accent CTA + skip-link (landing.css) ───── */

describe('r172a §2 — the landing CTA rides the canonical accent pair', () => {
  const css = stripComments(read('src/styles/landing.css'));

  it('.ln-btn-gold consumes --accent/--accent-fg with the --accent-hover hover (the .btn.accent recipe)', () => {
    const at = css.indexOf('.landing .ln-btn-gold {');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('background: var(--accent)');
    expect(body).toContain('color: var(--accent-fg)');
    const hoverAt = css.indexOf('.landing .ln-btn-gold:hover {');
    const hover = css.slice(hoverAt, css.indexOf('}', hoverAt));
    expect(hover).toContain('background: var(--accent-hover)');
  });

  it('the header/mobile .btn.primary joins the same pair (no landing-private CTA colors)', () => {
    const at = css.indexOf('.landing .btn.primary,');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = css.slice(at, css.indexOf('}', css.indexOf('}', at) + 1));
    expect(body).toContain('background: var(--accent)');
    expect(body).toContain('color: var(--accent-fg)');
    const hoverAt = css.indexOf('.landing .btn.primary:hover,');
    const hover = css.slice(hoverAt, css.indexOf('}', hoverAt));
    expect(hover).toContain('background: var(--accent-hover)');
  });

  it('no CTA rule paints lime anymore — the lime roster is editorial-only', () => {
    for (const sel of ['.ln-btn-gold', '.btn.primary']) {
      const ruleRe = new RegExp(`\\.landing ${sel.replace('.', '\\.')}(?![\\w-])[^{]*\\{[^}]*\\}`, 'g');
      for (const rule of css.match(ruleRe) ?? []) {
        expect(rule).not.toContain('var(--ln-lime');
      }
    }
  });

  it('the skip-link joins the accent family', () => {
    const at = css.indexOf('.landing .ln-skip-link {');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('background: var(--accent)');
    expect(body).toContain('color: var(--accent-fg)');
  });

  it('the reduced-motion press tint follows the accent hover too', () => {
    const at = css.indexOf('background: var(--accent-hover);');
    expect(at).toBeGreaterThanOrEqual(0); // P4-07's re-pointed active state
  });
});

/* ── r172a §3 — one focus language (the private ring is gone) ─────── */

describe('r172a §3 — the landing\'s private :focus-visible sub-language is deleted', () => {
  const css = stripComments(read('src/styles/landing.css'));

  it('no :focus-visible rule in landing.css writes an outline', () => {
    const rules = css.match(/[^{}]*:focus-visible[^{}]*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0); // scale-pop / reveal behaviors survive…
    for (const rule of rules) {
      expect(rule).not.toMatch(/outline(-color)?:/);
    }
  });

  it('the universal cream-outline rule + the CTA ring-swap overrides are gone', () => {
    expect(css).not.toMatch(/\.landing\s+:focus-visible\s*\{/);
    expect(css).not.toMatch(/\.ln-btn-ghost:focus-visible,\s*\.landing \.btn\.ghost:focus-visible\s*\{\s*outline-color/);
    expect(css).not.toMatch(/\.btn\.primary:focus-visible\s*\{\s*outline-color:\s*var\(--ln-ink\)/);
    expect(css).not.toContain('outline: 2px solid var(--ln-cream)');
  });
});

/* ── r172a §4 — grain polarity follows the theme ──────────────────── */

describe('r172a §4 — grain veil polarity (black noise in light)', () => {
  const css = stripComments(read('src/styles/landing.css'));

  it('the base veil is the authored WHITE noise (night look, alpha row intact)', () => {
    const at = css.indexOf('.landing .ln-grain {');
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('values=\'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0\'');
    expect(body).toContain('opacity: var(--ln-grain-op)');
  });

  it('[data-theme="light"] swaps in the BLACK noise matrix at the same alpha row', () => {
    const at = css.indexOf('[data-theme="light"] .landing .ln-grain {');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('values=\'0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0\'');
  });
});

/* ── r172a §5 — scene vars in the landing TSX ─────────────────────── */

describe('r172a §5 — no frozen cream rgba literals in the landing components', () => {
  it('JourneyLightPath: the base track rides the theme-aware scene token', () => {
    const src = read('src/components/landing/JourneyLightPath.tsx');
    expect(src).toContain("const BASE_STROKE = 'var(--ln-scene-line)'");
    expect(src).not.toMatch(/rgba\(245,243,231/);
    expect(src).toContain("const LIGHT_STROKE = 'var(--ln-cream)'");
  });

  it('CollegeConstellation: idle/rest dots are --ln-cream derivations, not frozen literals', () => {
    const src = read('src/components/landing/CollegeConstellation.tsx');
    expect(src).toContain("color-mix(in srgb, var(--ln-cream) 65%, transparent)");
    expect(src).toContain("color-mix(in srgb, var(--ln-cream) 95%, transparent)");
    expect(src).not.toMatch(/rgba\(245,243,231/);
  });

  it('OrbitScene: the palette comes from the live tokens (no module-level frozen color strings)', () => {
    const src = read('src/components/landing/OrbitScene.tsx');
    expect(src).toContain("getPropertyValue('--ln-cream')");
    expect(src).toContain("getPropertyValue('--ln-lime')");
    expect(src).toContain("getPropertyValue('--ln-violet')");
    // the frozen per-frame strings are gone (r172a read them per theme)
    expect(src).not.toMatch(/const STAR_COLORS/);
    expect(src).not.toMatch(/const NODE_FILL/);
    expect(src).not.toMatch(/const RING_STROKE/);
  });
});

/* ── r172a §6 — OrbitScene theme contract (pure-function parts) ──── */

describe('r172a §6 — OrbitScene pure-function theme contract', () => {
  it('parseColorTriplet reads hex 6-digit (the token values resolve)', () => {
    expect(parseColorTriplet('#F5F3E7')).toEqual([245, 243, 231]);
    expect(parseColorTriplet('#191918')).toEqual([25, 25, 24]);
    expect(parseColorTriplet(' #55701D ')).toEqual([85, 112, 29]);
  });

  it('parseColorTriplet reads rgb()/rgba() (comma and space forms)', () => {
    expect(parseColorTriplet('rgb(122, 107, 242)')).toEqual([122, 107, 242]);
    expect(parseColorTriplet('rgba(223, 237, 178, 0.95)')).toEqual([223, 237, 178]);
    expect(parseColorTriplet('rgb(25 25 24 / 50%)')).toEqual([25, 25, 24]);
  });

  it('parseColorTriplet rejects non-colors (null → engine keeps its fallback palette)', () => {
    expect(parseColorTriplet('')).toBeNull();
    expect(parseColorTriplet('inherit')).toBeNull();
    expect(parseColorTriplet('#12')).toBeNull();
  });

  it('the light alpha multipliers match the r172a record', () => {
    expect(ORBIT_LIGHT_ALPHA.star).toBe(1.6);
    expect(ORBIT_LIGHT_ALPHA.ring).toBe(1.8);
    expect(ORBIT_LIGHT_ALPHA.link).toBeGreaterThanOrEqual(1.6);
    expect(ORBIT_LIGHT_ALPHA.link).toBeLessThanOrEqual(1.7);
    expect(ORBIT_LIGHT_ALPHA.nebula).toBeGreaterThanOrEqual(1.6);
    expect(ORBIT_LIGHT_ALPHA.nebula).toBeLessThanOrEqual(1.7);
    expect(ORBIT_LIGHT_ALPHA.glow).toBe(1.3);
    expect(ORBIT_LIGHT_ALPHA.horizon).toBe(0.55);
  });

  it('observer wiring: data-theme attributeFilter + teardown disconnect (source pin)', () => {
    const src = read('src/components/landing/OrbitScene.tsx');
    expect(src).toContain("attributeFilter: ['data-theme']");
    expect(src).toMatch(/themeObserver\.disconnect\(\)/);
    // the observer rebuilds the palette (sprites + nebula) on flips
    expect(src).toMatch(/const themeObserver = new MutationObserver\(\(\) => \{\s*applyPalette\(\);/);
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
