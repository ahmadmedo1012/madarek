/**
 * R362 (Agent 5) — the access-control guard matrix.
 *
 * The route sweep (route-sweep.spec.ts) proves every renderable route
 * works for its OWNING role. This spec proves the OTHER half of the
 * Section-12 access bar: a guarded route must bounce every FOREIGN
 * role to that role's home — the client guard mirrors the backend
 * truth (lib/permissions.ts; the r157 6A9 #1 QUALITY-only decision)
 * and never renders another role's surface.
 *
 * Matrix coverage (representative × exhaustive where it matters):
 *   · every ROLE-PREFIX (/student /teacher /admin /quality /owner)
 *     probed with ALL foreign roles (one canonical route per prefix —
 *     the guard is the ProtectedRoute WRAPPER, so one probe per prefix
     * proves the wrapper; param-heavy siblings add no guard surface);
 *   · the any-auth surfaces (/vision /settings /document
 *     /competitions) stay REACHABLE for every role (no bounce);
 *   · GUEST visits to each guarded prefix bounce to /auth (the
 *     signed-out half of the same wrapper);
 *   · the documented widening (/student/labs admits TEACHER) is
 *     pinned positively here too — the guard's ONE deliberate
 *     exception.
 *
 * Runs on the same live stack as the sweep (`npm run test:r362`,
 * R362_GUARD=1 to run only this file's slice — see package.json).
 */
import { expect, test } from '@playwright/test';

import { flowPage } from '../r325/flows/fixtures/live';
import { ROLE_HOME_MAP, type GuardProbe } from './guard-matrix-routes';

/** A page factory that yields a SIGNED-OUT context (guest pass). */
async function guestPage(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext({
    baseURL: process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'ar',
    colorScheme: 'light',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  return { page, close: () => context.close().catch(() => undefined) };
}

/* ── foreign-role bounces (the wrapper guard) ───────────────────── */

for (const probe of ROLE_HOME_MAP.probes) {
  for (const role of ROLE_HOME_MAP.foreignRolesFor(probe)) {
    test(`guard · ${probe.path} rejects ${role}`, async ({ browser }) => {
      const { page, close } = await flowPage(browser, role);
      try {
        await page.goto(probe.path);
        // The bounce lands on the VISITING role's own home (the guard
        // redirects to ROLE_HOME[session.role], never to a 403).
        await expect(page).toHaveURL(ROLE_HOME_MAP.home[role], { timeout: 15_000 });
      } finally {
        await close();
      }
    });
  }
}

/* ── guest bounces (the signed-out half) ────────────────────────── */

for (const probe of ROLE_HOME_MAP.probes) {
  test(`guard · ${probe.path} rejects GUEST → /auth`, async ({ browser }) => {
    const { page, close } = await guestPage(browser);
    try {
      await page.goto(probe.path);
      await expect(page).toHaveURL(/\/auth(\?|$)/, { timeout: 15_000 });
    } finally {
      await close();
    }
  });
}

/* ── any-auth surfaces stay reachable for every role ────────────── */

for (const surface of ROLE_HOME_MAP.anyAuthSurfaces) {
  for (const role of ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
    if (role === 'STUDENT') continue; // the sweep's ANY pass covers STUDENT
    test(`guard · ${surface} reachable by ${role}`, async ({ browser }) => {
      const { page, close } = await flowPage(browser, role);
      try {
        await page.goto(surface);
        // No bounce: the URL stays (any-auth surfaces render inside
        // every role's shell).
        await expect(page.locator('h1, [role="main"], .state').first()).toBeVisible({
          timeout: 20_000,
        });
        expect(new URL(page.url()).pathname).toBe(surface);
      } finally {
        await close();
      }
    });
  }
}

/* ── the ONE documented widening, pinned positively ─────────────── */

test('guard · /student/labs admits TEACHER (r155c widening)', async ({ browser }) => {
  const { page, close } = await flowPage(browser, 'TEACHER');
  try {
    await page.goto('/student/labs');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe('/student/labs');
  } finally {
    await close();
  }
});

test('guard · /student/labs rejects ADMIN (the widening is teacher-scoped)', async ({ browser }) => {
  const { page, close } = await flowPage(browser, 'ADMIN');
  try {
    await page.goto('/student/labs');
    await expect(page).toHaveURL('/admin/dashboard', { timeout: 15_000 });
  } finally {
    await close();
  }
});
