import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the frontend a11y + e2e suite.
 *
 * See specs/011-platform-completeness-uplift/research.md R-002 — the suite
 * runs the same spec files four times (light × dark × ar × en) so the
 * a11y matrix in tests/e2e/a11y.spec.ts produces 9 routes × 4 = 36 cases.
 */
export default defineConfig({
  testDir: './tests/e2e',
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
      name: 'light-ar',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        locale: 'ar',
        extraHTTPHeaders: { 'Accept-Language': 'ar' },
      },
    },
    {
      name: 'light-en',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        locale: 'en-US',
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en' },
      },
    },
    {
      name: 'dark-ar',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        locale: 'ar',
        extraHTTPHeaders: { 'Accept-Language': 'ar' },
      },
    },
    {
      name: 'dark-en',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        locale: 'en-US',
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en' },
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
