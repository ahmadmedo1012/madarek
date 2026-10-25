import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — two live projects (r164-k):
 *
 *   1. `e2e`   — the hermetic browser journey suite (tests/e2e/*.e2e.ts,
 *               npm run test:e2e). Every /api/ call is fulfilled
 *               by the fixture transport (tests/e2e/fixtures/
 *               mock-transport.ts), so the suite runs against the real
 *               Vite-served SPA without a backend/database. Spec files
 *               use the `.e2e.ts` suffix — deliberately NOT `.spec.ts`:
 *               vitest collects every tests/…*.{test,spec}.{ts,tsx} file and
 *               importing @playwright/test outside the Playwright
 *               runner throws (same reason tests/audit is excluded
 *               there).
 *
 *   2. `audit` — the surface-inventory producer (specs/012 T142 /
 *               WS-F6, npm run test:audit). Unchanged: skips unless
 *               AUDIT_BASELINE=1. With AUDIT_API_MOCK=1 it can also
 *               run DB-less (the e2e transport serves the pages) — see
 *               that spec's header.
 *
 * The 4-project a11y matrix that was once scaffolded here never
 * shipped and was removed (15-k P2-5) — do not re-add projects
 * without landing their specs.
 */
export default defineConfig({
  // 45s: the first navigation of each page pays the Vite dev-server
  // cold transform of that route's chunk (CI and local alike); the
  // assertions themselves settle in low seconds.
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // c4-E: sandbox worktrees run against a PRE-INSTALLED Chrome-for-
    // Testing build (Chromium 143 — the exact major @playwright/test
    // 1.60 ships) instead of `playwright install` (forbidden here —
    // CI installs its own browsers via `npx playwright install
    // chromium --with-deps` and never sets this variable, so the
    // default path stays the bundled revision in both worlds).
    launchOptions: process.env.MADAREK_E2E_EXECUTABLE
      ? { executablePath: process.env.MADAREK_E2E_EXECUTABLE }
      : {},
  },
  projects: [
    {
      // r164-k — hermetic journey specs. The shared fixtures
      // (tests/e2e/fixtures/e2e.ts) build a fresh RTL context per
      // test, seed the auth store, install the mock transport and
      // freeze the clock; each spec asserts real rendered Arabic
      // content, never just HTTP status.
      name: 'e2e',
      testDir: './tests/e2e',
      testMatch: /\.e2e\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
        locale: 'ar',
      },
    },
    {
      // WS-F6 — surface-inventory producer (audit-script.md). Own testDir
      // so Playwright never picks up the vitest suites under
      // tests/unit|gallery|motion. The spec itself skips unless
      // AUDIT_BASELINE=1 — it needs the app + a seeded DB (see its file
      // header for the local run recipe). Reach it via: npm run test:audit
      name: 'audit',
      testDir: './tests/audit',
      testMatch: /surface-inventory\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        locale: 'ar',
      },
    },
    {
      // r305 — the auth/public/shared-surfaces + independent-QA area
      // (redesign/r305-heron-auth-public-qa). Isolated testDir so the
      // existing e2e/audit projects and the vitest suites are untouched;
      // specs self-configure viewport/theme/emulation per test, so the
      // project ships no opinionated device bundle. `.e2e.ts` suffix for
      // the same vitest-exclusion reason as the `e2e` project above.
      // Reach it via: npm run test:r305
      name: 'r305',
      testDir: './tests/r305',
      testMatch: /\.e2e\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        locale: 'ar',
      },
    },
  ],
  webServer: process.env.MADAREK_E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
