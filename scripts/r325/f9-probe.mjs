// Probe: the F9 owner toggle steps with debug, find the stall.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5207';
const API = 'http://localhost:4000';
const EXEC = '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';

const login = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@test.ly', password: '12345678' }) });
const { data } = await login.json();

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.addInitScript(() => sessionStorage.setItem('madarek-intro-skip', '1'));
await page.addInitScript((s) => localStorage.setItem('mdrk-auth', s), JSON.stringify({ state: { user: data.user, accessToken: data.accessToken, isAuthenticated: true }, version: 0 }));

await page.goto('/owner/users');
await page.waitForTimeout(3000);
console.log('h1:', await page.locator('h1').first().innerText());
await page.getByPlaceholder('ابحث بالاسم أو البريد الإلكتروني…').fill('@demo.madarek.ly');
await page.waitForTimeout(2500);
const rows = page.locator('.pf-row', { hasText: '@demo.madarek.ly' });
console.log('rows:', await rows.count());
const row = rows.first();
console.log('row text head:', (await row.innerText()).slice(0, 120).replace(/\n/g, ' | '));
const actions = row.getByRole('button', { name: /إجراءات / });
console.log('actions btn count:', await actions.count());
if (await actions.isVisible().catch(() => false)) { await actions.click(); console.log('clicked actions disclosure'); } else console.log('actions not visible — trailing تعطيل directly visible?');
await page.waitForTimeout(800);
const disable = row.getByRole('button', { name: 'تعطيل' }).first();
console.log('تعطيل count:', await row.getByRole('button', { name: 'تعطيل' }).count());
await disable.click();
console.log('clicked تعطيل');
await page.waitForTimeout(1500);
const dialogs = page.getByRole('dialog');
console.log('dialogs:', await dialogs.count());
const dialog = dialogs.first();
if (await dialog.isVisible().catch(() => false)) {
  console.log('dialog text:', (await dialog.innerText()).slice(0, 200).replace(/\n/g, ' | '));
  const confirmBtn = dialog.getByRole('button', { name: 'تعطيل الحساب' });
  console.log('confirm btn:', await confirmBtn.count());
  await confirmBtn.click();
  console.log('clicked confirm');
  await page.waitForTimeout(3000);
  console.log('badge معطّل count:', await row.getByText('معطّل').count());
  console.log('row text head now:', (await row.innerText()).slice(0, 140).replace(/\n/g, ' | '));
} else {
  console.log('NO DIALOG after تعطيل click');
}
await browser.close();
// ── extended: the remaining F9 owner steps ──
console.log('--- screenshot (flowShot equivalent) ---');
const t0 = Date.now();
await page.screenshot({ path: '/tmp/f9-probe-shot.png', fullPage: false, animations: 'disabled' });
console.log('screenshot done in', Date.now() - t0, 'ms');
console.log('--- تفعيل ---');
const enable = row.getByRole('button', { name: 'تفعيل' });
console.log('تفعيل visible:', await enable.isVisible().catch(() => false));
await enable.click();
await page.waitForTimeout(1200);
const d2 = page.getByRole('dialog');
console.log('dialog2:', await d2.count());
await d2.first().getByRole('button', { name: 'تفعيل الحساب' }).click();
await page.waitForTimeout(2500);
console.log('نشط count:', await row.getByText('نشط').count());
console.log('--- /owner/activity ---');
const t1 = Date.now();
await page.goto('/owner/activity', { waitUntil: 'load' });
await page.waitForTimeout(4000);
console.log('activity h1:', await page.locator('h1').first().innerText(), 'in', Date.now() - t1, 'ms');
console.log('تعديل حالة الحساب count:', await page.getByText('تعديل حالة الحساب').count());
console.log('--- /owner/system ---');
const t2 = Date.now();
await page.goto('/owner/system', { waitUntil: 'load' });
await page.waitForTimeout(4000);
console.log('system h1:', await page.locator('h1').first().innerText(), 'in', Date.now() - t2, 'ms');
console.log('إعدادات المنصّة count:', await page.getByText('إعدادات المنصّة').count());
console.log('حالة الخدمة count:', await page.getByText('حالة الخدمة').count());
await browser.close();
