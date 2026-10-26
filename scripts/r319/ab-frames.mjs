import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:4245';

const variants = {
  none: '',
  svgHidden: 'svg{visibility:hidden !important}',
  planHidden: '.jt-plan{visibility:hidden !important}',
  introStmtHidden: '.jt-intro,.jt-statement{visibility:hidden !important}',
  noRevealTransitions: '.reveal-up,.reveal-d-1,.reveal-d-2,.reveal-d-3,.reveal-d-4,.reveal-d-5,.wr-i,.wr-scrub{transition:none !important}',
  noSide: '.jt-side{visibility:hidden !important}',
  cvBelowFold: 'section.rl-section,section.pr-section,.wy-section,section.fo-cta,footer{content-visibility:auto;contain-intrinsic-size:auto 900px}',
};

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
for (const [name, css] of Object.entries(variants)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (css) {
    await page.addInitScript((c) => {
      const s = document.createElement('style');
      s.textContent = c;
      document.documentElement.appendChild(s);
    }, css);
  }
  await page.addInitScript(() => {
    window.__frames = [];
    const rec = (t) => { window.__frames.push(t); window.__raf = requestAnimationFrame(rec); };
    window.__startRec = () => { window.__frames = []; window.__raf = requestAnimationFrame(rec); };
    window.__stopRec = () => cancelAnimationFrame(window.__raf);
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__startRec());
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(80); }
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(80); }
  await page.waitForTimeout(400);
  const frames = await page.evaluate(() => { window.__stopRec(); return window.__frames; });
  const deltas = [];
  for (let i = 1; i < frames.length; i++) deltas.push(frames[i] - frames[i - 1]);
  deltas.sort((a, b) => a - b);
  const pct = (p) => deltas.length ? deltas[Math.min(deltas.length - 1, Math.floor(p * deltas.length))] : 0;
  const gt = (ms) => deltas.filter((d) => d > ms).length;
  console.log(name.padEnd(20), `n=${deltas.length}`, `>33ms=${(100 * gt(33) / deltas.length).toFixed(1)}%`, `>20ms=${(100 * gt(20) / deltas.length).toFixed(1)}%`, `p95=${pct(0.95).toFixed(1)}ms`, `max=${Math.max(0, ...deltas).toFixed(1)}ms`);
  await page.close();
}
await browser.close();
