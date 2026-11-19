#!/usr/bin/env node
// scripts/qa/loaf-authed.mjs — R369 C1.11 (Agent C).
//   node scripts/qa/loaf-authed.mjs --url http://localhost:5351 --seed student \
//     --routes /student/dashboard,/student/courses,/student/library --bps 1440,390
//
// The LoAF contract for AUTHENTICATED app pages under 4× CPU throttle:
// worst long-animation-frame < 50 ms (the plan's gate) while the page's
// own content scroller is driven front-to-back (wheel cadence + reading
// pauses — the same shape scripts/conformance/loaf.mjs drives on the
// landing, which this file deliberately does NOT touch). The hermetic
// seed is the overlap.mjs method (mock API + role session).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireFrontend = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const { chromium } = requireFrontend('playwright');
const esbuild = requireFrontend('esbuild') ?? createRequire(import.meta.url)('esbuild');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL = arg('url', 'http://localhost:5351/');
const ROUTES = (arg('routes', '/student/dashboard') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
const BPS = (arg('bps', '1440,390') ?? '').split(',').map((b) => Number(b.trim())).filter(Boolean);
const SEED = arg('seed', 'student');
const LOAF_LIMIT_MS = 50;

/* the hermetic seed (overlap.mjs's method, verbatim shape) */
const SEED_USERS = {
  student: 'STUDENT_USER', teacher: 'TEACHER_USER', registrar: 'ADMIN_USER',
  quality: 'QUALITY_USER', owner: 'OWNER_USER',
};
const srcDir = path.join(ROOT, 'frontend/tests/e2e/fixtures');
const sources = ['mock-transport.ts', 'api-fixtures.ts'].map((f) => path.join(srcDir, f));
const hash = crypto.createHash('sha1').update(sources.map((f) => fs.readFileSync(f)).join('')).digest('hex').slice(0, 12);
const dir = path.join(os.tmpdir(), `r369-loaf-seed-${hash}`);
const out = path.join(dir, 'transport.mjs');
if (!fs.existsSync(out)) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
  fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
  esbuild.buildSync({
    stdin: {
      contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, TEACHER_USER, ADMIN_USER, QUALITY_USER, OWNER_USER } from ${JSON.stringify(sources[1])};`,
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
const mod = await import(`${pathToFileURL(out).href}?v=${hash}`);
const { installMockApi, seedSession, standardRoutes } = mod;
const USERS = {
  STUDENT_USER: mod.STUDENT_USER, TEACHER_USER: mod.TEACHER_USER, ADMIN_USER: mod.ADMIN_USER,
  QUALITY_USER: mod.QUALITY_USER, OWNER_USER: mod.OWNER_USER,
};
const user = USERS[SEED_USERS[SEED]];
const seededUser = { ...user, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', nameEn: 'Madarek Model Institution', slug: 'zu' }, membershipRole: user.role };

const results = { generatedAt: new Date().toISOString(), url: URL, seed: SEED, cpuThrottle: 4, limitMs: LOAF_LIMIT_MS, cells: {} };
let worstOverall = 0;
const browser = await chromium.launch({ headless: true });
for (const route of ROUTES) {
  for (const bp of BPS) {
    const context = await browser.newContext({ viewport: { width: bp, height: bp === 390 ? 844 : 900 } });
    await installMockApi(context, { sessionUser: user });
    await seedSession(context, seededUser, { token: 'e2e-token-student' });
    await context.addInitScript(() => {
      /* the LoAF observer rides from first paint — entries buffered */
      window.__loaf = [];
      try {
        const obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__loaf.push({
              duration: e.duration, startTime: e.startTime, name: e.name,
              renderStart: e.renderStart, styleAndLayoutStart: e.styleAndLayoutStart,
              firstUITime: e.firstUIIntervalStartTime,
              scripts: (e.scripts || []).slice(0, 5).map((sc) => ({
                dur: sc.duration, invoker: sc.invoker, src: (sc.invokerSource ?? sc.sourceURL ?? '').slice(-90),
                fn: (sc.sourceFunctionName ?? '').slice(0, 50),
              })),
            });
          }
        });
        obs.observe({ type: 'long-animation-frame', buffered: true });
      } catch { /* LoAF unsupported — the read resolves [] */ }
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`${URL.replace(/\/$/, '')}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    /* reset the buffer — the gate measures the SCROLL/interaction window,
     * not the cold-boot module-eval frames (the landing loaf.mjs settles
     * its preloader first for the same reason) */
    await page.evaluate(() => { window.__loaf = []; });
    /* drive the app's content scroller front-to-back with REAL wheel input
     * (page.mouse.wheel goes through the browser's input pipeline — the
     * app's own scroll system sees what a user's trackpad sends; direct
     * scrollTop assignments fight custom scrollers and fabricate frames) */
    const scrollerMeta = await page.evaluate(() => {
      const el = document.querySelector('.content');
      if (!el) return { has: false, height: 4000 };
      return { has: true, height: el.scrollHeight, client: el.clientHeight };
    });
    const steps = Math.max(6, Math.ceil((scrollerMeta.height ?? 4000) / 300));
    for (let i = 0; i < steps; i += 1) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(350);
    for (let i = 0; i < Math.ceil(steps / 2); i += 1) {
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(700);
    const loaf = await page.evaluate(
      () =>
        new Promise((resolve) => {
          resolve(window.__loaf ?? []);
        }),
    ).catch(() => []);
    const worst = loaf.reduce((m, e) => Math.max(m, e.duration), 0);
    const over = loaf.filter((e) => e.duration > 50);
    results.cells[`${route}@${bp}`] = { frames: loaf.length, worstMs: Math.round(worst * 100) / 100, over50: over.length, worst: over.sort((a, b) => b.duration - a.duration)[0] ?? null };
    worstOverall = Math.max(worstOverall, worst);
    console.log(`  ${route} @${bp} [4x CPU]: LoAF frames ${loaf.length}, worst ${Math.round(worst * 100) / 100} ms, over-50ms ${over.length}`);
    await cdp.detach().catch(() => {});
    await context.close();
  }
}
console.log(`\nloaf-authed — seed ${SEED}: worst LoAF ${Math.round(worstOverall * 100) / 100} ms (limit ${LOAF_LIMIT_MS}) ${worstOverall < LOAF_LIMIT_MS ? 'PASS' : 'FAIL'}`);
fs.mkdirSync(path.join(ROOT, 'docs/audit/evidence/r369'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audit/evidence/r369/loaf-authed.json'), JSON.stringify(results, null, 1));
await browser.close();
process.exit(worstOverall < LOAF_LIMIT_MS ? 0 : 1);
