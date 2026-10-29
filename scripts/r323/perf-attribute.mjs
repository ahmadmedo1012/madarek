#!/usr/bin/env node
/**
 * r323/perf-attribute.mjs — A4 §7-5..7 diagnostic: attribute the landing
 * scroll jank (>20 ms frames) to paint/layout/script work.
 *
 * Runs the r322 wheel descent on the built dist (own vite preview) with a
 * CDP `Tracing.start` (devtools.timeline + blink.style + disabled-by-default
 * devtools.timeline.invalidationTracking) and prints:
 *   · frame-health summary (rAF deltas)
 *   · top UpdateLayoutTree/Paint/RasterTask/RunTask costs by frame
 *   · style-recalc retiming: selectors with most RecalculateStyles hit
 *   · layout invalidation sources (the 756-hatch inherited-var walk hunt)
 *
 * Diagnostic only — never gates. Usage:
 *   node scripts/r323/perf-attribute.mjs [--notches 19] [--port 4324]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('base-url', 'http://127.0.0.1:4324');
const PORT = opt('port', '4324');
const NOTCHES = Number(opt('notches', 19)), NOTCH_PX = 660, GAP = 250;

const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs.reverse()) {
      const p = path.join(base, d, 'chrome-linux64/chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;
})();

let server, serverKilled = false;
async function startServer() {
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', env: process.env,
  });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(700) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
function killServer() {
  if (serverKilled) return; serverKilled = true;
  try { if (server) server.kill('SIGKILL'); } catch {}
  try { spawn('pkill', ['-f', 'vite preview']); } catch {}
}

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
try {
  const up = await startServer();
  if (!up) { console.error('FATAL: no preview'); process.exit(1); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-US' });
  await ctx.addInitScript(`
    try { localStorage.setItem('madarek.intro.v1','1'); sessionStorage.setItem('madarek-intro-seen','1'); } catch(e){}
    (function(){ if (window.__rk) return; var W=(window.__rk={d:[],on:false,last:0});
      var tick=function(t){ if(W.on){ if(W.last)W.d.push(t-W.last); W.last=t; requestAnimationFrame(tick);} };
      W.start=function(){W.on=true;W.last=0;requestAnimationFrame(tick);};
      W.stop=function(){W.on=false;}; })();
  `);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1400);

  const client = await ctx.newCDPSession(page);
  await client.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    streamFormat: 'json',
    traceConfig: {
      includedCategories: [
        'devtools.timeline', 'blink.style', 'blink.user_timing',
        'disabled-by-default-devtools.timeline.invalidationTracking',
      ],
      excludedCategories: ['*'],
    },
  });
  await page.evaluate(() => window.__rk.start());
  for (let i = 0; i < NOTCHES; i++) {
    await page.mouse.wheel(0, NOTCH_PX);
    await page.waitForTimeout(GAP);
  }
  await page.waitForTimeout(500);
  const deltas = await page.evaluate(() => { window.__rk.stop(); return window.__rk.d.slice(); });

  await client.send('Tracing.end');
  /* the stream handle arrives with the tracingComplete event (ReturnAsStream) */
  const complete = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 15000);
    client.once('Tracing.tracingComplete', (p) => { clearTimeout(t); resolve(p); });
  });
  const streamHandle = complete && complete.stream;
  if (!streamHandle) { console.error('[attr] FATAL: no trace stream'); process.exit(1); }
  const chunks = [];
  let eof = false;
  let DBG_CHUNKS=0;
  while (!eof) {
    const r = await client.send('IO.read', { handle: streamHandle });
    chunks.push(r.data); eof = r.eof; DBG_CHUNKS+=r.data.length;
    if (chunks.join('').length > 220e6) break;
  }
  await client.send('IO.close', { handle: streamHandle });
  /* the trace stream is pretty-printed JSON objects separated by ",\n" —
     wrap the whole content into an array and parse it in one go. */
  const raw = chunks.join('').trim();
  let events = [];
  try {
    let parsed = JSON.parse(raw.startsWith('[') ? raw : '[' + raw.replace(/,\s*$/, '') + ']');
    if (parsed.length === 1 && Array.isArray(parsed[0].traceEvents)) parsed = parsed[0].traceEvents;
    else if (parsed.length === 1 && Array.isArray(parsed[0])) parsed = parsed[0];
    events = parsed;
  } catch (e) {
    console.error('[attr] JSON parse failed: ' + e.message);
  }
  console.log('[dbg] stream bytes:', DBG_CHUNKS, 'chunks:', chunks.length);
  fs.writeFileSync('/tmp/mdrk-r323-trace.json', JSON.stringify(events));
  console.log(`[attr] trace events: ${events.length} · frames: ${deltas.length}`);

  const gt20 = deltas.filter((d) => d > 20);
  console.log(`[attr] frames >20ms: ${gt20.length}/${deltas.length} (${Math.round((gt20.length / deltas.length) * 1000) / 10}%) · worst: ${deltas.map((d) => Math.round(d)).sort((a, b) => b - a).slice(0, 8).join(', ')}ms`);

  /* thread times by event name */
  const byName = new Map();
  for (const e of events) {
    if (!e.name || !e.cat) continue;
    if (!/devtools\.timeline|blink\.style|invalidation/.test(e.cat)) continue;
    const dur = e.dur || 0;
    const row = byName.get(e.name) || { count: 0, total: 0, worst: 0 };
    row.count++; row.total += dur; row.worst = Math.max(row.worst, dur);
    byName.set(e.name, row);
  }
  console.log('\n[attr] timeline events by total self time (ms):');
  [...byName.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 14).forEach(([n, r]) => {
    console.log(`  ${n.padEnd(52)} n=${String(r.count).padStart(6)} total=${Math.round(r.total / 1000)}ms worst=${Math.round(r.worst / 1000)}ms`);
  });

  /* style recalc hot selectors: RuleMatched events + StyleRecalcInvalidationTracking */
  const invalid = events.filter((e) => e.name === 'StyleRecalcInvalidationTracking');
  const byReason = new Map();
  for (const e of invalid) {
    const r = (e.args && e.args.data && (e.args.data.reason || e.args.data.cause)) || 'unknown';
    const row = byReason.get(r) || { count: 0, sels: new Map() };
    row.count++;
    const sel = (e.args && e.args.data && (e.args.data.selector || e.args.data.property)) || '';
    if (sel) row.sels.set(sel, (row.sels.get(sel) || 0) + 1);
    byReason.set(r, row);
  }
  console.log('\n[attr] style invalidations by reason:');
  [...byReason.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 12).forEach(([r, row]) => {
    const top = [...row.sels.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${s}×${c}`).join(' · ');
    console.log(`  ${r.padEnd(34)} n=${row.count}  ${top}`);
  });

  /* layout invalidations */
  const linv = events.filter((e) => e.name === 'LayoutInvalidationTracking');
  const lby = new Map();
  for (const e of linv) {
    const r = (e.args && e.args.data && e.args.data.reason) || 'unknown';
    lby.set(r, (lby.get(r) || 0) + 1);
  }
  console.log('\n[attr] layout invalidations by reason:');
  [...lby.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([r, c]) => console.log(`  ${r.padEnd(34)} n=${c}`));

  /* scroll-layer / paint handlers */
  const scrollEv = events.filter((e) => e.name === 'EventDispatch' && /scroll|wheel/.test((e.args?.data?.type || '') + ''));
  const scrollMs = scrollEv.reduce((a, b) => a + (b.dur || 0), 0);
  console.log(`\n[attr] scroll/wheel EventDispatch total: ${Math.round(scrollMs / 1000)}ms over ${scrollEv.length} events`);
} finally {
  await browser.close().catch(() => {});
  killServer();
}
