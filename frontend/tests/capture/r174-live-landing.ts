/**
 * r174-live-landing.ts — production landing probe: navigation must
 * SUCCEED (a thrown goto fails the probe — r175 fix: the r174 version
 * swallowed navigation errors with .catch(() => {}) and then printed
 * a successful result), the SPA must actually MOUNT (#root non-empty),
 * and the landing page's own content must be present (.landing root,
 * .landing-header, the مدارك brand, the Arabic document title).
 *
 * Parameterized + deterministic for release verification:
 *   BASE_URL (default https://madarek.onrender.com)
 *   CAPTURE_DIR (default /tmp/r174-captures)
 * Exit code: 0 pass · 1 fail.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'https://madarek.onrender.com';
const CAPTURE_DIR = process.env.CAPTURE_DIR ?? '/tmp/r174-captures';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  const failedApi: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 150));
  });
  page.on('response', (res) => {
    if (res.url().startsWith(BASE) && res.url().includes('/api/') && res.status() >= 400) {
      failedApi.push(`${res.status()} ${new URL(res.url()).pathname}`);
    }
  });

  // Navigation failure MUST fail the probe — no swallowed errors.
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch (e) {
    console.log(`NAVIGATION: FAIL — ${(e as Error).message.slice(0, 200)}`);
    await browser.close();
    process.exit(1);
  }

  // The SPA must MOUNT: #root must gain children (lazy chunks, fonts,
  // cold-start on Render free are all absorbed by this wait).
  try {
    await page.waitForFunction(() => {
      const root = document.querySelector('#root');
      return root !== null && root.childElementCount > 0;
    }, { timeout: 45_000, pollInterval: 500 });
  } catch {
    console.log('MOUNT: FAIL — #root stayed empty for 45s');
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2000); // settle intro/animation frames
  await mkdir(CAPTURE_DIR, { recursive: true });
  await page.screenshot({ path: `${CAPTURE_DIR}/LIVE-landing-m390.png`, fullPage: true });

  const state = await page.evaluate(() => ({
    title: document.title.slice(0, 60),
    hasRoot: !!document.querySelector('#root') && document.querySelector('#root')!.childElementCount > 0,
    hasLandingRoot: !!document.querySelector('.landing'),
    hasLandingHeader: !!document.querySelector('.landing-header'),
    hasBrand: document.querySelector('.landing-brand')?.textContent?.includes('مدارك') ?? false,
    theme: document.documentElement.getAttribute('data-theme'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  console.log('LIVE LANDING:', JSON.stringify(state));
  console.log('CONSOLE ERRORS:', errors.length > 0 ? errors.slice(0, 5) : 'none');
  console.log('FAILED API:', failedApi.length > 0 ? failedApi.slice(0, 10) : 'none');

  const pass =
    state.hasRoot &&
    state.hasLandingRoot &&
    state.hasLandingHeader &&
    state.hasBrand &&
    state.title.includes('مدارك') &&
    !state.horizontalOverflow &&
    errors.length === 0 &&
    failedApi.length === 0;
  console.log(`RESULT: ${pass ? 'PASS' : 'FAIL'} (mounted · landing content · title · no overflow · clean console)`);
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
