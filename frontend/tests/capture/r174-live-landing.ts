import { chromium } from '@playwright/test';
const BASE = 'https://madarek.onrender.com';
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/r174-captures/LIVE-landing-m390.png' });
  const state = await page.evaluate(() => ({
    title: document.title.slice(0, 60),
    hasRoot: !!document.querySelector('#root'),
    theme: document.documentElement.getAttribute('data-theme'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  console.log('LIVE LANDING:', JSON.stringify(state), 'pageErrors:', errors.length);
  await browser.close();
}
main();
