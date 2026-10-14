/**
 * e2e — the shared fixtures for the hermetic browser journey suite
 * (r164-k / Agent K).
 *
 * What every spec gets for free:
 *
 *  1. ISOLATION — a fresh browser context per test (own storage), so a
 *     login in one test can never leak its `mdrk-auth` into the next.
 *     Project/test-level `viewport` / `locale` / `colorScheme` options
 *     still apply (they flow through the fixture dependencies).
 *
 *  2. MOCK TRANSPORT — every /api/ call is fulfilled by the
 *     fixture corpus (see mock-transport.ts); the Vite dev server
 *     serves the REAL SPA. No backend, no database, no network.
 *
 *  3. AUTH STATE BOOTSTRAP — `test.use({ e2eRole: 'STUDENT' })` seeds
 *     `mdrk-auth` localStorage exactly the way the zustand persist
 *     store writes it, BEFORE any app script runs (reload-style
 *     session, ProtectedRoute happily serves guarded routes).
 *
 *  4. FROZEN CLOCK — `page.clock.setFixedTime(FIXED_NOW)` with
 *     timezoneId UTC: Date.now() AND new Date() are deterministic
 *     while timers keep ticking (debounces, React Query retries and
 *     the notifications poll all still work — only the wall clock is
 *     pinned). Every fixture timestamp derives from the same instant
 *     (api-fixtures.ts), so relative strings are stable.
 *
 * File naming: `*.e2e.ts` — NOT `*.spec.ts`. Vitest collects
 * every tests/…*.{test,spec}.{ts,tsx} file and importing @playwright/test
 * outside the Playwright runner throws, so the e2e suite deliberately
 * rides a distinct suffix that vitest never collects (the same reason
 * tests/audit is excluded there). Playwright's e2e project matches
 * `/\.e2e\.ts$/` (see playwright.config.ts).
 */
import { test as base, expect } from '@playwright/test';
import type { ViewportSize } from '@playwright/test';

import { FIXED_NOW_ISO, STUDENT_USER, type FixtureUser } from './api-fixtures';
import { installMockApi, seedSession, type MockRouteDef } from './mock-transport';

export type E2eRole = 'guest' | 'STUDENT';

export interface E2eOptions {
  /** 'STUDENT' boots the app signed-in (localStorage mdrk-auth). */
  e2eRole: E2eRole;
  /** Per-test mock routes — matched BEFORE the standard table. */
  apiOverrides: MockRouteDef[];
  /** Optional persisted theme to seed (madarek-theme localStorage). */
  themeSeed: 'light' | 'dark' | null;
}

const BASE_URL = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

function userForRole(role: E2eRole): FixtureUser | null {
  return role === 'STUDENT' ? STUDENT_USER : null;
}

export const test = base.extend<E2eOptions>({
  e2eRole: ['guest', { option: true }],
  apiOverrides: [[], { option: true }],
  themeSeed: [null, { option: true }],

  context: async (
    { browser, e2eRole, apiOverrides, themeSeed, viewport, locale, colorScheme },
    use,
  ) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: viewport as ViewportSize | null,
      locale: locale as string | undefined,
      colorScheme: colorScheme as 'light' | 'dark' | 'no-preference' | undefined,
      // Deterministic wall clock for new Date().getHours() (greeting)
      // and date formatting (ar-LY) — runner TZ can vary.
      timezoneId: 'UTC',
    });

    // Seed localStorage BEFORE any app script; user null = guest
    // (optionally with a persisted theme, e.g. the toggle spec).
    const user = userForRole(e2eRole);
    if (user || themeSeed) {
      await seedSession(context, user, { theme: themeSeed ?? undefined });
    }

    await installMockApi(context, {
      sessionUser: user,
      overrides: apiOverrides,
    });

    await use(context);
    await context.close();
  },

  page: async ({ page }, use) => {
    // Pin the wall clock AFTER the context exists, BEFORE any app
    // navigation. Timers keep running; Date is frozen.
    await page.clock.setFixedTime(FIXED_NOW_ISO);
    await use(page);
  },
});

export { expect };
export { STUDENT_USER };
