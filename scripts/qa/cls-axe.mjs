#!/usr/bin/env node
// scripts/qa/cls-axe.mjs — r366 L4/L5 instrument (Agent 4).
//   node scripts/qa/cls-axe.mjs --url http://localhost:5173 --seed student --routes /student/dashboard,/student/ai --bps 390x844
//
// Per (route × bp): (1) CLS — the layout-shift entries the page accumulates
// after load EXCLUDING shifts within 500ms of a user input (the
// PerformanceObserver spec's own recent-input exclusion), reported as the
// standard sum-of-impact-fractions; (2) axe-core (the repo's own transitive
// copy) scanned at the settled state, SERIOUS/CRITICAL impact only.
// The hermetic seed is the overlap.mjs method (mock API + role session +
// per-page /auth/me) — no backend needed.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const a = Object.fromEntries(process.argv.slice(2).reduce((m, v, i, r) => (v.startsWith('--') ? m.push([v.slice(2), r[i + 1]]) : 0, m), []));
const url = a.url || 'http://localhost:5173';
const routes = (a.routes || '/student/dashboard').split(',');
const bps = (a.bps || '390x844').split(',').map((s) => s.split('x').map(Number));
const out = a.out || '/tmp/r366/cls-axe.json';
const seedRole = a.seed || 'student';

const SEED_USERS = { student: 'STUDENT_USER', teacher: 'TEACHER_USER', registrar: 'ADMIN_USER', quality: 'QUALITY_USER', owner: 'OWNER_USER' };
if (!SEED_USERS[seedRole]) { console.error(`--seed: unknown role '${seedRole}'`); process.exit(2); }

/* the overlap.mjs seed plumbing (identical bundle) */
const require_ = (await import('node:module')).createRequire(import.meta.url);
const esbuild = require_('esbuild');
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/tests/e2e/fixtures');
const sources = ['mock-transport.ts', 'api-fixtures.ts'].map((f) => path.join(srcDir, f));
const stdinContents = `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, TEACHER_USER, ADMIN_USER, QUALITY_USER, OWNER_USER, meProfile } from ${JSON.stringify(sources[1])};`;
const hash = crypto.createHash('sha1').update(stdinContents + sources.map((f) => fs.readFileSync(f)).join('')).digest('hex').slice(0, 12);
const dir = path.join(os.tmpdir(), `r353-overlap-seed-${hash}`);
const outFile = path.join(dir, 'transport.mjs');
if (!fs.existsSync(outFile)) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
  fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
  esbuild.buildSync({ stdin: { contents: stdinContents, resolveDir: srcDir, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: outFile, logLevel: 'silent' });
}
const T = await import(`${pathToFileURL(outFile).href}?v=${hash}`);
const user = T[SEED_USERS[seedRole]];
const roleExtras = {
  teacher: { teacherProfile: { position: null, facultyId: 'fac_e2e_eng', departmentId: 'dep_e2e_cs', faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' }, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' } }, studentProfile: null },
  registrar: { scopeFaculty: null, staffRole: 'REGISTRAR_GENERAL' },
  quality: { staffRole: 'EXAMS_CONTROLLER' },
  owner: {},
  student: {},
};
const seededUser = { ...user, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', nameEn: 'Madarek Model Institution', slug: 'zu' }, membershipRole: user.role };

const AXE_SRC = (() => {
  for (const p of [
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../node_modules/axe-core/axe.min.js'),
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/node_modules/axe-core/axe.min.js'),
  ]) if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  throw new Error('axe-core not found in node_modules (it rides @axe-core/react)');
})();

const CLS_BOOT = () => {
  window.__cls = 0;
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls += e.value ?? 0;
    }
  });
  po.observe({ type: 'layout-shift', buffered: true });
};

const run = async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const all = [];
  for (const [w, h] of bps) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } });
    await T.installMockApi(ctx, { sessionUser: user });
    await T.seedSession(ctx, seededUser, { token: `e2e-token-${seedRole}` });
    await ctx.addInitScript(() => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'light' }, version: 2 })); } catch {} });
    for (const r of routes) {
      const p = await ctx.newPage();
      await p.route('**/auth/me', async (route) => {
        if (route.request().method().toUpperCase() !== 'GET') { await route.fallback(); return; }
        await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ data: { ...T.meProfile(user), memberships: [], currentInstitution: seededUser.currentInstitution, membershipRole: user.role, ...roleExtras[seedRole] } }) });
      });
      await p.addInitScript(CLS_BOOT);
      await p.goto(url + r, { waitUntil: 'networkidle' }).catch(() => {});
      await p.waitForTimeout(3500);
      const cls = await p.evaluate(() => +(window.__cls ?? 0).toFixed(4));
      await p.addScriptTag({ content: AXE_SRC });
      const axe = await p.evaluate(async () => {
        const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
        return res.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length }));
      }).catch((e) => [{ id: 'AXE-RUN-ERROR', impact: 'critical', help: String(e).slice(0, 120), n: 0 }]);
      all.push({ route: r, bp: `${w}x${h}`, cls, axe });
      console.log(`${cls > 0.05 ? 'CLS!' : 'cls '} ${cls.toFixed(4).padStart(7)}  axe:${String(axe.length).padStart(2)}  ${r} ${axe.length ? JSON.stringify(axe.map((v) => v.id + ':' + v.impact)) : ''}`);
      await p.close();
    }
    await ctx.close();
  }
  await br.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(all, null, 1));
  const bad = all.filter((r) => r.cls > 0.05 || r.axe.length);
  console.log(`pages=${all.length} cls-over-0.05=${all.filter((r) => r.cls > 0.05).length} axe-serious-critical-pages=${all.filter((r) => r.axe.length).length}`);
  process.exit(bad.length ? 1 : 0);
};
run();
