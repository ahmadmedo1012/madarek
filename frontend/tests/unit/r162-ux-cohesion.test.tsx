/**
 * r162 — UX cohesion & motion round: regression pins.
 *
 * Three contracts landed together because they are one transition
 * story — the landing world's front door:
 *
 * R1 — landing boot ground: a GUEST cold-load of `/` paints the Orbit
 *      Ink ground from the first styled frame (index.html bootstrap
 *      sets html[data-landing-boot] pre-React; polish.css paints body
 *      + splash ink under it; App.tsx useLandingBootGround owns the
 *      attribute once the store is hydrated). The cream→ink world
 *      flash at the product's front door was reproduced live and
 *      documented as remaining in r161's honest notes.
 *
 * R2 — auth chunk warm-up: the landing idle-prefetches the AuthPage
 *      dynamic import (PROD only) so the #1 public CTA navigates with
 *      the chunk warm — no root-boundary splash blank-out between the
 *      two worlds on the primary funnel.
 *
 * R3 — content-mount fade: the page-enter animation targets
 *      `.content-inner > *` (the content child), so the Suspense
 *      fallback AND the resolved page that replaces it enter with the
 *      same 160ms fade — first visits keep the entrance language
 *      repeat visits had.
 *
 * Part 1 (jsdom) pins the React owner's route/user lockstep.
 * Part 2 (jsdom) pins the warm-up's PROD gating + idle firing.
 * Part 3 (fs) pins the CSS + bootstrap script contracts on disk
 *        (landing-scrollspy-grain.test.ts's stripComments pattern).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { queryClient } from '../../src/lib/queryClient';
import { AppRoutes } from '../../src/App';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

/* ── Part 1 mocks: heavy pages stubbed, AppShell → Outlet ────────── */
vi.mock('../../src/pages/LandingPage', () => ({
  default: () => <div data-testid="landing-page" />,
}));
vi.mock('../../src/pages/AuthPage', () => ({
  default: () => <div data-testid="auth-page" />,
}));
vi.mock('../../src/components/layout/AppShell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/components/layout/AppShell')>();
  return { ...actual, AppShell: () => <Outlet /> };
});
vi.mock('../../src/pages/student/DashboardPage', () => ({
  default: () => <div data-testid="student-dashboard" />,
}));

const html = () => document.documentElement;

function renderAt(pathname: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ═══ Part 1 — useLandingBootGround (R1, React owner) ═══════════════ */

describe('r162 R1 — landing boot ground follows the router verdict', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
    html().removeAttribute('data-landing-boot');
  });

  it('a GUEST on `/` carries the ink boot ground (attribute set)', async () => {
    renderAt('/');
    await screen.findByTestId('landing-page');
    expect(html().hasAttribute('data-landing-boot')).toBe(true);
  });

  it('the same guest on `/auth` does NOT (auth is product-world)', async () => {
    renderAt('/auth');
    await screen.findByTestId('auth-page');
    expect(html().hasAttribute('data-landing-boot')).toBe(false);
  });

  it('an AUTHED user on `/` does not — the redirect keeps the product ground', async () => {
    useAuthStore.setState({
      user: { id: 'u1', role: 'STUDENT' } as AuthUser,
      isHydrated: true,
    });
    renderAt('/');
    await screen.findByTestId('student-dashboard');
    expect(html().hasAttribute('data-landing-boot')).toBe(false);
  });

  it('pre-hydration the effect is inert — the bootstrap heuristic owns the window', async () => {
    // Simulate the index.html bootstrap's verdict (guest on `/`): the
    // attribute is already on the <html> element before React commits.
    html().setAttribute('data-landing-boot', '');
    useAuthStore.setState({ user: null, isHydrated: false });
    renderAt('/');
    // HydrationSplash shows; the store is unhydrated — the effect must
    // not touch the attribute (a null user is not yet knowledge).
    expect(html().hasAttribute('data-landing-boot')).toBe(true);
    // The store hydrates an AUTHED session → React corrects the
    // heuristic: the boot ground goes, the redirect keeps cream.
    act(() => {
      useAuthStore.setState({
        user: { id: 'u1', role: 'STUDENT' } as AuthUser,
        isHydrated: true,
      });
    });
    await screen.findByTestId('student-dashboard');
    expect(html().hasAttribute('data-landing-boot')).toBe(false);
  });

  it('unmounting AppRoutes releases the boot ground (error-boundary path)', async () => {
    html().removeAttribute('data-landing-boot');
    const view = renderAt('/');
    await screen.findByTestId('landing-page');
    expect(html().hasAttribute('data-landing-boot')).toBe(true);
    view.unmount();
    expect(html().hasAttribute('data-landing-boot')).toBe(false);
  });
});

/* ═══ Part 2 — AuthPage warm-up from the landing (R2) ════════════════ */

describe('r162 R2 — the landing warms the AuthPage chunk (PROD, idle)', () => {
  // jsdom has no requestIdleCallback → the effect's setTimeout(2500)
  // fallback is what fires; fake timers drive it deterministically.
  // It also has no ResizeObserver (the setup file polyfills only
  // IntersectionObserver) — JourneyLightPath needs a no-op stub.
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
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    if (OriginalRO === undefined) delete (window as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    else (window as unknown as { ResizeObserver: unknown }).ResizeObserver = OriginalRO;
    vi.useRealTimers();
    vi.doUnmock('../../src/pages/AuthPage');
    vi.doUnmock('../../src/pages/LandingPage');
    vi.resetModules();
    useAuthStore.setState({ user: null, isHydrated: true });
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

/* ═══ Part 3 — on-disk contracts (CSS + bootstrap script) ════════════ */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a selector pin. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('r162 R1/R3 — landing boot ground + content-mount fade (CSS)', () => {
  const polish = stripComments(read('src/styles/polish.css'));

  it('the ink boot ground paints BOTH boot surfaces (body + hydration splash)', () => {
    expect(polish).toMatch(
      /html\[data-landing-boot\] body,\s*html\[data-landing-boot\] \.hydration-splash\s*\{\s*background:\s*var\(--ln-ink\);/,
    );
  });

  it('the ink ground consumes the token — no raw hex in the boot rule', () => {
    const rule = polish.match(/html\[data-landing-boot\][^{]*\{[^}]*\}/g) ?? [];
    for (const r of rule) {
      expect(r).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('page-enter targets the content CHILD — every content mount fades', () => {
    expect(polish).toMatch(
      /\.content-inner > \*\s*\{\s*animation:\s*page-enter var\(--motion-duration-short\) var\(--ease-out\) both;/,
    );
  });

  it('the old container-level page-enter rule is gone (no double fade)', () => {
    // `.content-inner {` followed by an animation declaration — the
    // r161-and-earlier shape. The child selector must be the only owner.
    expect(polish).not.toMatch(/\.content-inner\s*\{[^}]*animation:/);
  });

  it('reduced-motion kills the child-level entrance too', () => {
    expect(polish).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.content-inner > \* \{ animation: none; \}/,
    );
  });
});

describe('r162 R1/R4 — index.html bootstrap contract', () => {
  const index = read('index.html');

  it('the pre-React heuristic decides the landing boot ground', () => {
    // pathname `/` + no persisted mdrk-auth session → data-landing-boot.
    expect(index).toContain("sessionStorage.getItem('mdrk-auth')");
    expect(index).toContain("location.pathname === '/'");
    expect(index).toContain("setAttribute('data-landing-boot', '')");
  });

  it('the persisted-session shape the heuristic reads matches the store', () => {
    // The store persists { state: { user, accessToken } } under
    // 'mdrk-auth' — the heuristic reads state.user. A shape drift here
    // silently turns every authed reload of `/` into an ink flash.
    expect(index).toContain('parsedSession.state.user');
  });

  it('theme-color follows the boot ground (mobile chrome cohesion, R4)', () => {
    expect(index).toContain("hasAttribute('data-landing-boot')");
    // The ink mirror of --ln-ink (tokens.css:431) — this script runs
    // before styles load, so it cannot read the CSS var.
    expect(index).toContain("'#252A3E'");
  });

  it('the meta observer watches BOTH the theme and the boot ground', () => {
    expect(index).toContain(
      "attributeFilter: ['data-theme', 'data-landing-boot']",
    );
  });
});
