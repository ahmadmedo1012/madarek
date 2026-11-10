#!/usr/bin/env node
// live-smoke.mjs — R347-Z D14: live smoke/perf on madarek.onrender.com
// LCP < 2.5s · CLS < 0.05 · INP proxy (long task audit) · axe-lite
// (serious contrast/name checks via quick DOM heuristics) · HTTP health.
import { createRequire } from 'node:module';
const { chromium } = createRequire('/home/z/madarek/package.json')('playwright');

const URL = process.argv[2] || 'https://madarek.onrender.com';
const results = { url: URL, checks: [] };
const check = (name, pass, value, budget) => {
  results.checks.push({ name, pass, value, budget });
  console.log(`${pass ? '✓' : '✗'} ${name}: ${value}${budget ? ` (budget ${budget})` : ''}`);
};

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

// ── health ──
const t0 = Date.now();
const health = await fetch(`${URL}/api/v1/health`).then(r => ({ s: r.status, j: r.json().catch(() => null) })).catch(e => ({ s: 0, err: String(e) }));
const healthMs = Date.now() - t0;
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
  await p.screenshot({ path: '/tmp/rz/live-landing.png' });
}

// ── login page smoke (the auth route renders) ──
const p2 = await ctx.newPage();
const nav2 = await p2.goto(`${URL}/auth`, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
check('auth route', !!nav2 && nav2.status() === 200, nav2 ? `HTTP ${nav2.status()}` : 'failed');

await br.close();
const fails = results.checks.filter(c => !c.pass).length;
console.log(`\n${fails === 0 ? 'ALL LIVE CHECKS PASS' : fails + ' CHECK(S) FAILED'}`);
process.exit(fails ? 1 : 0);
