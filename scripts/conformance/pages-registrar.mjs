#!/usr/bin/env node
/**
 * pages-registrar.mjs — R342-09 — the PER-PAGE conformance harness for
 * the /admin/* registrar routes (the same D6 hermetic seeded-session
 * method as pages-teacher.mjs, which this file is patterned on
 * byte-for-byte in its probe): pages.mjs's exact probe axes/score/
 * floor + the REAL e2e fixture transport (mock-transport.ts +
 * api-fixtures.ts, esbuild-bundled the r319 way) with the `mdrk-auth`
 * persist key seeded ADMIN before first paint, so the app boots
 * signed-in reload-style. Distinct filename so concurrent worker
 * branches merge without conflict (the D8/D10/D11 precedent).
 *
 * R342-09 extras (honest fixtures for the registrar surfaces the
 * standard table lacks): /admin/{stats,faculties,departments,reports,
 * courses,sync,digital,users,users/:id/permissions,students,papers},
 * /enrollments(+offerings) and /health — each mirrors its wire shape
 * (the interfaces in hooks/resources/admin.ts + the admin pages).
 *
 * Usage:
 *   node scripts/conformance/pages-registrar.mjs --url http://localhost:5309 \
 *     --routes /admin/dashboard,/admin/faculties --bps 1440,390 [--dark] [--gate]
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
  const dir = path.join(os.tmpdir(), `r341-pages-registrar-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: {
        contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, TEACHER_USER, ADMIN_USER } from ${JSON.stringify(sources[1])};`,
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
const ROUTES = (arg('routes', '/admin/dashboard') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
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
    for (const m of css.matchAll(/--(fs-[a-z-]+)\s*:/g)) {
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

/* ── the runner (hermetic seeded ADMIN session) ───────────────── */
const { installMockApi, seedSession, ADMIN_USER } = await ensureTransport();

/* R342-09 extras: honest fixtures for the registrar surfaces the
 * standard table lacks — each mirrors its wire shape (the interfaces
 * in hooks/resources/admin.ts + the admin pages' local types). */
const ok = (data) => ({ data });
const NOW = '2026-11-07T10:00:00.000Z';
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();
const daysAgo = (d) => new Date(Date.parse(NOW) - d * 86400_000).toISOString();

/* ── /admin/stats — the KPI aggregate (AdminStats). */
const ASTATS = { totalStudents: 1240, totalTeachers: 96, totalCourses: 148, totalEnrollments: 3860 };

/* ── /admin/faculties — the faculty→departments tree (AdminFaculty). */
const AFACULTIES = [
  { id: 'fac_e2e_eng', name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: '⚙️', city: 'الزاوية', departmentCount: 3, studentCount: 420, teacherCount: 28, courseCount: 12,
    departments: [
      { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', students: 180, teachers: 12, courses: 6 },
      { id: 'dep_e2e_ee', name: 'قسم الهندسة الكهربائية', students: 140, teachers: 9, courses: 4 },
      { id: 'dep_e2e_ce', name: 'قسم الهندسة المدنية', students: 100, teachers: 7, courses: 2 },
    ] },
  { id: 'fac_e2e_sci', name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: '🔬', city: 'الزاوية', departmentCount: 2, studentCount: 310, teacherCount: 19, courseCount: 9,
    departments: [
      { id: 'dep_e2e_math', name: 'قسم الرياضيات', students: 170, teachers: 10, courses: 5 },
      { id: 'dep_e2e_phys', name: 'قسم الفيزياء', students: 140, teachers: 9, courses: 4 },
    ] },
];

/* ── /admin/reports — headline + paper trend + top courses (AdminReports). */
const AREPORTS = {
  headline: { totalPapers: 64, publishedPapers: 41, totalUsers: 1336, activeStudents: 1102 },
  paperTrend: [
    { month: '2026-06', submitted: 8, graded: 6, published: 4 },
    { month: '2026-07', submitted: 11, graded: 9, published: 6 },
    { month: '2026-08', submitted: 9, graded: 8, published: 7 },
    { month: '2026-09', submitted: 14, graded: 10, published: 8 },
    { month: '2026-10', submitted: 12, graded: 11, published: 9 },
    { month: '2026-11', submitted: 10, graded: 7, published: 7 },
  ],
  topCourses: [
    { code: 'CS-201', name: 'مقدمة في الخوارزميات', enrollments: 64, lectures: 12 },
    { code: 'CS-304', name: 'قواعد البيانات', enrollments: 48, lectures: 10 },
    { code: 'MATH-101', name: 'التفاضل والتكامل', enrollments: 41, lectures: 14 },
  ],
};

/* ── /admin/courses — the enveloped, paginated roster (the e2e
 * ADMIN_COURSES wire shape: { data, meta } at the TOP level — the
 * pages read res.data.data / res.data.meta). */
const ACOURSES = {
  data: [
    { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', credits: 3, themeColor: '#7c3aed', faculty: 'كلية الهندسة', facultyEmoji: '⚙️', department: 'قسم علوم الحاسوب', departmentId: 'dep_e2e_cs', offeringCount: 2, conceptCount: 14, totalEnrollments: 64, totalLectures: 12, totalMaterials: 5, recentOfferings: [
      { id: 'offr_e2e_t_algo', term: 'خريف 2026', enrollments: 64, lectures: 12, teacher: 'ليلى الفيتوري' },
    ] },
    { id: 'crs_e2e_ethics', code: 'PHIL-101', name: 'مدخل إلى الأخلاق', credits: 2, themeColor: null, faculty: 'كلية الآداب', facultyEmoji: null, department: 'قسم الفلسفة', departmentId: 'dep_e2e_phil', offeringCount: 0, conceptCount: 0, totalEnrollments: 0, totalLectures: 0, totalMaterials: 0, recentOfferings: [] },
    { id: 'crs_e2e_databases', code: 'CS-304', name: 'قواعد البيانات', credits: 3, themeColor: '#0e7490', faculty: 'كلية الهندسة', facultyEmoji: '⚙️', department: 'قسم علوم الحاسوب', departmentId: 'dep_e2e_cs', offeringCount: 1, conceptCount: 9, totalEnrollments: 48, totalLectures: 10, totalMaterials: 4, recentOfferings: [
      { id: 'offr_e2e_t_db', term: 'خريف 2026', enrollments: 48, lectures: 10, teacher: 'ليلى الفيتوري' },
    ] },
  ],
  meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
};

/* ── /admin/departments — the course-form picker (department rows). */
const ADEPARTMENTS = AFACULTIES.flatMap((f) => f.departments.map((d) => ({ ...d, facultyId: f.id, facultyName: f.name })));

/* ── /admin/sync — the SyncResponse wire shape (AdminSyncPage). */
const ASYNC = {
  latestRun: { id: 'run_e2e_1', startedAt: hoursAgo(50), completedAt: hoursAgo(49), status: 'SUCCESS', source: 'وزارة التعليم العالي', factsAdded: 12, factsUpdated: 34, durationMs: 8210, errorMsg: null, notes: 'مزامنة دورية' },
  runHistory: [
    { id: 'run_e2e_1', startedAt: hoursAgo(50), completedAt: hoursAgo(49), status: 'SUCCESS', source: 'وزارة التعليم العالي', factsAdded: 12, factsUpdated: 34, durationMs: 8210, errorMsg: null, notes: 'مزامنة دورية' },
    { id: 'run_e2e_0', startedAt: daysAgo(9), completedAt: daysAgo(9), status: 'PARTIAL', source: 'وزارة التعليم العالي', factsAdded: 4, factsUpdated: 2, durationMs: 15230, errorMsg: 'انقطاع مؤقت في الاتصال', notes: null },
  ],
  factCount: 46,
  staleCount: 2,
  categories: [
    { category: 'بيانات الجامعة', count: 24, items: [
      { key: 'اسم الجامعة', value: 'جامعة الزاوية', source: 'السجلّ الرسمي', isStale: false, syncedAt: hoursAgo(49) },
      { key: 'عدد الكليات', value: '6', source: 'السجلّ الرسمي', isStale: false, syncedAt: hoursAgo(49) },
    ] },
    { category: 'الأسماء والهوية', count: 22, items: [
      { key: 'أسماء العمداء', value: 'محدثة جزئيًا', source: 'قرارات إدارية', isStale: true, syncedAt: daysAgo(40) },
      { key: 'أسماء الأقسام', value: 'محدثة', source: 'السجلّ الرسمي', isStale: false, syncedAt: hoursAgo(49) },
    ] },
  ],
};

/* ── /admin/digital — the DigitalMetrics aggregate. */
const ADIGITAL = { totalUsers: 1336, activeUsers: 1102, adoptionPct: 82.5, onlineExams: 38, examAttempts: 2140, labSessions: 96, moocEnrollments: 310, researchPapers: 64, liveSessions: 120, materialsUploaded: 412 };

/* ── /admin/users — the enveloped, role-filtered roster. */
const AUSERS_TEACHERS = {
  data: [
    { id: 'usr_e2e_teacher', email: 'layla@zu.edu.ly', firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER', avatarColor: '#7c3aed', avatarInitials: 'لف', isActive: true, createdAt: '2026-01-10T08:00:00.000Z' },
    { id: 'usr_e2e_teacher2', email: 'khaled@zu.edu.ly', firstName: 'خالد', lastName: 'المبروك', role: 'TEACHER', avatarColor: '#059669', avatarInitials: 'خم', isActive: true, createdAt: '2026-02-02T08:00:00.000Z' },
    { id: 'usr_e2e_teacher3', email: 'amina@zu.edu.ly', firstName: 'أمينة', lastName: 'الشريف', role: 'TEACHER', avatarColor: '#d97706', avatarInitials: 'أش', isActive: false, createdAt: '2026-01-20T08:00:00.000Z' },
  ],
  meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
};
const APERMISSIONS = {
  user: { id: 'usr_e2e_teacher', email: 'layla@zu.edu.ly', role: 'TEACHER', firstName: 'ليلى', lastName: 'الفيتوري', scopeFacultyId: null, scopeFaculty: null },
  roleDefaults: [],
  effective: [],
  overrides: [],
};

/* ── /admin/students — the enveloped, paginated roster. */
const ASTUDENTS = {
  data: [
    { id: 'stu_e2e_1', email: 'marwa@zu.edu.ly', firstName: 'مروة', lastName: 'البراني', isActive: true, avatarColor: '#0ea5e9', avatarInitials: 'مر', createdAt: '2026-01-15T08:00:00.000Z', studentProfile: { universityId: 'zu-2023-1041', year: 3, gpa: '3.4', totalXp: 1240, level: 8, faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' }, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' } } },
    { id: 'stu_e2e_2', email: 'salim@zu.edu.ly', firstName: 'سالم', lastName: 'قدّور', isActive: true, avatarColor: '#059669', avatarInitials: 'سق', createdAt: '2026-01-16T08:00:00.000Z', studentProfile: { universityId: 'zu-2023-1042', year: 2, gpa: '2.8', totalXp: 860, level: 6, faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' }, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' } } },
    { id: 'stu_e2e_3', email: 'mona@zu.edu.ly', firstName: 'منى', lastName: 'الزوي', isActive: false, avatarColor: '#f59e0b', avatarInitials: 'من', createdAt: '2026-01-18T08:00:00.000Z', studentProfile: null },
  ],
  meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
};

/* ── /admin/papers — the enveloped, status-filtered register. */
const APAPERS = {
  data: [
    { id: 'pap_e2e_1', title: 'فهرسة قواعد البيانات الموزعة', status: 'PUBLISHED', uploadedAt: hoursAgo(24 * 20), student: { firstName: 'سالم', lastName: 'قدّور' }, offering: { course: { code: 'CS-304', name: 'قواعد البيانات' } } },
    { id: 'pap_e2e_2', title: 'الخوارزميات الجشعة في جدولة المهام', status: 'GRADED', uploadedAt: hoursAgo(24 * 6), student: { firstName: 'مروة', lastName: 'البراني' }, offering: { course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } } },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

/* ── /enrollments — the student's live enrollments + the offering picker. */
const AENROLLMENTS = [
  { id: 'enr_e2e_1', progressPct: 64, status: 'ACTIVE', enrolledAt: hoursAgo(24 * 30), offering: { id: 'offr_e2e_t_algo', term: 'خريف 2026', room: 'قاعة أ-١', capacity: 80, course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: '🧮' }, teacher: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري' } } },
];
const AENROLL_OFFERINGS = [
  { id: 'offr_e2e_t_algo', term: 'خريف 2026', room: 'قاعة أ-١', capacity: 80, course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: '🧮' }, teacher: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري' }, _count: { enrollments: 64 } },
  { id: 'offr_e2e_t_db', term: 'خريف 2026', room: 'معمل الحاسوب ٢', capacity: 60, course: { id: 'crs_e2e_databases', name: 'قواعد البيانات', code: 'CS-304', iconEmoji: '🗄️' }, teacher: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري' }, _count: { enrollments: 48 } },
];

const overrides = [
  { method: 'GET', path: '/admin/stats', json: ok(ASTATS) },
  { method: 'GET', path: '/admin/faculties', json: ok(AFACULTIES) },
  { method: 'GET', path: '/admin/departments', json: ok(ADEPARTMENTS) },
  { method: 'GET', path: '/admin/reports', json: ok(AREPORTS) },
  { method: 'GET', path: '/admin/courses', json: ACOURSES },
  { method: 'GET', path: '/admin/sync', json: ok(ASYNC) },
  { method: 'GET', path: '/admin/digital', json: ok(ADIGITAL) },
  { method: 'GET', path: '/admin/users', json: AUSERS_TEACHERS },
  { method: 'GET', path: '/admin/users/:id/permissions', json: ok(APERMISSIONS) },
  { method: 'GET', path: '/admin/students', json: ASTUDENTS },
  { method: 'GET', path: '/admin/papers', json: APAPERS },
  { method: 'GET', path: '/enrollments', json: ok(AENROLLMENTS) },
  { method: 'GET', path: '/enrollments/offerings', json: ok(AENROLL_OFFERINGS) },
  /* /health: raw (not enveloped) — the settings page reads res.data. */
  { method: 'GET', path: '/health', json: { ok: true, dbLatencyMs: 12 } },
];

/* the seeded auth state: ADMIN_USER + the institution context the
 * institution-scoped queries key on (the shape auth.store hydrates). */
const seededUser = { ...ADMIN_USER, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', nameEn: 'Zawia University', slug: 'zu' }, membershipRole: 'ADMIN' };

/* /auth/me is AUTHORITATIVE for the institution context (useAuth.useMe
 * → applySessionExtras: "no context in the payload resets the context")
 * — the stock meProfile() carries none, so the seeded context would be
 * wiped on boot. A page-level route answers with the me profile + the
 * r178 session-extras siblings (D7a's harness precedent). */
const meJson = JSON.stringify({
  data: {
    id: ADMIN_USER.id,
    email: ADMIN_USER.email,
    firstName: ADMIN_USER.firstName,
    lastName: ADMIN_USER.lastName,
    role: ADMIN_USER.role,
    avatarColor: ADMIN_USER.avatarColor,
    avatarInitials: ADMIN_USER.avatarInitials,
    scopeFaculty: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: '2026-03-15T10:00:00.000Z',
    onboardingCompletedAt: '2026-03-01T10:00:00.000Z',
    firedMilestones: [],
    studentProfile: null,
    teacherProfile: null,
    memberships: [],
    currentInstitution: seededUser.currentInstitution,
    membershipRole: 'ADMIN',
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
        await installMockApi(context, { sessionUser: ADMIN_USER, overrides });
        await seedSession(context, seededUser, { token: 'e2e-token-teacher', theme: theme === 'dark' ? 'dark' : undefined });
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
writeFileSync(join(__dirname, "pages-registrar-results.json"), JSON.stringify(out, null, 1));
console.log(`\npages-registrar conformance — ${ROUTES.join(", ")} (${DARK ? "dark" : "light"}): worst cell ${worst}% (floor ${FLOOR})`);
if (GATE && worst < FLOOR) {
  console.error(`pages-registrar gate: FAIL — a cell scored ${worst}% < ${FLOOR}%`);
  process.exit(1);
}
console.log("pages-registrar gate: PASS");
