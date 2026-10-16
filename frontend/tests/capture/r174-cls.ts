/**
 * r174-cls.ts — live skeleton-footprint verification (the probe the
 * loading-closure unit test points at): stalls /me/dashboard and
 * /me/resume, then measures the pending vs resolved heights of the
 * resume hero and the premium hero pair at the three layout bands.
 *
 * The pending footprint must EQUAL the resolved one at every band
 * (the r174 per-breakpoint ladders in student.css):
 *   resume:          176px >640 · 224px ≤640
 *   hero pair: [218,218] >1024 · [156,218] 641–1024 · [156,302] ≤640
 *
 * Run from frontend/ (needs the Vite dev server on :5173):
 *   npx tsx tests/capture/r174-cls.ts
 */
import { chromium } from '@playwright/test';
import { installMockApi, seedSession, STUDENT_USER } from '../e2e/fixtures/mock-transport';

const BASE = 'http://localhost:5173';

const BANDS: Array<[string, number]> = [
  ['m390', 390],
  ['tbl768', 768],
  ['d1280', 1280],
];

const STALL_MS = 900;

async function measure(page: import('@playwright/test').Page, sel: string): Promise<number[]> {
  return page.evaluate((s) => {
    const rows = Array.from(document.querySelectorAll(s)) as HTMLElement[];
    return rows.map((r) => Math.round(r.getBoundingClientRect().height));
  }, sel);
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  let failures = 0;
  for (const [name, w] of BANDS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
    await installMockApi(ctx, { sessionUser: STUDENT_USER });
    await seedSession(ctx, STUDENT_USER, { token: 'e2e-token-student', theme: 'light' });
    const page = await ctx.newPage();
    // Stall both aggregates so the pending skeletons are measurable.
    await page.route('**/api/**/me/resume', async (route) => {
      await new Promise((r) => setTimeout(r, STALL_MS));
      await route.fallback();
    });
    await page.route('**/api/**/me/dashboard', async (route) => {
      await new Promise((r) => setTimeout(r, STALL_MS));
      await route.fallback();
    });
    await page.goto(`${BASE}/student/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.dash-hero-row', { timeout: 15_000 });
    await page.waitForTimeout(150);
    const pendResume = await measure(page, '.dash-resume');
    const pendHero = await measure(page, '.dash-hero-row > *');
    await page.waitForTimeout(STALL_MS + 1800);
    const resResume = await measure(page, '.dash-resume');
    const resHero = await measure(page, '.dash-hero-row > *');

    const resumeOk = JSON.stringify(pendResume) === JSON.stringify(resResume);
    const heroOk = JSON.stringify(pendHero) === JSON.stringify(resHero);
    if (!resumeOk || !heroOk) failures++;
    console.log(
      `${name}: resume ${JSON.stringify(pendResume)}→${JSON.stringify(resResume)} ${resumeOk ? 'OK' : '✗ MISMATCH'} · ` +
      `hero ${JSON.stringify(pendHero)}→${JSON.stringify(resHero)} ${heroOk ? 'OK' : '✗ MISMATCH'}`,
    );
    await ctx.close();
  }
  await browser.close();
  if (failures > 0) {
    console.error(`${failures} band(s) mismatch — footprints drifted`);
    process.exit(1);
  }
  console.log('all bands stable — pending == resolved');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
