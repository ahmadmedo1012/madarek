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

import { FIXED_NOW_ISO, STUDENT_USER, ADMIN_USER, QUALITY_USER, TEACHER_USER, type FixtureUser } from './api-fixtures';
import { installMockApi, seedSession, type MockRouteDef } from './mock-transport';

export type E2eRole = 'guest' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';

export interface E2eOptions {
  /** Seeded role boots the app signed-in (localStorage mdrk-auth). */
  e2eRole: E2eRole;
  /** Per-test mock routes — matched BEFORE the standard table.
   *  ⚠ 1 row maximum: Playwright's option plumbing eats a 2+ row array
   *  as a fixture tuple (the landmine guard below fires loudly). Specs
   *  with 2+ extra routes use installStatefulApi instead. */
  apiOverrides: MockRouteDef[];
  /** Optional persisted theme to seed (madarek-theme localStorage). */
  themeSeed: 'light' | 'dark' | null;
  /** r305-A4: the standard Playwright context option, re-registered as an
   *  explicit option fixture so the custom context fixture below can
   *  forward it (the built-in one is not a registered parameter here). */
  reducedMotion: 'reduce' | 'no-preference';
}

const BASE_URL = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

/**
 * The seeded role's user. r164-k shipped STUDENT only; r165h opens
 * the staff roles (TEACHER / ADMIN / QUALITY) so the grading,
 * course-delete and moderation journeys can boot signed-in the exact
 * same reload-style way (same persist substrate, same dynamic
 * /auth/me). OWNER stays audit-sweep-only — no journey spec rides it.
 */
function userForRole(role: E2eRole): FixtureUser | null {
  if (role === 'STUDENT') return STUDENT_USER;
  if (role === 'TEACHER') return TEACHER_USER;
  if (role === 'ADMIN') return ADMIN_USER;
  if (role === 'QUALITY') return QUALITY_USER;
  return null;
}

export const test = base.extend<E2eOptions>({
  e2eRole: ['guest', { option: true }],
  apiOverrides: [[], { option: true }],
  themeSeed: [null, { option: true }],
  /* r305-A4 (integration review): the built-in `reducedMotion` context
     option is NOT a registered fixture parameter in this @playwright/test
     (the custom context fixture can't destructure it — "unknown
     parameter"), so the option is re-registered here as an explicit
     option fixture and forwarded into newContext below. Specs keep the
     standard spelling `test.use({ reducedMotion: 'reduce' })`. */
  reducedMotion: ['no-preference', { option: true }],

  context: async (
    { browser, e2eRole, apiOverrides, themeSeed, viewport, locale, colorScheme, reducedMotion },
    use,
  ) => {
    // Landmine guard (r165h): Playwright's option plumbing treats a
    // use() value of [a, b] (ANY array whose second element is an
    // object — common/fixtures.js isFixtureTuple) as a [value, options]
    // TUPLE, so a 2+ row apiOverrides array silently loses every row
    // after the first. Specs needing 2+ extra routes must ride
    // installStatefulApi (page-level) instead. Loud, never silent.
    if (!Array.isArray(apiOverrides)) {
      console.error(
        `[e2e] apiOverrides arrived as ${typeof apiOverrides} — Playwright ate a 2+ row array as a fixture tuple; route extra fixtures through installStatefulApi`,
      );
    }
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: viewport as ViewportSize | null,
      locale: locale as string | undefined,
      colorScheme: colorScheme as 'light' | 'dark' | 'no-preference' | undefined,
      // r305-A4 (integration review): forward the standard context
      // option — the custom fixture used to DROP it, so specs asking
      // for reduced motion silently ran without the emulation
      // (matchMedia stayed false and the 0.01ms belts never armed).
      reducedMotion: reducedMotion as 'reduce' | 'no-preference' | null | undefined,
      // Deterministic wall clock for new Date().getHours() (greeting)
      // and date formatting (ar-LY) — runner TZ can vary.
      timezoneId: 'UTC',
    });

    // r308 → R313: the entrance loader REPLAYS ON EVERY FULL PAGE LOAD
    // (Heron parity — the seen-flag no longer suppresses; the loader's
    // own spec clears the skip key when it needs the entrance to
    // play). Seed the dedicated skip key BEFORE any app script so
    // task-focused journeys boot straight into the page.
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('madarek-intro-skip', '1');
      } catch {
        /* storage denied — the page stands complete anyway */
      }
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
