/**
 * r183-B3 — the PUBLIC COLLEGES funnel contract (A5 P1-1).
 *
 * r164b rewired the LANDING's primary CTAs to /auth/register (pinned
 * in landing-funnel.test.tsx) — but the public COLLEGE surfaces kept
 * routing their create-account verb «أنشئ حسابك الجامعي» to /auth
 * (the LOGIN form «مرحباً بعودتك»): the label promised account
 * creation, the destination opened the wrong form. The register hop
 * also dropped state.from at AuthPage's register prompt, so a
 * visitor who landed on /auth could never carry the college page
 * that earned the click through to /auth/register.
 *
 * These pins mirror the landing suite's both-layer shape:
 *   · source — GuestJoinRow + GuestClosingBand split the register /
 *     login destinations (both carrying state.from), and AuthPage's
 *     register prompt forwards the live location.state;
 *   · rendered guest DOM — a real guest render of the colleges
 *     gallery hops to /auth/register WITH { from: { pathname } },
 *     the login ghost keeps /auth with the same state, and the
 *     login→register hop through AuthPage preserves state.from.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const h = vi.hoisted(() => ({
  /* One seeded-shape faculty row — enough for the gallery's guest
   * chrome to mount (the join row renders regardless of query state;
   * the row keeps api.get() honest instead of erroring). */
  faculty: {
    id: 'f1',
    name: 'كلية الآداب',
    nameEn: null,
    iconEmoji: null,
    city: 'الزاوية',
    departmentCount: 0,
    studentCount: 0,
    teacherCount: 0,
    courseCount: 0,
  },
  login: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: vi.fn(async () => ({ data: { data: [h.faculty] } })),
  },
  unwrap: (promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data),
  // AuthPage's (disabled) REG_NUMBER_AMBIGUOUS institutions query.
  listPublicInstitutions: vi.fn(async () => []),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => h.login,
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { CollegesIndexPage } from '../../src/pages/colleges/CollegePages';
import AuthPage from '../../src/pages/AuthPage';
import { useAuthStore } from '../../src/stores/auth.store';

/* ── static source-contract helpers (assets.test.ts convention) ──── */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose (which quotes the OLD copy
 * it killed) can never satisfy a content pin. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
/** The body of a top-level function (marker → next `function`). */
function blockOf(source: string, marker: string): string {
  const idx = source.indexOf(marker);
  expect(idx, marker).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('\nfunction ', idx + 1);
  return source.slice(idx, next === -1 ? source.length : next);
}

/* ── rendered-DOM hop recorder ───────────────────────────────────── */

/** Every mounted hop target records its location (pathname + state)
 * — the ONLY way to see router state from the DOM. */
const hops: Array<{ pathname: string; state: unknown }> = [];
function HopProbe() {
  const location = useLocation();
  useEffect(() => {
    hops.push({ pathname: location.pathname, state: location.state });
  }, [location]);
  return <p data-testid="hop-probe">{location.pathname}</p>;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderGalleryGuest() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/colleges']}>
        <Routes>
          <Route path="/colleges" element={<CollegesIndexPage />} />
          <Route path="/auth" element={<HopProbe />} />
          <Route path="/auth/register" element={<HopProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderAuthWithState(state: unknown) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: '/auth', state }]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/register" element={<HopProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  hops.length = 0;
  useAuthStore.setState({ user: null, currentInstitution: null });
});

/* ── source contract ─────────────────────────────────────────────── */

describe('r183-B3 — public colleges guest chrome: source contract', () => {
  const tsx = read('src/pages/colleges/CollegePages.tsx');
  const live = stripComments(tsx);

  it('GuestJoinRow: the create-account primary routes to /auth/register, the login ghost keeps /auth — both carry state.from', () => {
    const fn = blockOf(live, 'function GuestJoinRow');
    expect(fn).toContain('<Link to="/auth/register" state={from} className="btn primary sm">أنشئ حسابك الجامعي</Link>');
    expect(fn).toContain('<Link to="/auth" state={from} className="btn ghost sm">تسجيل الدخول</Link>');
  });

  it('GuestClosingBand: the same split on the college-detail conversion moment', () => {
    const fn = blockOf(live, 'function GuestClosingBand');
    expect(fn).toContain('<Link to="/auth/register" state={from} className="btn primary">أنشئ حسابك الجامعي</Link>');
    expect(fn).toContain('<Link to="/auth" state={from} className="btn ghost">تسجيل الدخول</Link>');
  });

  it('NO public primary CTA routes to bare /auth (the r164b landing defect, re-pinned on the colleges surfaces)', () => {
    // A create-account-styled button under the login destination is
    // the exact label↔destination mismatch landing-funnel pins dead
    // on the landing — CollegesPages must never reintroduce it.
    expect(live).not.toMatch(/to="\/auth"\s+className="btn primary/);
  });

  it("AuthPage's register prompt forwards the live location.state through the hop", () => {
    const auth = stripComments(read('src/pages/AuthPage.tsx'));
    expect(auth).toContain('<Link to="/auth/register" state={location.state}');
  });
});

/* ── rendered guest DOM ──────────────────────────────────────────── */

describe('r183-B3 — rendered guest funnel (gallery join row)', () => {
  it('the create-account primary hops to /auth/register WITH state.from (the deep link survives)', () => {
    const { container } = renderGalleryGuest();

    const primary = container.querySelector<HTMLAnchorElement>(
      '.guest-join-row .btn.primary',
    );
    expect(primary?.textContent).toContain('أنشئ حسابك الجامعي');
    expect(primary?.getAttribute('href')).toBe('/auth/register');

    fireEvent.click(primary as HTMLAnchorElement);
    expect(hops.at(-1)?.pathname).toBe('/auth/register');
    expect(hops.at(-1)?.state).toEqual({ from: { pathname: '/colleges' } });
  });

  it('the login ghost keeps /auth and carries the same state.from', () => {
    const { container } = renderGalleryGuest();

    const ghost = container.querySelector<HTMLAnchorElement>(
      '.guest-join-row .btn.ghost',
    );
    expect(ghost?.textContent).toContain('تسجيل الدخول');
    expect(ghost?.getAttribute('href')).toBe('/auth');

    fireEvent.click(ghost as HTMLAnchorElement);
    expect(hops.at(-1)?.pathname).toBe('/auth');
    expect(hops.at(-1)?.state).toEqual({ from: { pathname: '/colleges' } });
  });
});

describe('r183-B3 — the login→register hop preserves state.from', () => {
  it("a visitor on /auth with a deep link clicks «أنشئ حسابك الآن» and the college page follows them to /auth/register", () => {
    renderAuthWithState({ from: { pathname: '/colleges/f1' } });

    fireEvent.click(screen.getByRole('link', { name: 'أنشئ حسابك الآن' }));
    expect(hops.at(-1)?.pathname).toBe('/auth/register');
    expect(hops.at(-1)?.state).toEqual({ from: { pathname: '/colleges/f1' } });
  });

  it('a plain /auth visit forwards no fabricated state (honest null, not a made-up from)', () => {
    renderAuthWithState(null);

    fireEvent.click(screen.getByRole('link', { name: 'أنشئ حسابك الآن' }));
    expect(hops.at(-1)?.pathname).toBe('/auth/register');
    expect(hops.at(-1)?.state).toBeNull();
  });
});
