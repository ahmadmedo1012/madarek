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
 *
 * r319-c2-g3 adds TWO iPhone-13 projects (§C6 iOS verification / §H-3
 * "WebKit-iPhone run included"), both additive — every pre-existing
 * project above is byte-identical:
 *
 *   3. `webkit-iphone`   — REAL WebKit at 390 (iPhone 13 descriptor,
 *                          Safari UA). This sandbox cannot launch
 *                          Playwright WebKit (missing libgtk/libgraphene/
 *                          gstreamer, no root to install), so the specs
 *                          skip cleanly here and GitHub CI runs them for
 *                          real (job `ios-webkit`: `npx playwright
 *                          install webkit --with-deps`). See
 *                          docs/redesign/r319/ios-verification.md.
 *
 *   4. `chromium-iphone` — the same specs on Chromium with the SAME
 *                          iPhone-13 device context: the local-truth
 *                          layer (and a CI-side bonus — it also rides
 *                          `npm run test:e2e`, which collects it under
 *                          tests/e2e).
 *
 * Both match ONLY `*.ios.e2e.ts` files. The specs drive the light/dark
 * theme matrix themselves (contexts seeded per theme), so the project
 * `use` stays at the light default; they self-skip on any non-iphone
 * project (the `e2e` project's `/\.e2e\.ts$/` pattern also matches
 * `*.ios.e2e.ts` — the guard keeps that run a no-op instead of a
 * duplicate).
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
    {
      // r319-c2-g3 — REAL WebKit at 390 (§C6 iOS verification, §H-3
      // "WebKit-iPhone run included"). The iPhone 13 descriptor (390×844
      // screen / 390×664 viewport, touch, isMobile, Safari UA) carries
      // `defaultBrowserType: 'webkit'` in playwright-core, but
      // `browserName` is pinned explicitly so the engine can never drift
      // with a descriptor refresh. Runs in GitHub CI (job `ios-webkit` —
      // ubuntu runners CAN `playwright install webkit --with-deps`); in
      // the dev sandbox the specs skip cleanly when WebKit cannot launch
      // (MADAREK_IOS_SKIP_UNSUPPORTED=1 or a failed launch — see
      // r319-ios-contracts.ios.e2e.ts). Specs: tests/e2e/*.ios.e2e.ts.
      name: 'webkit-iphone',
      testDir: './tests/e2e',
      testMatch: /\.ios\.e2e\.ts$/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        locale: 'ar',
        colorScheme: 'light',
      },
    },
    {
      // r319-c2-g3 — Chromium with the SAME iPhone-13 device context:
      // the local-truth layer for every contract the two engines share
      // (tap sticky-hover, contrast, geometry, stylesheet scans) while
      // real WebKit runs in CI. Local recipe:
      //   cd frontend && MADAREK_IOS_SKIP_UNSUPPORTED=1 \
      //     MADAREK_E2E_BASE_URL=http://localhost:<port> \
      //     npx playwright test --project=chromium-iphone
      name: 'chromium-iphone',
      testDir: './tests/e2e',
      testMatch: /\.ios\.e2e\.ts$/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        locale: 'ar',
        colorScheme: 'light',
      },
    },
    {
      // Y6 (R325) — the consent/toast/FAB BOTTOM-STACK overlap probe
      // (tests/r325/bottom-stack.spec.ts). Own testDir so the e2e/audit/
      // r305 projects and vitest stay untouched; the spec self-scales
      // its viewports (320/390/1440/1920) and drives both themes itself.
      // The .spec.ts spelling is the task-pinned name — vitest excludes
      // tests/r325/** for the same reason it excludes tests/audit/**.
      name: 'r325',
      testDir: './tests/r325',
      testMatch: /bottom-stack\.spec\.ts/,
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
