/**
 * qa — the r305 QA area's test fixture (Task 4).
 *
 * Modelled on tests/e2e/fixtures/e2e.ts (read for reference, never
 * imported/edited — see the qa-transport.ts re-implementation notice).
 * What every QA spec gets for free:
 *
 *  1. ISOLATION — a fresh browser context per test; nothing leaks.
 *  2. MOCK TRANSPORT — every /api/ call is fulfilled by the QA
 *     corpus (fixtures/qa-transport.ts); the Vite dev server serves
 *     the real SPA. No backend, no DB, no network.
 *  3. AUTH STATE BOOTSTRAP — `test.use({ qaRole: 'STUDENT' })` seeds
 *     `mdrk-auth` localStorage exactly the way the zustand persist
 *     store writes it, BEFORE any app script runs.
 *  4. FROZEN CLOCK — page.clock.setFixedTime(FIXED_NOW_ISO) with
 *     timezoneId UTC: deterministic Date.now()/new Date() while timers
 *     keep ticking (the same discipline as the e2e area).
 *  5. EMULATION PASSTHROUGH — viewport / locale / colorScheme AND
 *     contextOptions flow from test.use() into browser.newContext(),
 *     so the reduced-motion spec rides the real prefers-reduced-motion
 *     media query (exactly what a user's OS setting produces) via
 *     test.use({ contextOptions: { reducedMotion: 'reduce' } }) —
 *     @playwright/test 1.60 exposes reduced-motion through
 *     contextOptions, not as a top-level option.
 */
import { test as base, expect } from '@playwright/test';
import type { ViewportSize } from '@playwright/test';

import { FIXED_NOW_ISO, STUDENT_USER, type FixtureUser } from './qa-transport';
import { installQaApi, seedQaSession, type MockRouteDef } from './qa-transport';

export type QaRole = 'guest' | 'STUDENT';

export interface QaOptions {
  /** Seeded role boots the app signed-in (localStorage mdrk-auth). */
  qaRole: QaRole;
  /** Per-test mock routes — matched BEFORE the standard table.
   *  ⚠ 1 row maximum via use() (Playwright's option plumbing eats a
   *  2+ row array as a fixture tuple — the e2e area's landmine guard).
   *  Specs with 2+ extra routes register page-level routes directly. */
  qaOverrides: MockRouteDef[];
  /** Optional persisted theme to seed (madarek-theme localStorage). */
  qaThemeSeed: 'light' | 'dark' | null;
}

const BASE_URL = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

function userForRole(role: QaRole): FixtureUser | null {
  return role === 'STUDENT' ? STUDENT_USER : null;
}

export const test = base.extend<QaOptions>({
  qaRole: ['guest', { option: true }],
  qaOverrides: [[], { option: true }],
  qaThemeSeed: [null, { option: true }],

  context: async (
    { browser, qaRole, qaOverrides, qaThemeSeed, viewport, locale, colorScheme, contextOptions },
    use,
  ) => {
    if (!Array.isArray(qaOverrides)) {
      console.error(
        `[qa] qaOverrides arrived as ${typeof qaOverrides} — Playwright ate a 2+ row array as a fixture tuple; register page-level routes instead`,
      );
    }
    const context = await browser.newContext({
      // contextOptions first — the explicit keys below win when set.
      ...contextOptions,
      baseURL: BASE_URL,
      viewport: viewport as ViewportSize | null,
      locale: locale as string | undefined,
      colorScheme: colorScheme as 'light' | 'dark' | 'no-preference' | undefined,
      // Deterministic wall clock for new Date() reads (greetings,
      // ar-LY date formatting) — the runner TZ must not leak in.
      timezoneId: 'UTC',
    });

    // Seed localStorage BEFORE any app script; user null = guest.
    const user = userForRole(qaRole);
    if (user || qaThemeSeed) {
      await seedQaSession(context, user, { theme: qaThemeSeed ?? undefined });
    }

    await installQaApi(context, {
      sessionUser: user,
      overrides: qaOverrides,
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
