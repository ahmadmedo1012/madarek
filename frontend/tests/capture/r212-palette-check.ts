// Agent S r212 — ⌘K palette honesty check, v2 (dev-only).
import { chromium } from 'playwright';

// R320 §C — credentials come from the shared test-account table
// (the PHYSICAL module — this tsx harness doesn't need the @shared
// vite alias; see shared/testAccounts.ts for the consumer map).
import { TEST_PASSWORD, testAccountForJob } from '../../../backend/src/modules/auth/test-accounts.data';

const STUDENT_EMAIL = testAccountForJob('طالب')!.email;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs: string[] = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const reqs: string[] = [];
page.on('request', (r) => { if (r.url().includes('/search/global')) reqs.push(r.url()); });

await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(TEST_PASSWORD);
await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill(STUDENT_EMAIL);
await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
await page.waitForURL('**/student/dashboard', { timeout: 30000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2500); // let the dashboard settle

await page.keyboard.press('Control+k');
await page.waitForTimeout(800);
const openAfterChord = await page.evaluate(() => !!document.querySelector('.cmd-palette-card[role="dialog"]'));
await page.screenshot({ path: '/tmp/palette-open.png' });

await page.keyboard.type('هندسة');
await page.waitForTimeout(1800);
const paletteText = await page.evaluate(() => document.querySelector('.cmd-palette-card')?.textContent?.slice(0, 500) ?? 'NO CARD');
const rowTexts = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.cmd-palette-card .search-row-title')).slice(0, 6).map((el) => el.textContent),
);
await page.screenshot({ path: '/tmp/palette-results.png' });
console.log(JSON.stringify({ openAfterChord, errs: errs.slice(0, 5), searchCalls: reqs.length, rowTexts, paletteText }, null, 1));
await browser.close();
