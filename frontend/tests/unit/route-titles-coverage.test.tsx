/**
 * R131-F12 — WCAG 2.4.2 (A) route-title coverage gate for the SPA.
 *
 * Audit A7 §5-3 claimed "only 7 of 47 page components call usePageTitle;
 * the other ~40 routes keep the static index.html title". That was
 * adjudicated a FALSE POSITIVE: this app owns titles CENTRALLY, not per
 * page component —
 *   - AppShell.resolveTitle + its document.title effect (15-g P2-3)
 *     covers every shell route (NAV_TITLES derived from the nav.ts
 *     labels + PAGE_TITLES for non-nav surfaces + DYNAMIC_TITLES for
 *     :param routes; nav-coverage.test.ts pins the label parity);
 *   - the three non-shell pages call usePageTitle (auth / register /
 *     404) — pinned here by rendering the REAL pages and reading
 *     document.title;
 *   - the guest listing/detail surfaces layer the payload name on top
 *     (useDocTitle in CollegePages / VisionPages / CompetitionsPages),
 *     and the landing keeps the static index.html platform title.
 *
 * This suite pins the COVERAGE so it can never regress silently: every
 * <Route> declared in src/App.tsx must (a) be a redirect whose
 * destination owns a title, (b) be one of the non-shell usePageTitle
 * pages, or (c) resolve a specific title through the shell resolver.
 * A route wired without any of the three fails here — that is the
 * regression the audit item asked to prevent ("extend usePageTitle to
 * all routed pages"), expressed against the mechanism this repo
 * actually ships.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* Static-source helpers (assets.test.ts / AuthPage-alignment.test.ts
 * convention: fs assertions lock in what per-component tests can't see —
 * here, the route table itself). */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

const APP_SOURCE = read('src/App.tsx');

/** Every `<Route path="…" element={<Component …` row in the real table. */
const ROUTE_RE = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g;
interface RouteRow { path: string; element: string; }
const ROUTES: RouteRow[] = [];
for (const m of APP_SOURCE.matchAll(ROUTE_RE)) {
  // matchAll groups are typed string|undefined under
  // noUncheckedIndexedAccess; the regex guarantees both groups.
  ROUTES.push({ path: m[1]!, element: m[2]! });
}

/* Elements that never render a page of their own — the title settles at
 * the redirect destination (which itself must pass this gate). */
const REDIRECT_ELEMENTS = new Set(['Navigate', 'HomeRedirect']);

/* Routes whose element component renders an in-page <Navigate>. Each is
 * paired with the fs proof so the allowlist can't rot silently. */
const IN_PAGE_REDIRECTS: Array<{ path: string; source: string; marker: string }> = [
  {
    // 5-B4: the analysis page folded into /admin/reports (?trend=table);
    // the route row stays as a bookmark-preserving redirect.
    path: '/admin/analysis',
    source: 'src/pages/admin/AdminExtraPages.tsx',
    marker: '<Navigate to="/admin/reports?trend=table" replace />',
  },
];

/* Non-shell pages that own their titles via usePageTitle (verified by
 * rendering the real page below). */
const NON_SHELL_TITLED: Record<string, string> = {
  '/auth': 'تسجيل الدخول · مدارك',
  '/auth/register': 'إنشاء حساب جامعي · مدارك',
  '/404': 'الصفحة غير موجودة · مدارك',
};

import { resolveTitle } from '../../src/components/layout/AppShell';

describe('route-title coverage — every App.tsx route resolves a title (WCAG 2.4.2)', () => {
  it('the route-table extraction found the real table (guards the regex itself)', () => {
    // The live table declares 90+ pathed rows. If this drops to a
    // handful, the extraction broke — every assertion below would be
    // vacuously green without this tripwire.
    expect(ROUTES.length).toBeGreaterThanOrEqual(90);
  });

  it('in-page-redirect allowlist entries still render their <Navigate> (no rot)', () => {
    for (const entry of IN_PAGE_REDIRECTS) {
      expect(read(entry.source), entry.path).toContain(entry.marker);
    }
  });

  it('every shell route resolves a SPECIFIC title (nav label / PAGE_TITLES / DYNAMIC_TITLES)', () => {
    const covered = new Map<string, string>();
    const inPageRedirect = new Set(IN_PAGE_REDIRECTS.map((e) => e.path));
    for (const { path, element } of ROUTES) {
      if (REDIRECT_ELEMENTS.has(element)) continue; // destination owns it
      if (inPageRedirect.has(path)) continue; // folds to a covered route
      if (NON_SHELL_TITLED[path] !== undefined) continue; // rendered below
      // :param rows resolve through DYNAMIC_TITLES — feed a concrete id.
      const concrete = path.replace(/:[^/]+/g, 'probe');
      const title = resolveTitle(concrete);
      expect(title, `${path} must not fall through to the generic fallback`).not.toBe('مدارك');
      expect(title.length, path).toBeGreaterThan(1);
      covered.set(path, title);
    }
    // Sanity: the sweep actually exercised the shell surfaces (student /
    // teacher / admin / quality / owner + shared any-auth routes).
    expect(covered.size).toBeGreaterThanOrEqual(80);
  });

  it('the guest landing keeps the static index.html platform title', () => {
    // `/` for guests renders LandingPage outside the shell — it never
    // mounts a title effect, so the static <title> IS the landing title
    // (and every titled page restores it on unmount). Pin the string.
    const m = read('index.html').match(/<title>([^<]+)<\/title>/);
    expect(m?.[1]).toBe('مدارك · منصة التعليم الذكي · جامعة الزاوية');
  });
});

/* ── Non-shell pages: the real document.title, end to end ──────────── */

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useRegister: () => ({
    mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' } })),
    isPending: false,
    isError: false,
  }),
}));

vi.mock('../../src/hooks/useResources', () => ({
  useFaculties: () => ({
    data: [
      {
        id: 'fac-1',
        name: 'كلية تقنية المعلومات',
        iconEmoji: '💻',
        city: 'الزاوية',
        departments: [{ id: 'dep-1', name: 'علوم الحاسوب' }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import AuthPage from '../../src/pages/AuthPage';
import RegisterPage from '../../src/pages/RegisterPage';
import NotFoundPage from '../../src/pages/NotFoundPage';

describe('non-shell pages — usePageTitle sets the live document.title (2.4.2)', () => {
  it.each([
    ['/auth', AuthPage, 'تسجيل الدخول · مدارك'],
    ['/auth/register', RegisterPage, 'إنشاء حساب جامعي · مدارك'],
    ['/404', NotFoundPage, 'الصفحة غير موجودة · مدارك'],
  ] as const)('%s titles the tab and restores the previous title on unmount', (_path, Page, expected) => {
    document.title = 'العنوان السابق';
    const { unmount } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    expect(document.title).toBe(expected);
    unmount();
    // usePageTitle's cleanup chains route changes without leaking the
    // stale context (logout → landing lands back on the platform title).
    expect(document.title).toBe('العنوان السابق');
  });
});
