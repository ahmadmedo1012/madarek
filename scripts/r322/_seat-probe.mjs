import { chromium } from 'playwright';
const seats = [
  ['.fo-hero-title', 'H1'],
  ['.pm-title', 'H2 pains'],
  ['.chapters-title', 'H2 chapters'],
  ['.wy-title', 'H2 why'],
  ['.rl-title', 'H2 roles'],
  ['.fo-cta-title', 'H2 cta'],
  ['.pr-title', 'H2 product'],
  ['.st-title', 'ST statement band'],
  ['.jt-statement-m', 'ST map readable'],
  ['.pm-card-title', 'D3 pain card'],
  ['.rl-card-title', 'D3 role card'],
  ['.jt-station-verb', 'D3 station verb'],
  ['.wy-stage-verb', 'D3 stage verb'],
  ['.jt-intro-title', 'D3 intro card'],
];
const vps = [
  { name: '1440', width: 1440, height: 900 },
  { name: '991', width: 991, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
  { name: '360', width: 360, height: 800 },
];
const browser = await chromium.launch();
for (const vp of vps) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5175/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const rows = await page.evaluate((seats) => {
    const out = [];
    for (const [sel] of seats) {
      const el = document.querySelector(sel);
      if (!el) { out.push([sel, 'MISSING']); continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const fs = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight) || fs * 1.2;
      out.push([sel, fs.toFixed(2) + 'px w' + cs.fontWeight + ' lh' + cs.lineHeight + ' lines≈' + Math.round(r.height / lh) + ' h=' + Math.round(r.height)]);
    }
    return out;
  }, seats);
  console.log('=== @' + vp.name + 'x' + vp.height + ' ===');
  for (const [sel, val] of rows) {
    const label = seats.find((s) => s[0] === sel)[1];
    console.log('  ' + label.padEnd(20) + val);
  }
  await ctx.close();
}
await browser.close();
