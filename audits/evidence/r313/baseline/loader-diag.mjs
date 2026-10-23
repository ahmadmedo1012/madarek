#!/usr/bin/env node
/**
 * R313 baseline loader DIAGNOSTIC — why does .sl detach ~20ms after the exit
 * clip-path appears (loader-probe.mjs) instead of playing the designed 650ms
 * exit? Tracks document.getAnimations() (playState/effect target) + .sl
 * presence + introDone class flips, full-resolution samples.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const URL_ = 'https://madarek.onrender.com/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'commit', timeout: 90000 });

  const data = await page.evaluate(async () => {
    const t0 = performance.now();
    const out = [];
    let seenOnce = false;
    while (performance.now() - t0 < 14000) {
      const sl = document.querySelector('.sl');
      if (sl) seenOnce = true;
      const anims = document.getAnimations().map(a => {
        let target = null;
        try { target = a.effect?.target?.className ? String(a.effect.target.className).slice(0, 40) : String(a.effect?.target?.tagName || ''); } catch (_) {}
        let clip = null;
        try { clip = (a.effect?.getKeyframes?.() || []).map(k => k.clipPath).filter(Boolean).join('→').slice(0, 60); } catch (_) {}
        return { s: a.playState, ct: Math.round(a.currentTime || 0), tgt: target, clip };
      }).filter(a => /sl|sx|guest/.test(a.tgt || '') || (a.clip || '').includes('polygon'));
      out.push({
        t: Math.round(performance.now() - t0),
        sl: !!sl,
        landingCls: document.querySelector('.landing') ? String(document.querySelector('.landing').className) : null,
        slPct: document.querySelector('.sl-pct')?.textContent || null,
        anims,
      });
      if (seenOnce && !sl) break;
      if (!seenOnce && performance.now() - t0 > 9000) break;
      await new Promise(r => requestAnimationFrame(r));
    }
    return out;
  });

  fs.writeFileSync(path.join(OUT, 'loader-diag.json'), JSON.stringify(data, null, 1));
  // print the exit window: first sample where landingCls contains intro-done
  const idx = data.findIndex(s => /intro-done/.test(s.landingCls || ''));
  const from = Math.max(0, (idx ?? data.length - 5) - 6);
  for (const s of data.slice(from, from + 40)) {
    console.log(JSON.stringify(s));
  }
  await browser.close();
})().catch(e => { console.error('[loader-diag] FATAL', e); process.exit(1); });
