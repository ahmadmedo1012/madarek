#!/usr/bin/env node
/**
 * R313 baseline loader probe — precise .sl (SheetLoader) timeline from a FRESH
 * context (the loader is session-gated via sessionStorage 'madarek-intro-seen').
 * Samples the counter (.sl-pct), band scaleX, log-line on-count, presence,
 * and the exit clip-path until .sl detaches. Public page — no auth.
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
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'commit', timeout: 90000 });

  // rAF sampler installed immediately — records until .sl is gone (max 16s)
  const sampler = page.evaluate(async () => {
    const t0 = performance.now();
    const samples = [];
    let last = 0;
    let seenOnce = false;
    while (performance.now() - t0 < 16000) {
      const sl = document.querySelector('.sl');
      const pct = document.querySelector('.sl-pct');
      const band = document.querySelector('.sl-band');
      const log = document.querySelectorAll('.sl-log li[data-on="on"]');
      const main = document.querySelector('.sl-main');
      const csMain = main ? getComputedStyle(main) : null;
      const skip = document.querySelector('.sl-skip');
      const sr = document.querySelector('.sl-sr');
      samples.push({
        t: Math.round(performance.now() - t0),
        present: !!sl,
        pct: pct ? pct.textContent : null,
        band: band ? getComputedStyle(band).transform : null,
        logOn: log.length,
        clipPath: csMain ? csMain.clipPath : null,
        overflowLock: document.documentElement.style.overflow || null,
        skip: !!skip,
        sr: sr ? sr.textContent : null,
      });
      if (sl) seenOnce = true;
      if (seenOnce && !sl) { // mounted once, now gone — done
        last = Math.round(performance.now() - t0);
        break;
      }
      if (!seenOnce && performance.now() - t0 > 9000) { // never mounted (RM / gate)
        last = Math.round(performance.now() - t0);
        break;
      }
      await new Promise(r => requestAnimationFrame(r));
    }
    return { samples, seenOnce, endedAt: last, url: location.href, title: document.title };
  });

  // screenshot at ~1s and ~7s for the visual record
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, 'loader-probe-early.jpg'), type: 'jpeg', quality: 70 }).catch(() => {});
  await sleep(5000);
  await page.screenshot({ path: path.join(OUT, 'loader-probe-mid.jpg'), type: 'jpeg', quality: 70 }).catch(() => {});

  const data = await sampler;
  // thin the samples: keep transitions (value changes) + every 10th
  const thin = [];
  let prev = null;
  data.samples.forEach((s, i) => {
    const key = `${s.present}|${s.pct}|${s.logOn}|${s.clipPath}|${s.overflowLock}`;
    if (key !== prev || i % 10 === 0) thin.push(s);
    prev = key;
  });
  data.samplesThin = thin;
  delete data.samples;

  // derive the timeline
  const all = await page.evaluate(() => null).catch(() => null);
  fs.writeFileSync(path.join(OUT, 'loader-probe.json'), JSON.stringify(data, null, 1));

  const pct100 = thin.find(s => s.pct === '100%');
  const exitStart = thin.find(s => s.clipPath && s.clipPath.includes('polygon') && !s.clipPath.includes('50% 50%'));
  const detach = [...thin].reverse().find(s => s.present === false);
  const firstPresent = thin.find(s => s.present === true);
  console.log('[loader] first sample present @', firstPresent?.t, 'ms (t=0 is commit+eval install)');
  console.log('[loader] pct hits 100% @', pct100?.t, 'ms');
  console.log('[loader] log lines max:', Math.max(...thin.map(s => s.logOn)));
  console.log('[loader] overflow lock:', thin[0]?.overflowLock);
  console.log('[loader] detach observed @', detach?.t, 'ms, sampler endedAt', data.endedAt);
  await browser.close();
})().catch(e => { console.error('[loader-probe] FATAL', e); process.exit(1); });
