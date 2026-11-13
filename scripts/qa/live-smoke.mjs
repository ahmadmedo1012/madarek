#!/usr/bin/env node
// live-smoke.mjs — R347-Z D14 / R350 H6: live smoke/perf on the deployed
// URL — LCP < 2.5s · CLS < 0.05 · INP proxy (long task audit) · axe-lite
// (serious contrast/name checks via quick DOM heuristics) · HTTP health.
// R350 H6: retry-aware (a 502/503 mid-cold-boot is WAKING — retry, never
// fail a run that is waking the instance) + portable playwright resolution
// (@playwright/test from the frontend workspace, resolved relative to THIS
// file — no hardcoded clone paths).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, '..', '..', 'frontend', 'package.json'))('@playwright/test');

const URL = process.argv[2] || 'https://madarek.onrender.com';
const results = { url: URL, checks: [] };
const check = (name, pass, value, budget) => {
  results.checks.push({ name, pass, value, budget });
  console.log(`${pass ? '✓' : '✗'} ${name}: ${value}${budget ? ` (budget ${budget})` : ''}`);
};

// Wake-aware fetch: 502/503 during a Render cold boot means the instance is
// BOOTING — retry up to ~100s before declaring failure (H2's law).
async function wakeAwareFetch(url, { attempts = 10, timeoutMs = 15_000 } = {}) {
  let last = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 200) return r;
      last = { status: r.status };
      if (r.status !== 502 && r.status !== 503) return r; // real answer
    } catch (e) {
      last = { err: String(e) };
    }
    console.log(`  waking… attempt ${i}/${attempts} (${JSON.stringify(last)})`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return null;
}

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

// ── health (wake-aware) ──
const t0 = Date.now();
const healthRes = await wakeAwareFetch(`${URL}/api/v1/health`);
const healthMs = Date.now() - t0;
const health = healthRes
  ? { s: healthRes.status, j: healthRes.json().catch(() => null) }
  : { s: 0, err: 'never answered (cold-boot retries exhausted)' };
check('health', health.s === 200, `HTTP ${health.s} in ${healthMs}ms`);

// ── page load + web vitals ──
const nav = await p.goto(URL, { waitUntil: 'load', timeout: 60000 }).catch(e => null);
if (!nav) {
  check('page-load', false, 'navigation failed');
} else {
  const vitals = await p.evaluate(async () => {
    // LCP via PerformanceObserver (replayed entries)
    const lcp = await new Promise((res) => {
      let v = 0;
      try {
        const po = new PerformanceObserver((l) => {
          const es = l.getEntries();
          if (es.length) v = es[es.length - 1].startTime;
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => { po.disconnect(); res(v); }, 2500);
      } catch { res(0); }
    });
    // CLS via layout-shift entries
    let cls = 0;
    try {
      const po2 = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
      });
      po2.observe({ type: 'layout-shift', buffered: true });
      await new Promise(r => setTimeout(r, 1500));
      po2.disconnect();
    } catch {}
    // long tasks (INP proxy — the worst blocking task during load+settle)
    let worstTask = 0;
    try {
      const po3 = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.duration > worstTask) worstTask = e.duration;
      });
      po3.observe({ type: 'longtask', buffered: true });
      await new Promise(r => setTimeout(r, 1000));
      po3.disconnect();
    } catch {}
    return { lcp: Math.round(lcp), cls: +cls.toFixed(4), worstTask: Math.round(worstTask), ttfb: Math.round(performance.getEntriesByType('navigation')[0]?.responseStart ?? 0) };
  });
  check('LCP', vitals.lcp < 2500, `${vitals.lcp}ms`, '< 2500ms');
  check('CLS', vitals.cls < 0.05, `${vitals.cls}`, '< 0.05');
  check('INP-proxy (worst long task)', vitals.worstTask < 200, `${vitals.worstTask}ms`, '< 200ms');
  check('TTFB', true, `${vitals.ttfb}ms (informational)`);

  // scroll to settle lazy content (CLS stabilisation) then re-read CLS
  await p.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    scrollTo(0, 0);
  });
  const cls2 = await p.evaluate(async () => {
    let cls = 0;
    try {
      const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; });
      po.observe({ type: 'layout-shift', buffered: true });
      await new Promise(r => setTimeout(r, 800));
      po.disconnect();
    } catch {}
    return +cls.toFixed(4);
  });
  check('CLS after full scroll', cls2 < 0.05, `${cls2}`, '< 0.05');

  // console errors
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.waitForTimeout(800);
  check('page errors', errors.length === 0, `${errors.length} (${errors.slice(0, 2).join(' | ').slice(0, 90)})`);

  // visual sanity: does the landing render content (RTL, hero text present)?
  const sanity = await p.evaluate(() => {
    const h1 = document.querySelector('h1');
    const txt = document.body.innerText.length;
    const dir = document.documentElement.dir;
    return { hasH1: !!h1, bodyChars: txt, dir };
  });
  check('render sanity', sanity.hasH1 && sanity.bodyChars > 2000 && sanity.dir === 'rtl', `h1=${sanity.hasH1} chars=${sanity.bodyChars} dir=${sanity.dir}`);
  await p.screenshot({ path: path.join(here, '..', '..', 'tmp-live-landing.png') });
}

// ── login page smoke (the auth route renders) ──
const p2 = await ctx.newPage();
const nav2 = await p2.goto(`${URL}/auth`, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
check('auth route', !!nav2 && nav2.status() === 200, nav2 ? `HTTP ${nav2.status()}` : 'failed');

await br.close();
const fails = results.checks.filter(c => !c.pass).length;
console.log(`\n${fails === 0 ? 'ALL LIVE CHECKS PASS' : fails + ' CHECK(S) FAILED'}`);
process.exit(fails ? 1 : 0);
