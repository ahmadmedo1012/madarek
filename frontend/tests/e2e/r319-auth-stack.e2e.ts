/**
 * r319-auth-stack.e2e.ts — §C1-B: the REAL-STACK smoke belt.
 *
 * Unlike every other spec in tests/e2e (hermetic: mock transport, no
 * backend), this one requires the FULL LOCAL STACK — embedded postgres
 * + migrated/seeded database + backend API + Vite:
 *
 *   npm run dev:full
 *   MADAREK_E2E_STACK=1 npx playwright test tests/e2e/r319-auth-stack.e2e.ts
 *
 * (or against a custom frontend port:
 *   MADAREK_E2E_STACK=1 MADAREK_E2E_BASE_URL=http://localhost:4311 …)
 *
 * For each of the five demo roles it logs in through the REAL
 * POST /auth/login (fixtures/auth-storage.ts), boots the app
 * reload-style from the seeded `mdrk-auth` store, and asserts the role's
 * dashboard renders its real Arabic H1 through the live API — proving
 * token, role guard, proxy and database in one pass.
 *
 * HERMETIC-BY-DEFAULT: without MADAREK_E2E_STACK=1 every test skips —
 * CI never needs the stack and the suite stays green (same opt-in
 * pattern as r309-prod-verify's MADAREK_PROD_VERIFY).
 */
import { test, expect } from '@playwright/test';

import { storageStateForRole, WEB_ORIGIN, type StackRole } from './fixtures/auth-storage';

const ENABLED = process.env.MADAREK_E2E_STACK === '1';
test.skip(!ENABLED, 'real-stack smoke — run `npm run dev:full` then set MADAREK_E2E_STACK=1');

/** Role → dashboard route + its real page H1 (grep-verified in
 * src/pages/{student,teacher,admin,quality,owner}). */
const DASHBOARDS: Record<StackRole, { route: string; heading: string }> = {
  STUDENT: { route: '/student/dashboard', heading: 'لوحة التحكم' },
  TEACHER: { route: '/teacher/dashboard', heading: 'لوحة الأستاذ' },
  ADMIN: { route: '/admin/dashboard', heading: 'لوحة الإدارة' },
  QUALITY: { route: '/quality/dashboard', heading: 'لوحة الجودة' },
  OWNER: { route: '/owner/dashboard', heading: 'لوحة التحكم الرئيسية' },
};

for (const role of Object.keys(DASHBOARDS) as StackRole[]) {
  const { route, heading } = DASHBOARDS[role]!;

  test(`stack · ${role.toLowerCase()} logs in via the real API and renders ${route}`, async ({
    browser,
  }) => {
    // 1 — REAL login (throws loudly when the stack/seed is missing).
    const storageState = await storageStateForRole(role);

    // 2 — boot the app reload-style with the live token.
    const context = await browser.newContext({
      baseURL: WEB_ORIGIN,
      locale: 'ar',
      colorScheme: 'dark',
      storageState,
    });
    const page = await context.newPage();
    // The R318 entrance loader replays on every full page load — seed
    // the hermetic skip key first (same as the e2e fixture factory).
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('madarek-intro-skip', '1');
      } catch {
        /* storage unavailable — the page stands complete anyway */
      }
    });

    // 3 — the role's dashboard: the auth guard must NOT bounce to /auth,
    //     and the page must render its real Arabic H1 through the live API.
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/auth/);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(heading);

    await context.close();
  });
}
