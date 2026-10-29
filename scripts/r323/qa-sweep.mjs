#!/usr/bin/env node
/* R323 QA — the evidence sweep: landing (light/dark × 1440/390), /__brand,
 * loader-contract probes. Screenshots → docs/redesign/r323/evidence/.
 * Usage: node scripts/r323/qa-sweep.mjs [baseURL]  (default http://localhost:5173)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = path.resolve('docs/redesign/r323/evidence');
mkdirSync(OUT, { recursive: true });

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const shotVp = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

async function main() {
  const browser = await chromium.launch();
  const reports = [];

  /* ── desktop 1440 ─────────────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500); // loader exit + reveals
    // loader contract probes
    const probe = await page.evaluate(() => ({
      logos: document.querySelectorAll('[data-logo]').length,
      fullscreen: document.querySelectorAll('[data-fullscreen-layer]').length,
      visibleFullscreen: [...document.querySelectorAll('[data-fullscreen-layer]')].filter(
        (el) => el.getClientRects().length > 0,
      ).length,
    }));
    reports.push({ viewport: '1440', probe });
    await shotVp(page, 'landing-1440-light-hero');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
    await page.waitForTimeout(1200);
    await shotVp(page, 'landing-1440-light-map');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.62));
    await page.waitForTimeout(1200);
    await shotVp(page, 'landing-1440-light-platform-roles');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await shotVp(page, 'landing-1440-light-cta-footer');
    // dark
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    await shotVp(page, 'landing-1440-dark-hero');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await shotVp(page, 'landing-1440-dark-footer');
    // brand sheet
    await page.goto(`${BASE}/__brand`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot(page, 'brand-1440-light');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(700);
    await shot(page, 'brand-1440-dark');
    await ctx.close();
  }

  /* ── phone 390 ────────────────────────────────────────────────── */
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await shotVp(page, 'landing-390-light-hero');
    const consent = await page.evaluate(() => {
      const cb = document.querySelector('.cb-banner');
      if (!cb) return { present: false };
      const r = cb.getBoundingClientRect();
      const h1 = document.querySelector('h1');
      const h1r = h1 ? h1.getBoundingClientRect() : null;
      return {
        present: true,
        barHeight: Math.round(r.height),
        bottomBar: Math.abs(r.bottom - window.innerHeight) < 4,
        coversH1: h1r ? !(h1r.bottom < r.top || h1r.top > r.bottom) : null,
      };
    });
    reports.push({ viewport: '390', consent });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await shotVp(page, 'landing-390-light-footer');
    // menu open
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const menuBtn = page.locator('button[aria-label*="القائمة"]').first();
    if (await menuBtn.count()) {
      await menuBtn.click();
      await page.waitForTimeout(900);
      await shotVp(page, 'landing-390-light-menu');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(700);
    await shotVp(page, 'landing-390-dark-hero');
    await ctx.close();
  }

  /* ── FIRST-VISIT loader probe (fresh context, no storage) ─────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const samples = [];
    await page.goto(`${BASE}/`);
    for (let i = 0; i < 12; i++) {
      const s = await page.evaluate(() => ({
        t: Date.now(),
        splash: [...document.querySelectorAll('[data-fullscreen-layer="splash"]')].filter((e) => e.getClientRects().length).length,
        sheet: [...document.querySelectorAll('[data-fullscreen-layer="sheet-loader"]')].filter((e) => e.getClientRects().length).length,
        logos: [...document.querySelectorAll('[data-logo]')].filter((e) => e.getClientRects().length).length,
      }));
      samples.push(s);
      await page.waitForTimeout(500);
    }
    reports.push({ loaderSamples: samples });
    await ctx.close();
  }

  console.log(JSON.stringify(reports, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
