/**
 * gate-lib.mjs — the shared plumbing for the R320 gate extensions
 * (c1-GATE). Copied — deliberately, NOT imported — from the r319
 * gate's own module-top helpers: importing scripts/r319/gate.mjs
 * would RUN it (main() fires at module top level), and refactoring
 * the r319 gate to export its helpers is a risk this cycle does not
 * take ("your work EXTENDS this machinery — do not replace or
 * regress it"). The r319 conventions are preserved verbatim:
 *
 *   · the hermetic transport bundle (the REAL e2e fixtures,
 *     esbuild-bundled into a content-hashed tmp cache — the gate and
 *     the journey suite can never drift);
 *   · the own-port vite dev server (spawned strictPort, killed after
 *     — never 5173, never another agent's port);
 *   · the route × viewport × theme cell contract, reducedMotion
 *     reduce (deterministic state forcing + the plan's RM belt
 *     resolves the complete sheet), locale ar, intro-skip seed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import esbuild from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VIEWPORT_H = { 390: 844, 768: 1024, 1440: 900 };
export const THEMES = ['light', 'dark'];

/* The r319 gate's six-route set (the shared key space) PLUS the admin
 * sub-pages, so `--routes` can widen the rename sweep to the whole
 * المسجل-General surface when the foreman wants it. DEFAULT_ROUTES
 * stays the r319 six — the composed gate's quick mode adds
 * admin-dashboard so the rename ratchet rides every quick run. */
export const ROUTES = {
  landing: { path: '/', role: null },
  'student-dashboard': { path: '/student/dashboard', role: 'STUDENT' },
  'teacher-dashboard': { path: '/teacher/dashboard', role: 'TEACHER' },
  'admin-dashboard': { path: '/admin/dashboard', role: 'ADMIN' },
  'quality-dashboard': { path: '/quality/dashboard', role: 'QUALITY' },
  'owner-dashboard': { path: '/owner/dashboard', role: 'OWNER' },
  /* admin sub-pages (rename-scan targets; hermetic pages render their
   * honest shell + header + empty/error bodies) */
  'admin-students': { path: '/admin/students', role: 'ADMIN' },
  'admin-teachers': { path: '/admin/teachers', role: 'ADMIN' },
  'admin-faculties': { path: '/admin/faculties', role: 'ADMIN' },
  'admin-courses': { path: '/admin/courses', role: 'ADMIN' },
  'admin-reports': { path: '/admin/reports', role: 'ADMIN' },
  'admin-analysis': { path: '/admin/analysis', role: 'ADMIN' },
  'admin-sync': { path: '/admin/sync', role: 'ADMIN' },
  'admin-community': { path: '/admin/community', role: 'ADMIN' },
  'admin-digital': { path: '/admin/digital', role: 'ADMIN' },
  'admin-settings': { path: '/admin/settings', role: 'ADMIN' },
  'admin-alerts': { path: '/admin/alerts', role: 'ADMIN' },
};
export const DEFAULT_ROUTES = 'landing,student-dashboard,teacher-dashboard,admin-dashboard,quality-dashboard,owner-dashboard';
export const QUICK_ROUTES = 'landing,student-dashboard,admin-dashboard';
export const DEFAULT_VIEWPORTS = '390,768,1440';
export const QUICK_VIEWPORTS = '390,1440';

/* ── hermetic transport (the REAL e2e fixtures, esbuild-bundled) ───── */
export async function ensureTransport() {
  const srcDir = path.join(ROOT, 'frontend/tests/e2e/fixtures');
  const sources = ['mock-transport.ts', 'api-fixtures.ts'].map((f) => path.join(srcDir, f));
  const hash = crypto
    .createHash('sha1')
    .update(sources.map((f) => fs.readFileSync(f)).join(''))
    .digest('hex')
    .slice(0, 12);
  const dir = path.join(os.tmpdir(), `r320-gate-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: {
        contents: `
          export { installMockApi, seedSession } from ${JSON.stringify(sources[0])};
          export { ADMIN_USER, OWNER_USER, QUALITY_USER, STUDENT_USER, TEACHER_USER, FIXED_NOW_ISO } from ${JSON.stringify(sources[1])};
        `,
        resolveDir: srcDir,
        loader: 'ts',
      },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: out,
      logLevel: 'silent',
    });
  }
  return import(`${pathToFileURL(out).href}?v=${hash}`);
}

/* ── vite dev server (spawned on the gate's OWN port, killed after) ── */
export function spawnVite(port) {
  const bin = path.join(ROOT, 'node_modules/.bin/vite');
  return spawn(bin, ['--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: path.join(ROOT, 'frontend'),
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  });
}

export async function waitReady(baseUrl, timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/`);
      if (r.ok) return true;
    } catch { /* booting */ }
    await sleep(400);
  }
  return false;
}

export function killTree(child) {
  if (!child || child.exitCode != null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
  setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ } }, 900).unref();
}

/* ── cell plumbing (the r319 recipes, verbatim) ─────────────────────── */
export async function openRoute(ctx, baseUrl, routeDef) {
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}${routeDef.path}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
    await page.waitForTimeout(1500);
  });
  if (routeDef.role) {
    await page.waitForSelector('header.topbar', { timeout: 15000 }).catch(() => null);
  } else {
    await page.waitForTimeout(1000); // banner/intro entrance settle
    await page.waitForSelector('.jt', { timeout: 6000 }).catch(() => null);
  }
  await page.waitForTimeout(700); // react-query settle
  return page;
}

export async function makeContext(browser, transport, { routeDef, width, theme }) {
  const height = VIEWPORT_H[width] || 900;
  const touch = width <= 920;
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
    reducedMotion: 'reduce', // deterministic state forcing (the r319 contract)
    locale: 'ar',
  });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* storage off */ } });
  const user = routeDef.role ? transport[`${routeDef.role}_USER`] : null;
  if (user) {
    await transport.seedSession(ctx, user, { theme });
  } else if (theme) {
    await ctx.addInitScript(([t]) => {
      try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 })); } catch { /* storage off */ }
    }, [theme]);
  }
  // belt & braces (the r318 recipe): <html data-theme> right from frame 0
  await ctx.addInitScript(([t]) => { try { document.documentElement.dataset.theme = t; } catch { /* no DOM */ } }, [theme]);
  await transport.installMockApi(ctx, { sessionUser: user });
  return ctx;
}

/* ── drawer helpers (the r319 recipes — the burger by aria-label) ──── */
export async function openDrawer(page) {
  let trigger = page.locator('button[aria-label="فتح القائمة"]');
  if (!(await trigger.isVisible().catch(() => false))) {
    trigger = page.locator('.topbar-mobile-toggle');
    if (!(await trigger.isVisible().catch(() => false))) return false;
  }
  await trigger.first().click();
  await page.waitForSelector('nav.sidebar', { state: 'visible', timeout: 6000 }).catch(() => null);
  await sleep(450); // slide-in settle
  return true;
}

export async function closeDrawer(page) {
  const close = page.locator('.sidebar-mobile-close');
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => null);
  } else {
    await page.keyboard.press('Escape').catch(() => null);
  }
  await sleep(350);
}

/* ── CLI parsing (the r319 conventions) ────────────────────────────── */
export function parseArgs(argv, dflts) {
  const opt = {
    viewports: DEFAULT_VIEWPORTS,
    routes: DEFAULT_ROUTES,
    themes: 'light,dark',
    quick: false,
    baseUrl: null,
    port: 4257,
    out: 'audits/evidence/r320/gate.md',
    baseline: path.relative(ROOT, path.join(HERE, 'gate-baseline.json')),
    updateBaseline: false,
    only: new Set(),
    ...dflts,
  };
  const next = (i, dflt) => {
    const v = argv[i + 1];
    return v && !v.startsWith('--') ? v : dflt;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const inline = a.includes('=') ? a.slice(a.indexOf('=') + 1) : undefined;
    if (a === '--quick') opt.quick = true;
    else if (a.startsWith('--viewports')) { opt.viewports = inline ?? next(i, opt.viewports); i += inline ? 0 : 1; }
    else if (a.startsWith('--routes')) { opt.routes = inline ?? next(i, opt.routes); i += inline ? 0 : 1; }
    else if (a.startsWith('--themes')) { opt.themes = inline ?? next(i, opt.themes); i += inline ? 0 : 1; }
    else if (a.startsWith('--only')) { const v = inline ?? next(i, ''); (v || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => opt.only.add(s)); i += inline ? 0 : 1; }
    else if (a.startsWith('--base-url')) { opt.baseUrl = inline ?? next(i, opt.baseUrl); i += inline ? 0 : 1; }
    else if (a.startsWith('--port')) { opt.port = parseInt(inline ?? next(i, String(opt.port)), 10); i += inline ? 0 : 1; }
    else if (a.startsWith('--out')) { opt.out = inline ?? next(i, opt.out); i += inline ? 0 : 1; }
    else if (a.startsWith('--baseline')) { opt.baseline = inline ?? next(i, opt.baseline); i += inline ? 0 : 1; }
    else if (a === '--update-baseline') opt.updateBaseline = true;
  }
  if (opt.quick) {
    if (opt.viewports === DEFAULT_VIEWPORTS) opt.viewports = QUICK_VIEWPORTS;
    if (opt.routes === DEFAULT_ROUTES) opt.routes = QUICK_ROUTES;
  }
  return opt;
}

/* ── baseline ratchet (the r319 mechanism, verbatim semantics) ──────── */
export function rowKey(route, width, theme, check) { return `${route}|${width}|${theme}|${check}`; }

export function compareBaseline(opt, rowList) {
  const baselinePath = path.resolve(ROOT, opt.baseline);
  const exists = fs.existsSync(baselinePath);
  const info = { mode: '', regressions: [], regressionKeys: new Set() };
  if (!exists || opt.updateBaseline) {
    const rows = {};
    for (const r of rowList) rows[r.key] = { status: r.status, metric: r.metric };
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify({ generated: new Date().toISOString(), note: 'R320 gate ratchet baseline — FAIL rows here are the ACCEPTED ratchet (open board tickets: SVG map collisions A4, unguarded :hover sweep, cross-file selector conflicts, rename register §B, console/network 501s + router advisories); re-seat with --update-baseline. Keys are route|viewport|theme|check; --quick and full runs share this key space — re-seat after widening scope.', rows }, null, 1)}\n`);
    info.mode = (opt.updateBaseline ? 'RE-SEATED (--update-baseline)' : 'WRITTEN (first run)') + ' from this run';
    return info;
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const prev = baseline.rows ?? {};
  for (const r of rowList) {
    if (r.status !== 'FAIL') continue; // WARN regressions are reported, never blocking
    const p = prev[r.key];
    if (!p) {
      info.regressions.push({ key: r.key, status: r.status, metric: r.metric, prevMetric: null, note: 'NEW failing row (absent from baseline)' });
      info.regressionKeys.add(r.key);
    } else if (r.metric > p.metric) {
      info.regressions.push({ key: r.key, status: r.status, metric: r.metric, prevMetric: p.metric, note: 'worse number' });
      info.regressionKeys.add(r.key);
    }
  }
  info.mode = `compared against ${path.basename(opt.baseline)} written ${baseline.generated ?? '?'}`;
  return info;
}

/* ── shared row plumbing ────────────────────────────────────────────── */
export function metricOf(check) {
  if (typeof check.metric === 'number') return check.metric;
  if (typeof check.failCount === 'number') return check.failCount;
  if (typeof check.count === 'number') return check.count;
  return check.status === 'PASS' || check.status === 'NA' || check.status === 'SKIPPED' ? 0 : 1;
}

export function sampleOf(check) {
  if (check.status === 'SKIPPED' || check.status === 'NA') return check.reason || '—';
  if (check.samples && check.samples.length) return check.samples[0];
  if (check.sample) return check.sample;
  return '—';
}

export function naRow(reason) { return { status: 'NA', reason, metric: 0 }; }

/* ── gate tickets (printed with every failing row — the r319 shape) ── */
export const TICKETS = {
  'svg-collisions': 'A4 (map labels — name/area ≥14px apart; c2-L Cycle 2)',
  'duplicate-selector': 'R320 §cleanup (cross-file selector conflicts — Cycle 6 dedupe)',
  'hover-guard': 'B1 residue (unguarded :hover sweep — the R319 convention, C2+)',
  'rename-scan': '§B RENAME («الإدارة» → «المسجل العام» — c1-RENAME)',
  'cleanliness/console': '§cleanup (console warnings/errors — router future flags + 501 fail-soft logs)',
  'cleanliness/network': '§cleanup (unfixtured mock endpoints → 501 — fixture or fail-soft tickets)',
};
