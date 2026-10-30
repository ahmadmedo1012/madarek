// One-off probe: reproduce the F1 preview crash with console capture.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://localhost:5173';
const EXEC = '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 400)));

await page.goto(`${BASE}/auth`, { waitUntil: 'load' });
await page.getByLabel('البريد الإلكتروني').or(page.getByPlaceholder(/بريد/)).first().fill('registrar@test.ly');
await page.locator('input[type="password"]').first().fill('12345678');
await page.getByRole('button', { name: /دخول/ }).click();
await page.waitForURL(/admin|dashboard/, { timeout: 20000 }).catch(() => {});
console.log('after login URL:', page.url());

await page.goto(`${BASE}/admin/students`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
console.log('students URL:', page.url());
await page.getByRole('button', { name: 'استيراد طلاب من ملف' }).click();
await page.waitForTimeout(1200);

const tag = String(Date.now()).slice(-6);
const csv = `الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة\nطالب,آلي الأول,probe-ui-a-${tag}@e2e.madarek.ly,90${tag}1,كلية تقنية المعلومات,علوم الحاسوب,2\n`;
const ta = page.getByLabel('محتوى ملف CSV');
console.log('textarea found:', await ta.count());
await ta.fill(csv);
await page.getByRole('button', { name: 'عرض النتائج قبل التنفيذ' }).click();
await page.waitForTimeout(6000);
const body = await page.locator('body').innerText();
console.log('---BODY (modal zone)---');
console.log(body.slice(0, 900).replace(/\n+/g, ' | '));
await browser.close();
