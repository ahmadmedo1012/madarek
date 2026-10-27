#!/usr/bin/env node
/** r321-a1-invalidation.mjs — CDP trace with blink style invalidation
 *  tracking during a short wheel scroll: names the dirty elements and
 *  the invalidation reasons (the 30–180ms UpdateLayoutTree events). */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4173';
const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
})();

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const chunks = [];
await cdp.send('Tracing.start', {
  transferMode: 'ReportEvents',
  streamFormat: 'json',
  categories: 'devtools.timeline,disabled-by-default-blink.style,disabled-by-default-devtools.timeline.frame',
});
cdp.on('Tracing.tracingComplete', () => {});
cdp.on('Tracing.dataCollected', (d) => chunks.push(...d.value));
cdp.on('Tracing.tracingBufferUsage', () => {});

// short scroll: 6 steps down through the chapters band (the worst zone)
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(100); }
await page.waitForTimeout(800);
await cdp.send('Tracing.end');
await page.waitForTimeout(1500);

fs.mkdirSync('/tmp/mdrk-r321', { recursive: true });
fs.writeFileSync('/tmp/mdrk-r321/invalidation.jsonl', chunks.map((e) => JSON.stringify(e)).join('\n'));
console.log('events:', chunks.length);

// parse: style invalidation events
const invalidations = chunks.filter((e) => /style/i.test(e.name || '') && e.name !== 'UpdateLayoutTree');
const recalc = chunks.filter((e) => e.name === 'UpdateLayoutTree');
console.log('style-ish events:', invalidations.length, '| recalcs:', recalc.length,
  '| recalc total ms:', (recalc.reduce((a, e) => a + (e.dur || 0), 0) / 1000).toFixed(0));

const byName = {};
for (const e of invalidations) byName[e.name] = (byName[e.name] || 0) + 1;
console.log('kinds:', JSON.stringify(byName, null, 1));
await browser.close();
