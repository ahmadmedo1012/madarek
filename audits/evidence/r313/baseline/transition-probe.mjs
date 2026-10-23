#!/usr/bin/env node
/**
 * R313 baseline route-transition probe — click an internal link from / to
 * /colleges and measure the observable sweep:
 *   1. the landing-exit sweep (.sx overlay: center-out two-band polygon, 700ms)
 *   2. the incoming GuestReveal (.guest-reveal-inner: top-down inset clip, ~500ms)
 * Public pages — no auth. Loader skipped via pre-seeded sessionStorage.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const URL_ = 'https://madarek.onrender.com/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch (_) {} });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch (_) {}
  await sleep(2500);

  // bring a /colleges link into view (the CTA-section ghost button)
  const link = page.locator('a[href="/colleges"]').first();
  await link.scrollIntoViewIfNeeded();
  await sleep(1200);

  // install the rAF recorder BEFORE the click
  const recorder = page.evaluate(async () => {
    const t0 = performance.now();
    const rec = [];
    let urlChangedAt = null;
    const startUrl = location.pathname;
    let last = 0;
    while (performance.now() - t0 < 5000) {
      const sx = document.querySelector('.sx');
      const bands = document.querySelector('.sx-bands');
      const line = document.querySelector('.sx-line');
      const gri = document.querySelector('.guest-reveal-inner');
      const gr = document.querySelector('.guest-reveal');
      if (location.pathname !== startUrl && urlChangedAt === null) urlChangedAt = Math.round(performance.now() - t0);
      let griAnim = null;
      if (gri) {
        const cs = getComputedStyle(gri);
        griAnim = { clipPath: cs.clipPath, animationName: cs.animationName, animationDuration: cs.animationDuration, animationPlayState: cs.animationPlayState };
      }
      let lineAnim = null;
      if (line) {
        const cs = getComputedStyle(line);
        lineAnim = { transform: cs.transform, opacity: cs.opacity };
      }
      rec.push({
        t: Math.round(performance.now() - t0),
        url: location.pathname,
        sx: !!sx,
        sxClip: bands ? getComputedStyle(bands).clipPath : null,
        sxLine: lineAnim,
        gri: !!gri,
        griAnim,
        grKey: gr ? gr.getAttribute('data-route-key') : null,
      });
      const over = !document.querySelector('.sx') && !document.querySelector('.guest-reveal-inner')
        && location.pathname !== startUrl && performance.now() - t0 > 600;
      if (over) { last = Math.round(performance.now() - t0); break; }
      await new Promise(r => requestAnimationFrame(r));
    }
    return { startUrl, urlChangedAt, endedAt: last, n: rec.length, rec };
  });

  await sleep(150);
  await link.click();
  const data = await recorder;

  // thin: keep value changes + every 5th
  const thin = [];
  let prev = null;
  data.rec.forEach((s, i) => {
    const key = `${s.url}|${s.sx}|${String(s.sxClip).slice(0, 40)}|${s.gri}|${String(s.griAnim?.clipPath).slice(0, 40)}`;
    if (key !== prev || i % 5 === 0) thin.push(s);
    prev = key;
  });
  data.recThin = thin;

  const sxAppear = data.rec.find(s => s.sx)?.t ?? null;
  const sxGone = [...data.rec].reverse().find(s => s.sx === false && s.t > (sxAppear ?? 0))?.t ?? null;
  const griAppear = data.rec.find(s => s.gri && s.t > 100)?.t ?? null;
  const griFull = data.rec.find(s => s.gri && s.t > 100 && (s.griAnim?.clipPath === 'inset(0px 0px 0% 0px)' || /inset\(0px 0px (0%|0px)/.test(String(s.griAnim?.clipPath))))?.t ?? null;
  const lastMotion = Math.max(sxGone ?? 0, griFull ?? 0);
  delete data.rec;

  const summary = {
    clickToUrlChange: data.urlChangedAt,
    sxAppear, sxGone, sxDuration: sxAppear != null && sxGone != null ? sxGone - sxAppear : null,
    griAppear, griFull, griDuration: griAppear != null && griFull != null ? griFull - griAppear : null,
    totalPerceived: sxAppear != null && lastMotion > 0 ? lastMotion - sxAppear : null,
    endedAt: data.endedAt,
  };
  data.summary = summary;
  fs.writeFileSync(path.join(OUT, 'transition-probe.json'), JSON.stringify(data, null, 1));
  console.log('[transition] summary:', JSON.stringify(summary));

  // post-transition screenshot of /colleges
  await sleep(600);
  await page.screenshot({ path: path.join(OUT, 'transition-after-colleges.jpg'), type: 'jpeg', quality: 70 }).catch(() => {});
  await browser.close();
})().catch(e => { console.error('[transition] FATAL', e); process.exit(1); });
