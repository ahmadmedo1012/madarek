#!/usr/bin/env node
/**
 * r324/type-probe.mjs — THE HEADING TYPE CENSUS (Y4 extension, r325).
 *
 * Was: every PUBLIC route's h1/h2 font-size + weight at 1440/390 vs the
 * ladder caps (the X9 evidence). EXTENDED (defect Y4 — inner-page
 * headings too big/heavy; the old census passed only because it checked
 * H1 on a public subset): now every route the router can reach
 * statically — public + student/teacher/admin/quality/owner + the
 * shared authenticated surfaces — at 1440/768/390, over EVERY heading
 * level h1–h4 PLUS the classed heading seats (.pf-page-title,
 * .page-title, .lg-title, .lg-bar, .lg-faq-q, .cu-title, .nf-title,
 * .auth-form-title, .card-title, .vision-h2, step/section-bar titles)
 * and mono micro-labels.
 *
 * HARD ASSERTIONS (§R324 ladder law — exit 1 on any violation):
 *   1. computed font-weight ≤ 600 everywhere (weights 500/600 ONLY);
 *   2. computed font-size within 1.3× of a sanctioned ladder rung —
 *      display d1/d2/d3/st (resolved live from the fluid root) or the
 *      app-density rungs H1 28/24 · H2 20 · H3 16 · body 15/16;
 *   3. H1 ≤ 3 lines at 390 (element height ÷ computed line-height);
 *   4. mono micro-labels ≥ 11px (the app-density mono-label rung).
 *
 * Auth: guarded routes are reached with a real /auth/login per role
 * (AUDIT_<ROLE>_EMAIL/PASSWORD envs; defaults the seeded @test.ly
 * table) seeded into localStorage `mdrk-auth` exactly like the audit
 * harness. Param routes ride the harness's PARAM_DEFAULTS (error/
 * empty states still render their headings — the census's subject).
 *
 * Evidence: audits/evidence/r324/type-probe.json (the pinned seat) +
 * audits/evidence/r325/y4/type-census.json (the Y4 seat). Exit 0 only
 * when every assertion holds.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.VITE_URL || 'http://localhost:5204/';
const API = process.env.API_URL || 'http://localhost:4000';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

/* ── the static route table (mirrors tests/audit/routes.ts) ───────── */
const PARAM_DEFAULTS = { offeringId: '1', lectureId: '1', lessonId: '1', id: '1', slug: 'intro', filename: 'sample.pdf' };

const ROUTES = [
  // public (guest)
  '/', '/auth', '/auth/register', '/404', '/500', '/403', '/maintenance',
  '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/accessibility', '/legal/security', '/legal/data',
  '/help', '/about', '/contact', '/colleges', '/capabilities',
  // student
  '/student/dashboard', '/student/schedule', '/student/courses', '/student/courses/:offeringId',
  '/student/lectures/:lectureId', '/student/results', '/student/library', '/student/mooc', '/student/jobs',
  '/student/ai', '/student/gamification', '/student/skills', '/student/alerts', '/student/messages',
  '/student/calendar', '/student/labs', '/student/ar', '/student/social', '/student/downloads',
  '/student/university', '/student/live', '/student/payment', '/student/map', '/student/matrix',
  '/student/research', '/student/profile', '/student/webinars', '/student/catalog', '/student/online-exams',
  '/student/online-exams/:id', '/training', '/training/:slug', '/training/:slug/lesson/:lessonId',
  '/achievements', '/community',
  // teacher
  '/teacher/dashboard', '/teacher/schedule', '/teacher/attendance', '/teacher/grades', '/teacher/materials',
  '/teacher/research', '/teacher/students', '/teacher/performance', '/teacher/assignments', '/teacher/messages',
  '/teacher/ai', '/teacher/library', '/teacher/alerts', '/teacher/intelligence', '/teacher/intelligence/:offeringId',
  '/teacher/profile', '/teacher/live', '/teacher/labs', '/teacher/community', '/teacher/exams', '/teacher/exams/:templateId',
  // admin
  '/admin/dashboard', '/admin/students', '/admin/teachers', '/admin/permissions/:id', '/admin/sync',
  '/admin/community', '/admin/faculties', '/admin/courses', '/admin/analysis', '/admin/digital',
  '/admin/reports', '/admin/settings', '/admin/alerts',
  // quality
  '/quality/dashboard', '/quality/courses', '/quality/professors', '/quality/engagement', '/quality/reports',
  '/quality/curriculum', '/quality/alerts', '/quality/exam-moderation', '/quality/community', '/quality/notifications',
  // owner
  '/owner/dashboard', '/owner/users', '/owner/activity', '/owner/content', '/owner/system', '/owner/education',
  '/owner/realtime', '/owner/ai', '/owner/alerts', '/owner/governance', '/owner/institutions',
  '/owner/institutions/:slug', '/owner/notifications',
  // shared (any authenticated role → swept as STUDENT)
  '/vision', '/vision/:slug', '/document/:filename', '/colleges/leaderboard', '/colleges/:id',
  '/competitions', '/competitions/:id',
];

function roleForRoute(route) {
  if (route.startsWith('/student/') || route.startsWith('/training') || route.startsWith('/achievements') || route.startsWith('/community')) return 'STUDENT';
  if (route.startsWith('/teacher/')) return 'TEACHER';
  if (route.startsWith('/admin/')) return 'ADMIN';
  if (route.startsWith('/quality/')) return 'QUALITY';
  if (route.startsWith('/owner/')) return 'OWNER';
  if (route.startsWith('/vision') || route.startsWith('/document') || route.startsWith('/colleges') || route.startsWith('/competitions')) return 'STUDENT';
  return 'guest';
}

const ROLE_EMAILS = {
  STUDENT: process.env.AUDIT_STUDENT_EMAIL || 'student@test.ly',
  TEACHER: process.env.AUDIT_TEACHER_EMAIL || 'teacher@test.ly',
  ADMIN: process.env.AUDIT_ADMIN_EMAIL || 'registrar@test.ly',
  QUALITY: process.env.AUDIT_QUALITY_EMAIL || 'quality@test.ly',
  OWNER: process.env.AUDIT_OWNER_EMAIL || 'owner@test.ly',
};
const ROLE_PASSWORD = process.env.AUDIT_PASSWORD || '12345678';

/* ── collectors (run inside the page) ─────────────────────────────── */
const COLLECT_FN = () => {
  const HEADING_SEATS = '.pf-page-title, .page-title, .lg-title, .lg-bar, .lg-faq-q, .cu-title, .nf-title, .auth-form-title, .card-title, .vision-h2, .vision-hero-title, .r319s-bar-title, .lecture-meta-title, .r321x-cover-title, .oex-result-title, .hr-section-head h2, .hr-section-head h3, .pf-section-title, .college-city-name, .college-hero-name, .comp-hero-title, .guest-cta-title, .vc-title, .onboarding-flow-headline, .cal-month, .teacher-name, .doc-reader-title, .r305s-kicker-title, .r305rp-kicker-title, .r305rp-rev-masthead-title, .tpg-queue-title, .modal-title, .state-title, .owner-confirm-title, .pf-today-title, .lab-hero-title, .dash-section-title, .dash-resume-course-name, .section-title, .notif-panel-title, .search-empty-title, .cert-title, .momentum-title, .lecture-panel-title, .lib-cover-title';
  const isMono = (ff) => /mono/i.test(ff);
  const seen = new Set();
  const grab = (el, kind) => {
    if (seen.has(el)) return null;
    seen.add(el);
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null; // display:none subtree
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return {
      kind,
      tag: el.tagName.toLowerCase(),
      cls: (el.className && String(el.className)).slice(0, 60),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28),
      fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      fw: Number(cs.fontWeight) || 0,
      ff: cs.fontFamily.slice(0, 40),
      lh: Math.round(lh * 10) / 10,
      lines: Math.max(1, Math.round(r.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize)))),
    };
  };
  const heads = [];
  for (const el of document.querySelectorAll('h1, h2, h3, h4')) {
    const x = grab(el, 'tag'); if (x) heads.push(x);
  }
  for (const el of document.querySelectorAll(HEADING_SEATS)) {
    if (el.tagName.toLowerCase().match(/^h[1-4]$/) && seen.has(el)) continue;
    const x = grab(el, 'classed'); if (x) heads.push(x);
  }
  // mono micro-labels: every mono-font text element below 11px is a
  // candidate violation (the app-density mono rung is 11–12).
  // SVG <text> is COLLECTED but EXEMPTED from the floor: the landing
  // drawings measure captions in SVG user units that scale with the
  // illustration (8.5u ≈ 11.9px @1440 — the owner's own R320 §A3
  // caption register), so a computed px reading is not a rendered px.
  const mono = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue; // leaf text nodes only
    const txt = (el.textContent || '').trim();
    if (!txt) continue;
    const cs = getComputedStyle(el);
    if (!isMono(cs.fontFamily)) continue;
    if (seen.has(el)) { // already a heading — skip here
      continue;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const svg = el.namespaceURI !== 'http://www.w3.org/1999/xhtml';
    mono.push({
      tag: el.tagName.toLowerCase(),
      svg,
      cls: (el.className && String(el.className)).slice(0, 50),
      text: txt.slice(0, 20),
      fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
    });
  }
  // the resolved ladder rungs at THIS viewport (probe elements — the
  // clamp() floors resolve for real, no math guesses)
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  probe.innerHTML = ['--fs-d1', '--fs-d2', '--fs-d3', '--fs-st'].map((v) => `<span style="font-size:var(${v})" data-rung="${v}"></span>`).join('');
  document.body.appendChild(probe);
  const rungs = {};
  for (const s of probe.querySelectorAll('span')) {
    rungs[s.dataset.rung] = Math.round(parseFloat(getComputedStyle(s).fontSize) * 10) / 10;
  }
  probe.remove();
  return { heads, mono, rungs, root: getComputedStyle(document.documentElement).fontSize };
};

/* ── the ladder law ────────────────────────────────────────────────── */
const TOL = 1.3;
const APP_RUNGS = [28, 24, 20, 16, 15]; // app-density heading rungs (H1 28/24 · H2 20 · H3 16 · body-lg 15)
const MONO_FLOOR = 11;

/** fs passes when it sits within 1.3× of a sanctioned rung (display
 *  rungs resolved at the viewport + the app-density rungs). */
const fsOk = (fs, rungs) => {
  const sanctioned = [...Object.values(rungs), ...APP_RUNGS];
  return sanctioned.some((r) => fs >= r / TOL && fs <= r * TOL);
};

/* ── run ───────────────────────────────────────────────────────────── */
const BPS = (process.env.CENSUS_BPS ? process.env.CENSUS_BPS.split(',').map(Number) : [1440, 768, 390]);

// one session per role (real login, once per 10 minutes — the backend's
// AUTH_RATE limiter is 10 logins/15min/IP and FIVE sibling agents share
// it; a resumed census reuses the cached sessions instead of burning
// the window)
const SESSIONS_CACHE = path.join(ROOT, '.census-sessions.json');
const sessions = {};
try {
  const cached = JSON.parse(fs.readFileSync(SESSIONS_CACHE, 'utf8'));
  if (Date.now() - cached.at < 10 * 60 * 1000 && cached.api === API) {
    Object.assign(sessions, cached.sessions);
    console.error(`↻ sessions reused from the cache (${Object.keys(sessions).join(', ')})`);
  }
} catch { /* no cache — log in fresh */ }
for (const [role, email] of Object.entries(ROLE_EMAILS)) {
  if (sessions[role]) continue;
  try {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: ROLE_PASSWORD }),
    });
    if (!res.ok) throw new Error(`login ${res.status}`);
    sessions[role] = (await res.json()).data;
  } catch (e) {
    console.error(`⚠ ${role} login failed (${e.message}) — its routes will bounce to guest`);
  }
}
try { fs.writeFileSync(SESSIONS_CACHE, JSON.stringify({ at: Date.now(), api: API, sessions })); } catch { /* best effort */ }

// RESUME (the sandbox's shared-memory OOM kills chrome mid-run no
// matter how lean the census is): a killed run's flushed evidence is
// the next run's starting point — captured (route × bp) cells are
// skipped, error cells are re-measured, and coverage is recomputed
// from the merged table.
const CENSUS_PATH = path.join(ROOT, 'audits', 'evidence', 'r325', 'y4', 'type-census.json');
const out = { meta: { base: BASE, bps: BPS, routes: ROUTES.length, tol: TOL, monoFloor: MONO_FLOOR, at: new Date().toISOString() }, violations: [], authBounces: [], captureErrors: [], coverage: { routes: 0, headings: 0, monoLabels: 0 }, resumed: false };
const perBp = {};
for (const bp of BPS) perBp[bp] = {};
const done = new Set(); // `${bp}|${route}` cells already measured
try {
  const prev = JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf8'));
  if (prev.meta?.base === BASE) {
    out.resumed = true;
    out.violations = prev.violations ?? [];
    out.authBounces = prev.authBounces ?? [];
    for (const [bp, rows] of Object.entries(prev.perBp ?? {})) {
      if (!perBp[bp]) perBp[bp] = {};
      for (const [route, row] of Object.entries(rows)) {
        if (row.error) continue; // error cells re-measure
        perBp[bp][route] = row;
        done.add(`${bp}|${route}`);
      }
    }
    console.error(`↻ resumed: ${done.size} captures carried over, ${out.violations.length} violations so far`);
  }
} catch { /* fresh run */ }
const recount = () => {
  out.coverage = { routes: 0, headings: 0, monoLabels: 0 };
  for (const rows of Object.values(perBp)) {
    for (const row of Object.values(rows)) {
      if (row.error) continue;
      out.coverage.routes += 1;
      out.coverage.headings += (row.heads ?? []).length;
      out.coverage.monoLabels += (row.mono ?? []).length;
    }
  }
};
recount();

/** N workers split the route table — the census is embarrassingly
 *  parallel. ONE is right for this sandbox (each worker = one chrome). */
const WORKERS = Number(process.env.CENSUS_WORKERS || 1);
const RECYCLE_EVERY = Number(process.env.CENSUS_RECYCLE || 18); // browser generations — the sandbox's 4GB ceiling
let cursor = 0;
/** The partial-evidence writer: perBp rides EVERY flush so a killed run
 *  resumes with all its captured cells (the resume reads this file). */
const flush = () => {
  const partial = out.coverage.routes < ROUTES.length * BPS.length;
  fs.writeFileSync(CENSUS_PATH, JSON.stringify({ ...out, perBp, partial }, null, 1));
};
async function worker() {
  // ONE browser per worker, ONE context per capture, recycled every N
  // captures: the kernel's OOM log pinned chrome as the victim (the
  // sandbox ceiling is ~4GB and FIVE sibling vite/backend processes
  // already hold ~1.7GB) — so the census keeps at most one authed page
  // alive and a chrome OOM costs one capture, never the run. The
  // session seeding re-runs per context (a localStorage write). Flags:
  // --disable-dev-shm-usage (the sandbox's 64M /dev/shm), --disable-gpu
  // + a renderer cap + a per-renderer heap cap (the dashboard surfaces
  // ballooned a renderer past 460MB before the kill).
  let b = null;
  let generation = 0; // captures served by the live browser
  let fresh = 0; // captures completed this session (flush cadence)
  const launch = async () => {
    b = await chromium.launch({
      executablePath: EXEC,
      args: ['--disable-dev-shm-usage', '--disable-gpu', '--renderer-process-limit=4', '--process-per-site', '--js-flags=--max-old-space-size=192'],
    });
    generation = 0;
  };
  const retire = async () => {
    try { await b?.close(); } catch { /* already gone */ }
    b = null;
  };
  const contextFor = async (role, bp) => {
    // a FRESH context per capture — closed in the finally below
    const ctx = await b.newContext({ viewport: { width: bp, height: 900 } });
    await ctx.addInitScript(([session]) => {
      try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* hermetic opt-out */ }
      if (session) {
        try {
          localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'light', modeUpdatedAt: Date.now() }, version: 2 }));
          localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: session.user, accessToken: session.accessToken }, version: 0 }));
        } catch { /* storage unavailable */ }
      }
    }, [sessions[role] ?? null]);
    return ctx;
  };
  while (cursor < ROUTES.length) {
    const i = cursor++;
    const routeTpl = ROUTES[i];
    const role = roleForRoute(routeTpl);
    const route = routeTpl.replace(/:(\w+)/g, (_, k) => PARAM_DEFAULTS[k] ?? 'x');
    // browser recycling: a fresh chrome every N captures keeps the
    // authed dashboards' heap from piling the sandbox past its ceiling
    // (the observed silent SIGKILL mid-run).
    if (!b || generation >= RECYCLE_EVERY) {
      await retire();
      await launch();
    }
    for (const bp of BPS) {
      if (done.has(`${bp}|${route}`)) continue; // resumed cell — already measured
      let page = null;
      let ctx = null;
      try {
        ctx = await contextFor(role, bp);
        page = await ctx.newPage();
        await page.goto(BASE + route.replace(/^\//, ''), { waitUntil: 'domcontentloaded', timeout: 30000 });
        // the app must actually MOUNT (vite transforms on first hit; the
        // landing's entrance takes a beat) — wait for #root content, then
        // let layout/fonts settle before reading computed styles.
        await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
        await page.waitForTimeout(600);
        // THE VACUOUS-PASS GUARD (Y4's lesson): a dead/expired session
        // bounces a role route to /auth — the collector then reads the
        // AUTH page's headings and the census "passes" a route it never
        // saw. A role capture that landed on /auth is recorded as a
        // bounce and asserts NOTHING (the auth door is swept by its own
        // guest route); the run FAILS if any bounce occurred — rerun
        // once the backend's auth limiter cools.
        const landed = await page.evaluate(() => location.pathname + location.search);
        const bounced = role !== 'guest' && /^\/auth(\/|\?|$)/.test(landed);
        const data = await page.evaluate(COLLECT_FN);
        generation += 1;
        fresh += 1;
        done.add(`${bp}|${route}`);
        perBp[bp][route] = { role, authed: !bounced, landed, ...data };
        recount();
        if (bounced) out.authBounces.push({ route, bp, role, landed });
        // incremental flush — a killed run still leaves its evidence
        if (fresh % 18 === 0) {
          console.error(`  … ${out.coverage.routes}/${ROUTES.length * BPS.length} captures (${out.violations.length} violations · ${out.authBounces.length} bounces · ${out.captureErrors.length} errors)`);
          flush();
        }
        if (bounced) continue; // nothing about the ROLE route was measured
        // ── the assertions ──
        for (const h of data.heads) {
          const where = `${route} @${bp} <${h.tag}${h.cls ? '.' + h.cls.split(' ')[0] : ''}> "${h.text}"`;
          if (h.fw > 600) out.violations.push({ where, rule: `font-weight ${h.fw} > 600` });
          if (!fsOk(h.fs, data.rungs)) out.violations.push({ where, rule: `font-size ${h.fs}px off every ladder rung (${[...Object.values(data.rungs), ...APP_RUNGS].join('/')}px ±1.3×)` });
          if (h.tag === 'h1' && bp === 390 && h.lines > 3) out.violations.push({ where, rule: `H1 wraps to ${h.lines} lines at 390 (> 3)` });
        }
        for (const m of data.mono) {
          if (m.svg) continue; // SVG user units scale with the drawing (R320 §A3) — collected, not asserted
          if (m.fs < MONO_FLOOR) out.violations.push({ where: `${route} @${bp} <${m.tag}${m.cls ? '.' + m.cls.split(' ')[0] : ''}> "${m.text}"`, rule: `mono label ${m.fs}px < ${MONO_FLOOR}px` });
        }
      } catch (e) {
        perBp[bp][route] = { role, error: String(e.message).slice(0, 100) };
        // a capture that errored was never measured — the run must not
        // count it as coverage (the honest census fails on it). The
        // cell stays un-done: a resumed run re-measures it.
        out.captureErrors.push({ route, bp, role, error: String(e.message).slice(0, 100) });
        // a crashed BROWSER is replaced at the next route's recycle
        // check (the !b guard)
        if (/has been closed|Target closed|Session closed/i.test(String(e.message))) {
          if (b && !b.isConnected()) await retire();
        }
      } finally {
        if (page) await page.close().catch(() => { /* already gone */ });
        if (ctx) await ctx.close().catch(() => { /* already gone */ });
      }
    }
  }
  // contexts live with the browser — closed with it
  await retire();
}
await Promise.all(Array.from({ length: WORKERS }, () => worker()));

fs.mkdirSync(path.join(ROOT, 'audits', 'evidence', 'r324'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'audits', 'evidence', 'r325', 'y4'), { recursive: true });
flush();
fs.writeFileSync(path.join(ROOT, 'audits', 'evidence', 'r324', 'type-probe.json'), JSON.stringify({ ...out, perBp }, null, 1));

console.log(`\n══ type census — ${out.coverage.routes} route captures × h1–h4 + classed seats · ${out.coverage.headings} headings · ${out.coverage.monoLabels} mono labels`);
if (out.captureErrors.length) {
  console.log(`\n⚠ ${out.captureErrors.length} CAPTURE ERROR(S) — these route captures never rendered (browser/renderer crash, mount timeout): nothing was asserted there.`);
  for (const e of out.captureErrors.slice(0, 12)) console.log(`   ↳ ${e.route} @${e.bp} (${e.role}): ${e.error}`);
  if (out.captureErrors.length > 12) console.log(`   … +${out.captureErrors.length - 12} more`);
}
if (out.authBounces.length) {
  console.log(`\n⚠ ${out.authBounces.length} AUTH BOUNCE(S) — these role captures landed on /auth (dead session / login 429): the census asserted NOTHING there.`);
  for (const b of out.authBounces.slice(0, 12)) console.log(`   ↳ ${b.route} @${b.bp} (${b.role}) → ${b.landed}`);
  if (out.authBounces.length > 12) console.log(`   … +${out.authBounces.length - 12} more`);
  console.log('   rerun once the backend auth limiter cools — a bounced census is NOT a passing census.');
}
for (const v of out.violations) console.log(`  ⚠ ${v.rule} — ${v.where}`);
const failed = out.violations.length > 0 || out.authBounces.length > 0 || out.captureErrors.length > 0;
console.log(failed ? `\n✗ ${out.violations.length} violation(s) · ${out.authBounces.length} bounce(s) · ${out.captureErrors.length} capture error(s)` : '\n✓ the ladder holds on every route');
process.exit(failed ? 1 : 0);
