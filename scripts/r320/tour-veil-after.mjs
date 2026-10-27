#!/usr/bin/env node
/**
 * R320 cycle-3 after-verify — the tour veil on PRODUCTION.
 *
 * Logs in as faculty@test.ly (its tour was never dismissed, so the
 * onboarding auto-plays), then:
 *   1. reads the computed background of .modal-overlay (must be the
 *      paper/ink 92% scrim now, not the 40% ink veil);
 *   2. captures the tour state at 390 (before: registrar-top-390.jpg
 *      showed the display-H1 stubs poking above the card);
 *   3. dumps the H1-vs-card geometry again (t=113 vs t=121 before).
 *
 * Usage: node scripts/r320/tour-veil-after.mjs [baseURL]
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'https://madarek.onrender.com';
const OUT = 'audits/evidence/r320/accounts-production';

const browser = await chromium.launch();
try {
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
  await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill('faculty@test.ly');
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('12345678');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 60_000 });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(1_500); // let the tour open + settle

  const m = await page.evaluate(() => {
    const overlay = document.querySelector('.modal-overlay');
    const card = document.querySelector('.modal-card');
    const h1 = document.querySelector('.pf-page-title');
    // Why did the scoped rule not apply? Diagnose all three legs.
    let ruleFound = null;
    let ruleSelector = null;
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin
        }
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule && /onboarding-flow\)/.test(rule.selectorText)) {
            ruleFound = rule.style.background || '(empty)';
            ruleSelector = rule.selectorText;
          }
        }
      }
    } catch {
      /* noop */
    }
    return {
      overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null,
      overlayHasOnboarding: overlay?.querySelector('.onboarding-flow') != null,
      overlayInsideHasShell: !!overlay?.closest('.has-shell'),
      scopedSelectorMatches: !!document.querySelector('.has-shell .modal-overlay:has(.onboarding-flow)'),
      builtRuleSelector: ruleSelector,
      builtRuleBg: ruleFound,
      cardTop: card ? Math.round(card.getBoundingClientRect().top) : null,
      h1Top: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
      h1Text: h1?.textContent?.trim() ?? null,
    };
  });
  console.log('measured:', JSON.stringify(m));

  await page.screenshot({ path: `${OUT}/registrar-tour-after-veil-390.jpg`, type: 'jpeg', quality: 72 });
  console.log(`shot → ${OUT}/registrar-tour-after-veil-390.jpg`);
  await ctx.close();
} finally {
  await browser.close();
}
