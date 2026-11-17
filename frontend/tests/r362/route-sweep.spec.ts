/**
 * R362 (Agent 5) — the COMPLETE real-stack route sweep.
 *
 * Every renderable route in the product (126 sweep rows — the machine-
 * pinned table in tests/r362/sweep-routes.ts, parity-gated by
 * tests/unit/r362-sweep-table.test.ts) is visited here by its OWNING
 * role against the LIVE stack (Vite :5173 + backend :4000 + seeded
 * Postgres — `npm run dev:full`), with the real-API session grammar
 * inherited from tests/r325/flows/fixtures/live.ts.
 *
 * Per route, the sweep proves the Section-12 completion bar:
 *   · route RESOLUTION — the URL did not bounce (guard integrity for
 *     the owning role; /admin/analysis proves its redirect instead);
 *   · page RENDER — a visible h1 / main landmark / shared state node
 *     (loading→content is awaited, so an eternally-pending skeleton
 *     fails as a hang, not a pass);
 *   · TITLE — document.title is non-empty (the shell resolver contract
 *     pinned by route-titles-coverage.test.tsx, now end-to-end);
 *   · API ERROR HANDLING — no /api/ response answered 5xx during the
 *     visit (4xx are legitimate application states, e.g. the honest
 *     404 of the missing-document probe);
 *   · CLIENT HYGIENE — zero page errors and zero non-resource console
 *     errors ("Failed to load resource" lines are network noise the
 *     response collector owns).
 *
 * Run (all roles, all routes):
 *   cd frontend
 *   MADAREK_E2E_BASE_URL=http://localhost:5173 \
 *   MADAREK_E2E_EXECUTABLE=/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome \
 *     npx playwright test --project=r362
 * Slices for iteration: R362_ONLY=path1,path2 / R362_ROLE=STUDENT,OWNER.
 *
 * The wrong-role half of access integrity (a STUDENT hitting
 * /admin/dashboard bounces to /student/dashboard) lives in
 * guard-matrix.spec.ts; the responsive/theme/keyboard half lives in
 * states-responsive.spec.ts. This file owns the per-route base pass.
 */
import { expect, test, type Page } from '@playwright/test';

import { flowPage } from '../r325/flows/fixtures/live';
import {
  SWEEP_ROUTES,
  IN_PAGE_REDIRECTS,
  loginRoleFor,
  sweepUrl,
  type SweepRoute,
} from './sweep-routes';

/* ── slice knobs (see header) ───────────────────────────────────── */
const ONLY = process.env.R362_ONLY
  ? new Set(process.env.R362_ONLY.split(',').map((s) => s.trim()).filter(Boolean))
  : null;
const ROLES = process.env.R362_ROLE
  ? new Set(process.env.R362_ROLE.split(',').map((s) => s.trim().filter(Boolean).toUpperCase()))
  : null;

const ROUTES_UNDER_TEST = SWEEP_ROUTES.filter(
  (r) => (!ONLY || ONLY.has(r.path)) && (!ROLES || ROLES.has(r.role)),
);

/* ── collectors ─────────────────────────────────────────────────── */

interface VisitReport {
  pageErrors: string[];
  consoleErrors: string[];
  api5xx: string[];
}

function attachCollectors(page: Page): VisitReport {
  const report: VisitReport = { pageErrors: [], consoleErrors: [], api5xx: [] };
  page.on('pageerror', (err) => {
    report.pageErrors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Network-layer noise ("Failed to load resource: … 404") is the
    // response collector's domain — an honest 4xx renders a designed
    // ErrorState; it is not a client defect.
    if (text.startsWith('Failed to load resource')) return;
    // The dev-server resource introspection line (vite hmr ws probe)
    // is not application output.
    if (text.includes('[vite]') || text.includes('WebSocket connection')) return;
    report.consoleErrors.push(text);
  });
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('/api/')) {
      report.api5xx.push(`${res.status()} ${res.url()}`);
    }
  });
  return report;
}

/** The per-route assertion set (see the header's five proofs). */
async function assertRouteRenders(page: Page, route: SweepRoute, report: VisitReport) {
  const url = sweepUrl(route);
  const visited = new URL(page.url());

  if (IN_PAGE_REDIRECTS.has(route.path)) {
    // The row's element redirects in-page — prove the DESTINATION
    // (auto-waiting: <Navigate> fires after React mounts, which can
    // be after the goto's load event).
    if (route.path === '/admin/analysis') {
      await expect(page).toHaveURL(/\/admin\/reports/, { timeout: 15_000 });
    }
  } else {
    expect(
      visited.pathname,
      `${url} bounced to ${visited.pathname} for its owning role`,
    ).toBe(url);
  }

  // RENDER — the main content or a designed shared state node.
  const content = page.locator('h1, [role="main"], .state').first();
  await expect(content, `${url} rendered no h1/main/state`).toBeVisible({ timeout: 20_000 });

  // TITLE — the resolver contract, end to end.
  const title = await page.title();
  expect(title.length, `${url} has an empty document.title`).toBeGreaterThan(2);

  // API + client hygiene.
  expect(report.api5xx, `${url} hit 5xx APIs: ${report.api5xx.join(' | ')}`).toEqual([]);
  expect(report.pageErrors, `${url} threw page errors: ${report.pageErrors.join(' | ')}`).toEqual([]);
  expect(
    report.consoleErrors,
    `${url} logged console errors: ${report.consoleErrors.join(' | ')}`,
  ).toEqual([]);
}

/* ── the sweep ──────────────────────────────────────────────────── */

for (const route of ROUTES_UNDER_TEST) {
  test(`sweep · ${route.path} [${route.role}]`, async ({ browser }) => {
    const loginRole = loginRoleFor(route.role);
    if (loginRole) {
      const { page, close } = await flowPage(browser, loginRole);
      try {
        const report = attachCollectors(page);
        await page.goto(sweepUrl(route));
        await assertRouteRenders(page, route, report);
      } finally {
        await close();
      }
    } else {
      const context = await browser.newContext({
        baseURL: process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173',
        locale: 'ar',
        colorScheme: 'light',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      try {
        const report = attachCollectors(page);
        await page.goto(sweepUrl(route));
        await assertRouteRenders(page, route, report);
      } finally {
        await context.close().catch(() => undefined);
      }
    }
  });
}

/* The single documented role-widening: a TEACHER also passes the
 * /student/labs guard (r155c — «معاينة كطالب»); pinned separately
 * from the STUDENT pass above. */
if (!ONLY || ONLY.has('/student/labs')) {
  test('sweep · /student/labs [TEACHER widening pass]', async ({ browser }) => {
    const { page, close } = await flowPage(browser, 'TEACHER');
    try {
      const report = attachCollectors(page);
      await page.goto('/student/labs');
      await assertRouteRenders(page, { path: '/student/labs', role: 'STUDENT_AND_TEACHER' }, report);
    } finally {
      await close();
    }
  });
}
