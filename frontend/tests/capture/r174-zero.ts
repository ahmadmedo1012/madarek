/**
 * r174-zero.ts — verify the zero-progress doughnut state: 0% course
 * progress with zero enrollments must render the honest empty copy,
 * not a broken chart.
 */
import { chromium } from '@playwright/test';
import { installMockApi, seedSession, STUDENT_USER } from '../e2e/fixtures/mock-transport';
import type { MockRouteDef } from '../e2e/fixtures/mock-transport';
import { STUDENT_DASHBOARD } from '../e2e/fixtures/api-fixtures';

const BASE = 'http://localhost:5173';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const zeroDash = {
    ...STUDENT_DASHBOARD,
    kpi: { ...STUDENT_DASHBOARD.kpi, courseCount: 0 },
    progress: { avgEnrollmentProgressPct: 0 },
  };
  const overrides: MockRouteDef[] = [
    { method: 'GET', path: '/me/dashboard', json: { data: zeroDash } },
    // No resume → the training arm; empty catalog → no hero at all.
    { method: 'GET', path: '/me/resume', json: { data: null } },
    { method: 'GET', path: '/training/catalog', json: { data: [] } },
  ];
  await installMockApi(ctx, { sessionUser: STUDENT_USER, overrides });
  await seedSession(ctx, STUDENT_USER, { token: 'e2e-token-student', theme: 'light' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/student/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const state = await page.evaluate(() => {
    const center = document.querySelector('.dash-doughnut-center')?.textContent ?? null;
    const progressValue = document.querySelector('.dash-progress-value')?.textContent ?? null;
    const note = document.querySelector('.dash-progress-note')?.textContent ?? null;
    const canvas = document.querySelector('.dash-doughnut canvas') as HTMLCanvasElement | null;
    const summary = document.querySelector('[data-chart-summary]')?.textContent ?? null;
    return { center, progressValue, note, canvasPresent: !!canvas, summary };
  });
  console.log('ZERO STATE:', JSON.stringify(state, null, 1));
  await page.locator('.dash-progress-card').screenshot({ path: '/tmp/r174-captures/zero-progress-card.png' });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
