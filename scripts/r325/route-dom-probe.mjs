/* P2.4 phase 2b — the DOM probe: what pixels can't testify.
 *
 * For every (role, route) — 1440 × paper, ONE page reused per role —
 * goto → 6 s settle + fonts → evaluate:
 *   · STUCK-SKELETON  skeleton/shimmer/aria-busy elements still visible
 *                     (combined area > 20 % of the viewport)
 *   · ERROR-TEXT      visible Arabic/English failure copy (حدث خطأ،
 *                     تعذر، فشل، "something went wrong", "failed to
 *                     load", raw `undefined`/`NaN`/`[object Object]`)
 *   · JARGON          debug/dev leakage (TODO/FIXME/lorem/localhost:/
 *                     stack-trace-ish) in visible text
 *
 * Findings → audits/evidence/r325/routes/dom-findings.json — merged
 * into the ledger by route-ledger.py (findings are theme-independent,
 * so they are recorded for both themes).
 *
 * USAGE
 *   node scripts/r325/route-dom-probe.mjs [--only role/slug,...] [--gap 5000]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

import { ROLE_ROUTES, sessionForEmail, authStorageJson, resolveRoute } from './capture-routes.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const BASE = (opt('base', 'http://localhost:5173')).replace(/\/+$/, '');
const API = (opt('api', 'http://localhost:4000')).replace(/\/+$/, '');
const GAP = Math.max(0, parseInt(opt('gap', '5000'), 10) || 0);
const ONLY = (opt('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = path.resolve(import.meta.dirname, '../../audits/evidence/r325/routes');
const DEST = path.join(OUT, 'dom-findings.json');

/* the executable — same Chromium the capture harness drives */
const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');

const ROLE_EMAIL = {
  student: 'student@test.ly', teacher: 'teacher@test.ly',
  registrar: 'registrar@test.ly', quality: 'quality@test.ly',
  owner: 'owner@test.ly', head: 'head@test.ly', dean: 'dean@test.ly',
  vicedean: 'vicedean@test.ly', faculty: 'faculty@test.ly',
};
const ROLE_ORDER = ['student', 'teacher', 'registrar', 'quality', 'owner', 'head', 'dean', 'vicedean', 'faculty'];

/* ── visible-DOM inspectors (run inside the page) ─────────────────── */

function inspectors() {
  const W = window.innerWidth, H = window.innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    return r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  };
  const txt = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const out = { skeleton: 0, errorText: [], jargon: [], fixedOverlaps: [] };
  const ERR_RE = /حدث خطأ|تعذر(?:ت)?|فشل(?:ت)? (?:في)?(?:التحميل|العملية|الرفع)|جلسة منتهية|غير متوفر حالياً|خطأ (?:في|غير)|Something went wrong|Failed to load|Error loading|Network Error/i;
  const RAW_RE = /\bundefined\b|\bNaN\b|\[object Object\]/;
  const JARGON_RE = /\bTODO\b|\bFIXME\b|\bXXX\b|lorem ipsum|localhost:\d+|debugger|\bconsole\.log\b|\bstack trace\b/i;
  const fixedEls = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const cls = String(el.className?.baseVal ?? el.className ?? '');
    const isSkeleton = el.matches('[class*="skeleton" i],[class*="shimmer" i],[class*="pulse" i],[data-skeleton],[aria-busy="true"]');
    if (isSkeleton) out.skeleton += (r.width * r.height) / (W * H);
    if ((s.position === 'fixed' || s.position === 'sticky') && r.width * r.height > 400) {
      fixedEls.push({ tag: el.tagName.toLowerCase(), cls: cls.slice(0, 40), r });
    }
    // leaf-ish text nodes only (avoid double-counting containers)
    if (el.children.length === 0) {
      const t = txt(el);
      if (!t) continue;
      if (RAW_RE.test(t)) out.errorText.push(`raw: ${t.slice(0, 90)}`);
      else if (ERR_RE.test(t)) out.errorText.push(`${t.slice(0, 90)}`);
      else if (JARGON_RE.test(t)) out.jargon.push(`${t.slice(0, 90)}`);
    }
  }
  // pairwise fixed-layer overlap (the Y6 suspicion, app-side): two
  // chrome layers eating ≥30% of the smaller one's area
  for (let i = 0; i < fixedEls.length; i += 1) {
    for (let j = i + 1; j < fixedEls.length; j += 1) {
      const a = fixedEls[i].r, b = fixedEls[j].r;
      const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const inter = ox * oy;
      const smaller = Math.min(a.width * a.height, b.width * b.height);
      if (inter / smaller > 0.3 && smaller > 2000) {
        const A = fixedEls[i], B = fixedEls[j];
        const label = (e) => `${e.tag}.${e.cls.split(' ').slice(0, 2).join('.')}`;
        const pair = `${label(A)} × ${label(B)}`;
        if (!out.fixedOverlaps.includes(pair)) out.fixedOverlaps.push(pair);
      }
    }
  }
  return out;
}

/* ── sweep ───────────────────────────────────────────────────────── */

let lastStart = 0;
const dom = fs.existsSync(DEST) ? JSON.parse(fs.readFileSync(DEST, 'utf8')) : {};

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ar', colorScheme: 'light', serviceWorkers: 'block' });
await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* */ } });
await ctx.addInitScript(() => {
  try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'light', modeUpdatedAt: 1 }, version: 2 })); } catch { /* */ }
});

let n = 0;
for (const role of ROLE_ORDER) {
  if (ONLY.length && !ONLY.some((s) => s.split('/')[0] === role)) continue;
  const email = ROLE_EMAIL[role];
  const session = email ? await sessionForEmail(email) : null;
  const page = await ctx.newPage();
  if (session) {
    await ctx.addInitScript(({ auth }) => {
      try { localStorage.setItem('mdrk-auth', auth); } catch { /* */ }
    }, { auth: authStorageJson(session) });
  }
  for (const route of ROLE_ROUTES[role] ?? []) {
    if (ONLY.length && !ONLY.some((s) => { const [r, rt] = s.split('/'); return rt ? (r === role && rt === route.slug) : r === role; })) continue;
    const resolved = await resolveRoute(route).catch(() => null);
    if (!resolved) continue;
    const key = `${role}/${route.slug}`;
    if (dom[key]) continue; // resume
    const now = Date.now();
    const slot = Math.max(now, lastStart + GAP);
    lastStart = slot;
    if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
    try {
      await page.goto(BASE + resolved, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(6000).catch(() => {});
      await page.evaluate(() => document.fonts?.ready?.catch?.(() => {})).catch(() => {});
      const res = await Promise.race([
        page.evaluate(inspectors).catch(() => null),
        new Promise((r) => setTimeout(() => r(null), 20_000)),
      ]);
      if (!res) { dom[key] = [{ class: 'probe-timeout', desc: 'evaluate did not settle (Y7-class wedged main thread)', theme: 'both' }]; continue; }
      const findings = [];
      if (res.skeleton > 0.2) findings.push({ class: 'stuck-skeleton', desc: `skeleton layer still covering ${(res.skeleton * 100).toFixed(0)}% of viewport 6 s after load`, theme: 'both' });
      if (res.errorText.length) findings.push({ class: 'error-text', desc: [...new Set(res.errorText)].slice(0, 3).join(' | '), theme: 'both' });
      if (res.jargon.length) findings.push({ class: 'jargon', desc: [...new Set(res.jargon)].slice(0, 3).join(' | '), theme: 'both' });
      if (res.fixedOverlaps.length) findings.push({ class: 'fixed-overlap', desc: [...new Set(res.fixedOverlaps)].slice(0, 3).join(' | '), theme: 'both' });
      if (findings.length) dom[key] = findings;
      n += 1;
      const marks = findings.map((f) => f.class[0].toUpperCase()).join('');
      process.stdout.write(`  [${role}] ${route.slug} ${marks || '·'}\n`);
    } catch (e) {
      dom[key] = [{ class: 'probe-error', desc: String(e?.message ?? e).slice(0, 200), theme: 'both' }];
    }
    fs.writeFileSync(DEST, JSON.stringify(dom, null, 1));
  }
  try { await page.close(); } catch { /* */ }
}
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
console.log(`dom-probe: ${n} routes probed this run → ${DEST}`);
