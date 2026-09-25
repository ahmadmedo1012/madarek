import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the frontend surface-inventory audit
 * (specs/012 T142 / WS-F6 — npm run test:audit).
 *
 * The a11y/e2e matrix originally scaffolded here (4 projects over a
 * planned tests/e2e/a11y.spec.ts — light/dark × ar/en) never shipped:
 * tests/e2e/ has never existed in git and specs/011's e2e tasks
 * (T040/T049/T062) remain unchecked. The dead projects were removed
 * (15-k P2-5); the audit project below is the only live suite. Land a
 * real e2e suite before re-adding projects + a testDir for it.
 */
export default defineConfig({
  timeout: 30_000,
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
  },
  projects: [
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
