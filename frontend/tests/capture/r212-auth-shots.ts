// Agent S r212 — auth verification shots (dev-only, not part of CI).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs: string[] = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/auth-1440-light.png' });
await page.getByRole('button', { name: 'داكن' }).click().catch(() => {});
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/auth-1440-dark.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/auth-390-dark.png' });
const h = await page.evaluate(() => ({ cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
console.log(JSON.stringify({ errs: errs.slice(0, 4), h }));
await browser.close();
