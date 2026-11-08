#!/usr/bin/env node
/**
 * pages-authed.mjs — R341 D7a — the PER-PAGE conformance harness for
 * the authed STUDENT routes (the D6 hermetic seeded-session method,
 * pages.mjs's exact probe axes/score/floor): the REAL e2e fixture
 * transport (mock-transport.ts + api-fixtures.ts, esbuild-bundled the
 * r319 way) with the `mdrk-auth` persist key seeded STUDENT before
 * first paint, so the app boots signed-in reload-style. Distinct
 * filename from pages-quality.mjs (D10's QUALITY twin) so the
 * concurrent branches merge without conflict.
 *
 * D7a extras (honest fixtures for the student surfaces the standard
 * table lacks): /me/gaps (the dashboard's remediation rail), /me/results
 * (the momentum band's GradeBars), and /courses?institutionSlug=… (the
 * read-only catalogue grid + its pagination meta).
 *
 * Usage:
 *   node scripts/conformance/pages-authed.mjs --url http://localhost:5341 \
 *     --routes /student/dashboard,/student/courses --bps 1440,390 [--dark] [--gate]
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/* esbuild arrives via the repo root (same resolution as r319/gate.mjs). */
const require = createRequire(import.meta.url);
let chromium;
let esbuild;
try {
  ({ chromium } = require('./../../frontend/node_modules/playwright'));
  esbuild = require.esbuild ?? require('./../../frontend/node_modules/esbuild');
} catch {
  ({ chromium } = createRequire('/home/z/madarek/frontend/package.json')('playwright'));
  esbuild = createRequire('/home/z/madarek/frontend/package.json')('esbuild');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, '..', '..');

/* ── hermetic transport (the REAL e2e fixtures, esbuild-bundled) ── */
async function ensureTransport() {
  const srcDir = path.join(WORKTREE, 'frontend/tests/e2e/fixtures');
  const sources = ['mock-transport.ts', 'api-fixtures.ts'].map((f) => path.join(srcDir, f));
  const hash = crypto
    .createHash('sha1')
    .update(sources.map((f) => fs.readFileSync(f)).join(''))
    .digest('hex')
    .slice(0, 12);
  const dir = path.join(os.tmpdir(), `r341-pages-authed-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: {
        contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, OFFERING_ID } from ${JSON.stringify(sources[1])};`,
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

const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const ROUTES = (arg('routes', '/student/dashboard') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
const BPS = (arg('bps', '1440,390') ?? '').split(',').map((b) => Number(b.trim())).filter(Boolean);
const DARK = process.argv.includes('--dark');
const GATE = process.argv.includes('--gate');
const URL = arg('url', 'http://localhost:5173/');
const FLOOR = 90;

/* the type ladder: rung NAMES (--fs-*) harvested from the token sheets */
const rungNames = [];
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const f of ['tokens.css', 'tokens.generated.css']) {
    let css = '';
    try { css = strip(readFileSync(join(WORKTREE, 'frontend', 'src', 'styles', 'tokens', f), 'utf8')); } catch { continue; }
    for (const m of css.matchAll(/--(fs-[a-z0-9-]+)\s*:/g)) {
      if (!rungNames.includes(m[1])) rungNames.push(m[1]);
    }
  }
}
const RUNG_TOL = 0.5;

/* ── the in-browser probe (byte-identical to pages.mjs) ─────────── */
const PAGE_PROBE = (cfg) => {
  const { bp, rungNames, rungTol } = cfg;
  const measurer = document.createElement("span");
  measurer.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(measurer);
  const rungs = [];
  for (const name of rungNames) {
    measurer.style.fontSize = `var(--${name}, 999px)`;
    const px = parseFloat(getComputedStyle(measurer).fontSize);
    if (px > 0 && px < 900) rungs.push(px);
  }
  measurer.remove();
  const vw = window.innerWidth;
  const textNodes = [];
  const walk = (n) => {
    if (!(n instanceof HTMLElement)) return;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    let hasText = false;
    for (const t of n.childNodes) if (t.nodeType === 3 && t.textContent.trim()) { hasText = true; break; }
    if (hasText && parseFloat(cs.opacity || "1") >= 0.3) {
      textNodes.push({ el: n, fs: parseFloat(cs.fontSize) || 0, ff: cs.fontFamily, color: cs.color, op: parseFloat(cs.opacity || "1") });
    }
    for (const c of n.children) walk(c);
  };
  walk(document.body);
  const parseCol = (c) => {
    const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const ebgOf = (el) => {
    let chain = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const bg = parseCol(cs.backgroundColor);
      if (bg && bg.a >= 0.999) return blend(chain, bg);
      if (bg && bg.a > 0) chain.push(bg);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      n = n.parentElement;
    }
    return blend(chain, parseCol(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 });
  };
  const blend = (chain, base) => {
    let out = base;
    for (const c of chain) out = { r: Math.round(c.r * c.a + out.r * (1 - c.a)), g: Math.round(c.g * c.a + out.g * (1 - c.a)), b: Math.round(c.b * c.a + out.b * (1 - c.a)), a: 1 };
    return `rgb(${out.r}, ${out.g}, ${out.b})`;
  };
  const lum = (rgb) => {
    const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    const f = (v) => { v = +v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(m[1]) + 0.7152 * f(m[2]) + 0.0722 * f(m[3]);
  };
  const contrast = (ink, bg, op) => {
    const L1 = lum(ink); const L2 = lum(bg);
    if (L1 == null || L2 == null) return null;
    const eff = op < 1 ? null : L1;
    if (eff == null) return null;
    return (Math.max(eff, L2) + 0.05) / (Math.min(eff, L2) + 0.05);
  };
  let rungPass = 0, rungTotal = 0;
  const rungFails = [];
  const fsCount = {};
  for (const t of textNodes) {
    rungTotal++;
    const ok = rungs.some((r) => Math.abs(r - t.fs) <= rungTol);
    if (ok) rungPass++; else rungFails.push({ fs: t.fs, ff: t.ff.slice(0, 40), text: (t.el.textContent || "").trim().slice(0, 24) });
    fsCount[t.fs] = (fsCount[t.fs] ?? 0) + 1;
  }
  const distinctTiers = Object.keys(fsCount).length >= 2;
  let spPass = 0, spTotal = 0;
  for (const n of document.querySelectorAll("main, main section, main section > div, form, form > div")) {
    if (!(n instanceof HTMLElement)) continue;
    const cs = getComputedStyle(n);
    if (cs.display === "none") continue;
    for (const v of [cs.marginTop, cs.marginBottom, cs.paddingTop, cs.paddingBottom]) {
      const px = parseFloat(v);
      if (!px) continue;
      spTotal++;
      if (Math.abs(px % 4) < 0.5 || Math.abs(px % 4) > 3.5) spPass++;
    }
  }
  const pat = {
    paper: (() => { const b = getComputedStyle(document.body); const bg = parseCol(b.backgroundColor); return bg != null && bg.a > 0.9; })(),
    hairline: [...document.querySelectorAll("main *")].some((n) => {
      const cs = getComputedStyle(n);
      return cs.borderBottomWidth === "1px" && parseCol(cs.borderBottomColor) != null && n instanceof HTMLElement;
    }),
    numeral: document.body.innerText.match(/\[\d{2}\]/) != null,
    eyebrow: document.querySelector(".lp-eyebrow, .pf-eyebrow, [class*='eyebrow'], [class*='kicker'], .auth-meta, .auth-cell-index") != null,
    ctaPair: (() => {
      const btns = [...document.querySelectorAll("main a[href], main button[type='submit'], main button[type='button']")].filter((b) => {
        const cs = getComputedStyle(b);
        return cs.display !== "none" && b instanceof HTMLElement && b.textContent.trim().length > 0 && b.textContent.trim().length < 30;
      });
      return btns.length >= 2;
    })(),
  };
  const patScore = (Object.values(pat).filter(Boolean).length / 5) * 100;
  let inkPass = 0, inkTotal = 0;
  const inkFails = [];
  for (const t of textNodes) {
    const bg = ebgOf(t.el);
    if (bg == null) continue;
    const ratio = contrast(t.color, bg, t.op);
    if (ratio == null) continue;
    inkTotal++;
    if (ratio >= 4.5) inkPass++;
    else if (inkFails.length < 12) inkFails.push({ text: (t.el.textContent || "").trim().slice(0, 24), ratio: Math.round(ratio * 100) / 100, color: t.color, bg });
  }
  let gutter = { pass: true, l: 0, r: 0 };
  if (bp === 390) {
    const main = document.querySelector("main");
    const el = main ?? document.body;
    if (el) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const cl = r.left + (parseFloat(cs.paddingLeft) || 0);
      const cr = r.right - (parseFloat(cs.paddingRight) || 0);
      gutter = { pass: Math.abs(cl - 8) <= 2 && Math.abs(vw - cr - 8) <= 2, l: Math.round(cl), r: Math.round(vw - cr) };
    }
  }
  return {
    typeRungs: { score: rungTotal ? (rungPass / rungTotal) * 100 : 100, distinctTiers, fails: rungFails.slice(0, 10), total: rungTotal, resolvedRungs: rungs },
    spacing: { score: spTotal ? (spPass / spTotal) * 100 : 100, total: spTotal },
    pattern: { score: patScore, ...pat },
    darkInk: { score: inkTotal ? (inkPass / inkTotal) * 100 : 100, fails: inkFails, total: inkTotal },
    edge390: { score: gutter.pass ? 100 : 0, ...gutter },
  };
};

const CTA_PROBE = () => {
  const primary = document.querySelector("main button[type='submit'], main .btn.accent, main a[class*='accent'], main a[class*='primary']");
  if (!primary) return null;
  const r = primary.getBoundingClientRect();
  const cs = getComputedStyle(primary);
  return {
    label: (primary.textContent || "").trim().slice(0, 20),
    cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
    before: { color: cs.color, bg: cs.backgroundColor, bd: cs.borderBottomColor, tr: cs.transform, op: cs.opacity, sh: cs.boxShadow },
  };
};
const CTA_READ = () => {
  const primary = document.querySelector("main button[type='submit'], main .btn.accent, main a[class*='accent'], main a[class*='primary']");
  if (!primary) return null;
  const cs = getComputedStyle(primary);
  return { color: cs.color, bg: cs.backgroundColor, bd: cs.borderBottomColor, tr: cs.transform, op: cs.opacity, sh: cs.boxShadow };
};

/* ── the runner (hermetic seeded STUDENT session) ───────────────── */
const { installMockApi, seedSession, STUDENT_USER, OFFERING_ID } = await ensureTransport();

/* D7a extras: honest fixtures for the three student surfaces the
 * standard table lacks (each mirrors its wire shape — the interfaces
 * in hooks/resources/student.ts). */
const ok = (data) => ({ data });
const NOW = '2026-03-15T10:00:00.000Z';
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();

/* GET /me/gaps — Gap[] (the dashboard's «فجوات يُنصح بسدّها» rail). */
const GAPS = [
  { conceptId: 'cpt_e2e_dp', conceptName: 'البرمجة الديناميكية', courseId: 'crs_e2e_algorithms', courseName: 'مقدمة في الخوارزميات', courseColor: '#7c3aed', level: 0.2, recommendedLectureId: 'lec_e2e_greedy', recommendedLectureTitle: 'الخوارزميات الجشعة' },
  { conceptId: 'cpt_e2e_grd', conceptName: 'الخوارزميات الجشعة', courseId: 'crs_e2e_algorithms', courseName: 'مقدمة في الخوارزميات', courseColor: '#7c3aed', level: 0.55, recommendedLectureId: null, recommendedLectureTitle: null },
  { conceptId: 'cpt_e2e_idx', conceptName: 'الفهارس في قواعد البيانات', courseId: 'crs_e2e_databases', courseName: 'قواعد البيانات المتقدمة', courseColor: '#0ea5e9', level: 0.4, recommendedLectureId: 'lec_e2e_sql', recommendedLectureTitle: 'استعلامات SQL المتقدمة' },
];

/* GET /me/results — StudentResults (the momentum band's GradeBars). */
const RESULTS = {
  headline: {
    avgGradePct: 78,
    highest: { courseName: 'مقدمة في الخوارزميات', gradePct: 92 },
    lowest: { courseName: 'قواعد البيانات المتقدمة', gradePct: 64 },
    courseCount: 2,
  },
  courses: [],
  recentAssignments: [
    { id: 'asg_e2e_1', title: 'واجب الأسبوع الثالث', type: 'HOMEWORK', offeringId: OFFERING_ID, gradePct: 90, gradedAt: hoursAgo(30) },
    { id: 'asg_e2e_2', title: 'تقرير المعمل الثاني', type: 'PROJECT', offeringId: 'offr_e2e_databases', gradePct: 66, gradedAt: hoursAgo(80) },
    { id: 'asg_e2e_3', title: 'اختبار قصير — الوحدة الثانية', type: 'QUIZ', offeringId: OFFERING_ID, gradePct: 78, gradedAt: hoursAgo(150) },
  ],
};

/* GET /courses?institutionSlug=zu — CatalogCourseRow[] + meta (the
 * read-only catalogue grid; enrollment is admin-mediated). */
const CATALOG = {
  data: [
    { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: '🧮', themeColor: '#7c3aed', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', slug: 'zu' } },
    { id: 'crs_e2e_databases', code: 'CS-310', name: 'قواعد البيانات المتقدمة', iconEmoji: '🗄️', themeColor: '#0ea5e9', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', slug: 'zu' } },
    { id: 'crs_e2e_stats', code: 'MA-210', name: 'الإحصاء التطبيقي', iconEmoji: '📊', themeColor: '#15803d', credits: 2, department: { id: 'dep_e2e_math', name: 'قسم الرياضيات' }, institution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', slug: 'zu' } },
    { id: 'crs_e2e_net', code: 'CS-304', name: 'شبكات الحاسوب', iconEmoji: '🌐', themeColor: '#b45309', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', slug: 'zu' } },
    { id: 'crs_e2e_ai', code: 'CS-410', name: 'أساسيات الذكاء الاصطناعي', iconEmoji: '🤖', themeColor: '#dc2626', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', slug: 'zu' } },
    { id: 'crs_e2e_se', code: 'CS-330', name: 'هندسة البرمجيات', iconEmoji: '🧩', themeColor: '#0891b2', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', slug: 'zu' } },
  ],
  meta: { page: 1, limit: 12, total: 6, totalPages: 1 },
};

const overrides = [
  { method: 'GET', path: '/me/gaps', json: ok(GAPS) },
  { method: 'GET', path: '/me/results', json: ok(RESULTS) },
  { method: 'GET', path: '/courses', json: CATALOG },
];

/* the seeded auth state: STUDENT_USER + the institution context the
 * institution-scoped queries key on (the shape auth.store hydrates —
 * the catalogue's disabled-without-context gate). */
const seededUser = { ...STUDENT_USER, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', nameEn: 'Zawia University', slug: 'zu' }, membershipRole: 'STUDENT' };

/* /auth/me is AUTHORITATIVE for the institution context (useAuth.useMe
 * → applySessionExtras: "no context in the payload resets the context")
 * — the stock meProfile() carries none, so the seeded context would be
 * wiped on boot. A page-level route answers with the me profile + the
 * r178 session-extras siblings (D10's harness precedent). */
const meJson = JSON.stringify({
  data: {
    id: STUDENT_USER.id,
    email: STUDENT_USER.email,
    firstName: STUDENT_USER.firstName,
    lastName: STUDENT_USER.lastName,
    role: STUDENT_USER.role,
    avatarColor: STUDENT_USER.avatarColor,
    avatarInitials: STUDENT_USER.avatarInitials,
    scopeFaculty: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: '2026-03-15T10:00:00.000Z',
    onboardingCompletedAt: '2026-03-01T10:00:00.000Z',
    firedMilestones: [],
    studentProfile: {
      universityId: '2023-11045',
      year: 3,
      facultyId: 'fac_e2e_eng',
      departmentId: 'dep_e2e_cs',
      faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' },
      department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
    },
    teacherProfile: null,
    memberships: [],
    currentInstitution: seededUser.currentInstitution,
    membershipRole: 'STUDENT',
  },
});

const browser = await chromium.launch({ headless: true });
const out = { generatedAt: new Date().toISOString(), url: URL, dark: DARK, routes: {}, gate: GATE, floor: FLOOR };
let worst = 100;
try {
  for (const route of ROUTES) {
    out.routes[route] = {};
    for (const bp of BPS) {
      for (const theme of DARK ? ["dark"] : ["light"]) {
        const context = await browser.newContext({ viewport: { width: bp, height: bp === 390 ? 844 : 900 } });
        await installMockApi(context, { sessionUser: STUDENT_USER, overrides });
        await seedSession(context, seededUser, { token: 'e2e-token-student', theme: theme === 'dark' ? 'dark' : undefined });
        const page = await context.newPage();
        await page.route('**/auth/me', async (route) => {
          if (route.request().method().toUpperCase() !== 'GET') { await route.fallback(); return; }
          await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: meJson });
        });
        await page.goto(`${URL.replace(/\/$/, "")}${route}`, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1800);
        const r = await page.evaluate(PAGE_PROBE, { bp, rungNames, rungTol: RUNG_TOL });
        const cta = await page.evaluate(CTA_PROBE);
        let hover = { score: 0, channels: 0, label: cta?.label ?? "" };
        if (cta && Number.isFinite(cta.cx) && Number.isFinite(cta.cy)) {
          await page.mouse.move(cta.cx, cta.cy);
          await page.waitForTimeout(250);
          const after = await page.evaluate(CTA_READ);
          if (after) {
            const channels = Object.keys(cta.before).filter((k) => cta.before[k] !== after[k]);
            hover = { score: channels.length >= 2 ? 100 : 0, channels: channels.length, label: cta.label };
          }
          await page.mouse.move(0, 0);
        }
        r.hover = hover;
        const axes = ["typeRungs", "spacing", "pattern", "darkInk", "edge390", "hover"];
        const score = Math.round((axes.reduce((a, k) => a + Math.min(100, r[k].score), 0) / axes.length) * 10) / 10;
        out.routes[route][`${bp}:${theme}`] = { score, axes: r };
        worst = Math.min(worst, score);
        console.log(`  ${route} @${bp} ${theme}: ${score}%  [${axes.map((k) => `${k} ${Math.round(Math.min(100, r[k].score))}`).join(" · ")}]`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(__dirname, "pages-authed-results.json"), JSON.stringify(out, null, 1));
console.log(`\npages-authed conformance — ${ROUTES.join(", ")} (${DARK ? "dark" : "light"}): worst cell ${worst}% (floor ${FLOOR})`);
if (GATE && worst < FLOOR) {
  console.error(`pages-authed gate: FAIL — a cell scored ${worst}% < ${FLOOR}%`);
  process.exit(1);
}
console.log("pages-authed gate: PASS");
