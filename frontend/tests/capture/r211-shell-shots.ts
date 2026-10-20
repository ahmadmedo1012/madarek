// Agent S r211 — shell verification shots (light/dark × 1440/390) via repo Playwright.
// Dev-only verification aid (not part of any test suite or CI).
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const out = (n) => `/tmp/r211-pw-${n}.png`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill('student@demo.madarek.ly');
await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('Madarek2026!');
await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
await page.waitForURL('**/student/dashboard', { timeout: 30000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(600);

// LIGHT
await page.screenshot({ path: out('dash-1440-light') });

// DARK via the real toggle (sidebar collapsed rail → stacked options)
await page.getByRole('button', { name: 'داكن' }).click();
await page.waitForTimeout(900);
const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await page.screenshot({ path: out('dash-1440-dark') });

// 390 mobile — light first (toggle back), bottom nav + drawer
await page.getByRole('button', { name: 'فاتح' }).click();
await page.waitForTimeout(600);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: out('dash-390-light') });
// open the drawer via the «المزيد» slot
await page.getByRole('button', { name: 'المزيد — فتح القائمة الكاملة' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: out('drawer-390-light') });
// close via Escape
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// dark mobile: theme toggle lives in the drawer footer on phones
await page.getByRole('button', { name: 'المزيد — فتح القائمة الكاملة' }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'داكن' }).click().catch(() => {});
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.screenshot({ path: out('dash-390-dark') });

// horizontal scroll check at the current (mobile) band
const hscroll = await page.evaluate(() => {
  const de = document.documentElement;
  return { clientW: de.clientWidth, scrollW: de.scrollWidth };
});

console.log(JSON.stringify({ themeAttr, errors: errors.slice(0, 6), hscroll }, null, 2));
await browser.close();
