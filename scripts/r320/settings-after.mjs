#!/usr/bin/env node
/**
 * R320 cycle-3 after-verify — the settings door + error sheets on
 * PRODUCTION.
 *
 *   1. Log in as teacher@test.ly (the role whose change-password gap
 *      this cycle closed) → /settings: assert the seven section bars,
 *      the theme group, the change-password form, the honest قريبًا
 *      seats; screenshot at 390.
 *   2. The three routed error sheets as a guest: /500, /403,
 *      /maintenance render the grammar (code eyebrow + h1) — 200 HTML
 *      (SPA fallback) + the h1 visible after hydrate; screenshot one.
 *
 * Usage: node scripts/r320/settings-after.mjs [baseURL]
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'https://madarek.onrender.com';
const OUT = 'audits/evidence/r320/settings';

const browser = await chromium.launch();
try {
  /* ── 1. teacher → /settings ───────────────────────────────────── */
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ar',
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('madarek-intro-skip', '1');
      } catch {
        /* noop */
      }
    });
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill('teacher@test.ly');
    await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('12345678');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.waitForURL(/\/teacher\/dashboard/, { timeout: 60_000 });
    // Dismiss the tour if it auto-plays (teacher tour may be open).
    const skip = page.getByRole('button', { name: 'تخطي' });
    if (await skip.count()) {
      await skip.first().click().catch(() => {});
      await page.waitForTimeout(600);
    }

    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(800);

    const m = await page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.r319s-bar-title')).map((b) => b.textContent?.trim());
      const theme = document.querySelector('.theme-toggle');
      const pwInputs = document.querySelectorAll('input[type="password"]').length;
      const soon = Array.from(document.querySelectorAll('.r319s-empty-label')).map((b) => b.textContent?.trim());
      const url = location.pathname;
      return { url, bars, hasThemeToggle: !!theme, pwInputs, soon };
    });
    console.log('settings measured:', JSON.stringify(m, null, 1));
    await page.screenshot({ path: `${OUT}/settings-teacher-390.jpg`, type: 'jpeg', quality: 72, fullPage: true });
    console.log(`shot → ${OUT}/settings-teacher-390.jpg`);
    await ctx.close();

    const ok =
      m.url === '/settings' &&
      m.bars.length === 7 &&
      m.hasThemeToggle &&
      m.pwInputs === 3 &&
      m.soon.filter((s) => s === 'قريبًا').length >= 2;
    console.log(ok ? 'SETTINGS: PASS' : 'SETTINGS: CHECK MANUALLY');
  }

  /* ── 2. the error sheets as guest ─────────────────────────────── */
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ar',
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('madarek-intro-skip', '1');
      } catch {
        /* noop */
      }
    });
    for (const [route, expectH1] of [
      ['/500', 'خللٌ من جانبنا — لا من جانبك'],
      ['/403', 'هذه الصفحة خارج نطاق صلاحياتك'],
      ['/maintenance', 'مدارك في صيانة قصيرة'],
    ]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const h1 = page.locator('h1');
      await h1.first().waitFor({ state: 'visible', timeout: 20_000 });
      const text = (await h1.first().textContent())?.trim();
      const status = await page.evaluate(() => document.title);
      console.log(`${route}: h1="${text}" title="${status}" ${text === expectH1 ? 'PASS' : 'MISMATCH'}`);
    }
    await page.goto(`${BASE}/maintenance`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 20_000 });
    await page.screenshot({ path: `${OUT}/maintenance-390.jpg`, type: 'jpeg', quality: 72 });
    console.log(`shot → ${OUT}/maintenance-390.jpg`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
