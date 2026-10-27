#!/usr/bin/env node
/**
 * R320 §A2/§A3 docH ratchet probe — document scrollHeight at the five
 * ladder viewports vs the protected ratchet (±3%):
 * 1440=12,471 · 1024=10,056 · 768=12,679 · 390=11,300 · 360=10,722
 * Protocol flags: --motion (no reducedMotion override — the original
 * R319 ladder protocol), --intro (keep the intro/loader gate).
 */
import { chromium } from 'playwright-core';
import { spawnVite, waitReady, killTree, parseArgs } from './gate-lib.mjs';

const opt = parseArgs(process.argv.slice(2), { port: 4262 });
const MOTION = process.argv.includes('--motion');
const INTRO = process.argv.includes('--intro');
const LADDER = { 1440: 12471, 1024: 10056, 768: 12679, 390: 11300, 360: 10722 };

let vite = null;
const baseUrl = opt.baseUrl || `http://127.0.0.1:${opt.port}`;
if (!opt.baseUrl) {
  vite = spawnVite(opt.port);
  if (!(await waitReady(baseUrl))) { console.error('vite not up'); killTree(vite); process.exit(2); }
}
const browser = await chromium.launch();
try {
  for (const [w, h] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 800]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(MOTION ? {} : { reducedMotion: 'reduce' }), locale: 'ar' });
    if (!INTRO) {
      await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* off */ } });
    }
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => { await page.waitForTimeout(1500); });
    await page.waitForTimeout(1200);
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    const base = LADDER[w];
    const drift = ((docH - base) / base) * 100;
    const verdict = Math.abs(drift) <= 3 ? 'OK' : 'OUT';
    console.log(`${w}: docH=${docH} (ratchet ${base}) drift ${drift.toFixed(2)}% ${verdict}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  if (vite) killTree(vite);
}
