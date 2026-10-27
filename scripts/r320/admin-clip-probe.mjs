#!/usr/bin/env node
/**
 * R320 cycle-3 probe — two production questions in one run:
 *
 *  1. DEMO PANEL SHOT: re-capture the /auth demo panel at 390 with the
 *     rows scrolled into the frame (the login-proof panel shot caught
 *     only the form's top — rows counted but not visible in evidence).
 *  2. ADMIN DASHBOARD CLIP: the VLM review of the production registrar
 *     screenshot reported "text at the top of the white card heavily
 *     clipped — only bottom halves of characters". Find the offender:
 *     every element whose own box clips its text (scrollHeight >
 *     clientHeight with overflow hidden) or whose line-box text
 *     overflows the element's content box vertically.
 *
 * Usage:
 *   node scripts/r320/admin-clip-probe.mjs [baseURL]
 *   (default https://madarek.onrender.com)
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'https://madarek.onrender.com';
const OUT = 'audits/evidence/r320/accounts-production';

const EMAIL = 'registrar@test.ly';
const PASSWORD = '12345678';

const browser = await chromium.launch();
try {
  /* ── 1. demo panel shot (scrolled into view) ─────────────────── */
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
    await page.locator('.auth-demo-hint-reopen').click();
    const rows = page.locator('.auth-demo-row');
    await rows.first().waitFor({ state: 'visible', timeout: 15_000 });
    await rows.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/demo-panel-390.jpg`, type: 'jpeg', quality: 72 });
    console.log(`panel rows: ${await rows.count()} → ${OUT}/demo-panel-390.jpg (re-shot, scrolled)`);
    await ctx.close();
  }

  /* ── 2. admin dashboard clip audit ───────────────────────────── */
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
    await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill(EMAIL);
    await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 60_000 });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1_200); // let the data settle

    await page.screenshot({ path: `${OUT}/registrar-top-390.jpg`, type: 'jpeg', quality: 72 });

    /* The VLM says unreadable text stubs at top-center y≈115-125 while
     * the ONBOARDING TOUR is open (onboardingCompletedAt=null → frame 1
     * auto-plays). Dump everything in that band + the tour card's own
     * geometry, then dismiss and shoot the clean dashboard. */
    const band = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!(el instanceof HTMLElement)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom < 90 || r.top > 150 || r.width === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const ownText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim())
          .join(' ')
          .trim();
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          text: ownText.slice(0, 40) || null,
          rect: { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), x: Math.round(r.x), w: Math.round(r.width) },
          clip: `${cs.overflow}/${cs.overflowY}`,
          z: cs.zIndex,
        });
      }
      return out.slice(0, 30);
    });
    console.log('\ntour-open band y≈90-150 dump:');
    for (const b of band) console.log(JSON.stringify(b));

    // Dismiss the tour (تخطي) and capture the CLEAN dashboard.
    const skip = page.getByRole('button', { name: 'تخطي' });
    if (await skip.count()) {
      await skip.first().click();
      await page.waitForTimeout(900);
    }
    await page.screenshot({ path: `${OUT}/registrar-dashboard-390.jpg`, type: 'jpeg', quality: 72 });
    console.log(`\nclean dashboard → ${OUT}/registrar-dashboard-390.jpg`);

    const findings = await page.evaluate(() => {
      const out = [];
      const els = document.querySelectorAll('body *');
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const ownText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim())
          .join(' ')
          .trim();
        if (!ownText) continue;
        const clipsVertically =
          el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
        const hiddenOverflow = /hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY);
        // Text taller than the line boxes can show (font clipped by a
        // too-short fixed height or a negative bottom margin pattern).
        const range = document.createRange();
        range.selectNodeContents(el);
        const textRect = range.getBoundingClientRect();
        const boxRect = el.getBoundingClientRect();
        const textBelowBox = textRect.bottom - boxRect.bottom;
        const textAboveBox = boxRect.top - textRect.top;
        if (clipsVertically && hiddenOverflow) {
          out.push({
            kind: 'scroll-clip',
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 80),
            text: ownText.slice(0, 60),
            scrollH: el.scrollHeight,
            clientH: el.clientHeight,
            scrollW: el.scrollWidth,
            clientW: el.clientWidth,
          });
        } else if (textBelowBox > 3 || textAboveBox > 3) {
          out.push({
            kind: 'text-outside-box',
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 80),
            text: ownText.slice(0, 60),
            textBelowBox: Math.round(textBelowBox),
            textAboveBox: Math.round(textAboveBox),
            boxH: Math.round(boxRect.height),
          });
        }
      }
      return out.slice(0, 25);
    });

    console.log(`\nadmin/dashboard @390 clip audit — ${findings.length} candidate(s):`);
    for (const f of findings) console.log(JSON.stringify(f));
    if (!findings.length) console.log('(no mechanical clip found — VLM finding may be a font crop inside canvas/SVG or a transform; inspect registrar-top-390.jpg)');
    await ctx.close();
  }
} finally {
  await browser.close();
}
