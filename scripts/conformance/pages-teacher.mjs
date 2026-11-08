#!/usr/bin/env node
/**
 * pages-teacher.mjs — R341 D8 — the PER-PAGE conformance harness for
 * the /teacher/* routes (the D6 hermetic seeded-session method, D7a's
 * pages-authed.mjs shape): pages.mjs's exact probe axes/score/floor +
 * the REAL e2e fixture transport (mock-transport.ts + api-fixtures.ts,
 * esbuild-bundled the r319 way) with the `mdrk-auth` persist key
 * seeded TEACHER before first paint, so the app boots signed-in
 * reload-style. Distinct filename (not pages-authed.mjs) so the
 * concurrent D7/D10 branches merge without conflict.
 *
 * D8 extras (honest fixtures for the teacher surfaces the standard
 * table lacks): /teacher/{dashboard,me/offerings,me/materials,risks},
 * /me/teacher-profile, the per-offering trio (students/analytics/
 * grades), /research/queue, /exams/templates(+attempts), the
 * question-bank pair, /live/sessions, /labs, /invites, /me/permissions
 * and /messages — TEACHER_ASSIGNMENTS/PENDING_SUBMISSIONS ride the
 * shared api-fixtures corpus (teacher-grading.e2e's payloads).
 *
 * Usage:
 *   node scripts/conformance/pages-teacher.mjs --url http://localhost:5342 \
 *     --routes /quality/dashboard,/quality/courses --bps 1440,390 [--dark] [--gate]
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
  const dir = path.join(os.tmpdir(), `r341-pages-teacher-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: {
        contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, TEACHER_USER, TEACHER_ASSIGNMENTS, PENDING_SUBMISSIONS, MODERATION_QUEUE, MODERATION_TEMPLATES } from ${JSON.stringify(sources[1])};`,
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
const ROUTES = (arg('routes', '/quality/dashboard') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
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

/* ── the runner (hermetic seeded TEACHER session) ───────────────── */
const { installMockApi, seedSession, TEACHER_USER, TEACHER_ASSIGNMENTS, PENDING_SUBMISSIONS, MODERATION_QUEUE, MODERATION_TEMPLATES } = await ensureTransport();

/* D8 extras: honest fixtures for the teacher surfaces the standard
 * table lacks — each mirrors its wire shape (the interfaces in
 * hooks/resources/{teacher,exams,research,live,invites}.ts). */
const ok = (data) => ({ data });
const NOW = '2026-11-07T10:00:00.000Z';
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();
const daysAhead = (d) => new Date(Date.parse(NOW) + d * 86400_000).toISOString();

/* ── the offerings corpus (schedule + pickers + attendance/grades/
 * students/performance/intelligence all compose it) — the frozen NOW
 * is a Saturday (2026-11-07, getDay()=6) so today markers render. */
const OFFERINGS = [
  { id: 'offr_e2e_t_algo', term: 'خريف 2026', room: 'قاعة أ-١', capacity: 80, course: { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: '🧮', themeColor: '#7c3aed', credits: 3 }, _count: { enrollments: 64, assignments: 6, lectures: 24, examTemplates: 2 }, schedule: [
    { id: 'sch_e2e_a1', dayOfWeek: 6, startTime: '09:00', endTime: '10:40', room: 'قاعة أ-١' },
    { id: 'sch_e2e_a2', dayOfWeek: 1, startTime: '11:00', endTime: '12:40', room: 'قاعة ب-٣' },
  ] },
  { id: 'offr_e2e_t_db', term: 'خريف 2026', room: 'معمل الحاسوب ٢', capacity: 60, course: { id: 'crs_e2e_databases', code: 'CS-304', name: 'قواعد البيانات', iconEmoji: '🗄️', themeColor: '#0e7490', credits: 3 }, _count: { enrollments: 48, assignments: 5, lectures: 26, examTemplates: 1 }, schedule: [
    { id: 'sch_e2e_b1', dayOfWeek: 2, startTime: '09:00', endTime: '10:40', room: 'معمل الحاسوب ٢' },
    { id: 'sch_e2e_b2', dayOfWeek: 4, startTime: '13:00', endTime: '14:40', room: 'معمل الحاسوب ٢' },
  ] },
];

/* ── /teacher/dashboard — the TeacherDashboard aggregate. */
const TDASH = {
  kpi: { studentCount: 112, avgGradePct: 78.4, attendancePct: 86.2, needsReview: 2 },
  pendingGrading: [
    { assignmentId: 'asg_e2e_teacher_1', title: 'واجب الأسبوع الثالث', type: 'HOMEWORK', course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' }, count: 2, oldestSubmittedAt: hoursAgo(26), actionTo: '/teacher/assignments' },
  ],
  trend: [
    { week: 'الأسبوع 1', avgGradePct: 72, attendancePct: 88 },
    { week: 'الأسبوع 2', avgGradePct: 74.5, attendancePct: 85 },
    { week: 'الأسبوع 3', avgGradePct: 71, attendancePct: 90 },
    { week: 'الأسبوع 4', avgGradePct: 76, attendancePct: 84 },
    { week: 'الأسبوع 5', avgGradePct: 78.4, attendancePct: 86.2 },
    { week: 'الأسبوع 6', avgGradePct: null, attendancePct: null },
  ],
  feed: [
    { kind: 'submissions', id: 'f1', author: { firstName: 'مروة', lastName: 'البراني', avatarInitials: 'مر', avatarColor: '#0ea5e9' }, meta: 'CS-201', when: hoursAgo(2), title: 'واجب الأسبوع الثالث', actionTo: '/teacher/assignments', late: false, textAnswer: 'برهان البنية الفرعية المثلى.', fileUrl: null },
    { kind: 'research', id: 'f2', author: { firstName: 'سالم', lastName: 'قدّور', avatarInitials: 'سق', avatarColor: '#059669' }, meta: 'CS-304', when: hoursAgo(20), title: 'فهرسة قواعد البيانات الموزعة', actionTo: '/teacher/research' },
    { kind: 'attendance', id: 'f3', author: null, meta: 'CS-201', when: hoursAgo(30), title: 'محاضرة الأسبوع الخامس', actionTo: '/teacher/attendance' },
  ],
};

/* ── /teacher/risks — worst-first (riskScore ascending). */
const RISKS = [
  { studentId: 'stu_e2e_1', name: 'سالم قدّور', riskLevel: 'CRITICAL', riskScore: 22, signals: ['غياب متكرر', 'أداء متدنٍّ'], suggestion: 'تواصل مع الطالب وجدول جلسة متابعة.', offeringId: 'offr_e2e_t_algo', courseName: 'مقدمة في الخوارزميات', courseIcon: '🧮', courseColor: '#7c3aed' },
  { studentId: 'stu_e2e_2', name: 'منى الزوي', riskLevel: 'AT_RISK', riskScore: 41, signals: ['انخفاض الدرجات'], suggestion: 'راجع الواجبات الأخيرة مع الطالبة.', offeringId: 'offr_e2e_t_db', courseName: 'قواعد البيانات', courseIcon: '🗄️', courseColor: '#0e7490' },
  { studentId: 'stu_e2e_3', name: 'أحمد المصراتي', riskLevel: 'WATCH', riskScore: 58, signals: ['تأخر عن محاضرتين'], suggestion: 'راقب الحضور الأسبوع القادم.', offeringId: 'offr_e2e_t_algo', courseName: 'مقدمة في الخوارزميات', courseIcon: '🧮', courseColor: '#7c3aed' },
];

/* ── the per-offering trio: students / analytics / grades. */
const TSTUDENTS = [
  { studentId: 'stu_e2e_1', name: 'مروة البراني', universityId: 'zu-2023-1041', avatarInitials: 'مر', avatarColor: '#0ea5e9', attendancePct: 92, absences: 2, lateCount: 1, avgGrade: 84, watchPct: 12, riskScore: 88, riskLevel: 'OK', signals: [], suggestion: '' },
  { studentId: 'stu_e2e_2', name: 'سالم قدّور', universityId: 'zu-2023-1042', avatarInitials: 'سق', avatarColor: '#059669', attendancePct: 54, absences: 11, lateCount: 4, avgGrade: 41, watchPct: 66, riskScore: 22, riskLevel: 'CRITICAL', signals: ['غياب متكرر', 'أداء متدنٍّ'], suggestion: 'تواصل مع الطالب وجدول جلسة متابعة.' },
  { studentId: 'stu_e2e_3', name: 'منى الزوي', universityId: 'zu-2023-1043', avatarInitials: 'من', avatarColor: '#f59e0b', attendancePct: 78, absences: 6, lateCount: 2, avgGrade: 63, watchPct: 34, riskScore: 41, riskLevel: 'AT_RISK', signals: ['انخفاض الدرجات'], suggestion: 'راجع الواجبات الأخيرة مع الطالبة.' },
  { studentId: 'stu_e2e_4', name: 'أحمد المصراتي', universityId: 'zu-2023-1044', avatarInitials: 'أم', avatarColor: '#7c3aed', attendancePct: 88, absences: 3, lateCount: 2, avgGrade: 71, watchPct: 18, riskScore: 58, riskLevel: 'WATCH', signals: ['تأخر عن محاضرتين'], suggestion: 'راقب الحضور الأسبوع القادم.' },
];
const TANALYTICS = { enrolled: 64, totalSessions: 18, overallAttendance: 86, avgGrade: 74.2, passRate: 81, assignmentCount: 6, examCount: 2 };
const TGRADES = [
  { id: 'grd_e2e_1', offeringId: 'offr_e2e_t_algo', studentId: 'stu_e2e_1', kind: 'MIDTERM', score: '84', maxScore: 100, weight: 30, feedback: null, recordedAt: hoursAgo(24 * 10), student: { id: 'stu_e2e_1', firstName: 'مروة', lastName: 'البراني' } },
  { id: 'grd_e2e_2', offeringId: 'offr_e2e_t_algo', studentId: 'stu_e2e_2', kind: 'MIDTERM', score: '41', maxScore: 100, weight: 30, feedback: 'يحتاج متابعة', recordedAt: hoursAgo(24 * 10), student: { id: 'stu_e2e_2', firstName: 'سالم', lastName: 'قدّور' } },
];

/* ── /teacher/me/materials. */
const TMATERIALS = [
  { id: 'mat_e2e_1', name: 'محاضرة الخوارزميات الجشعة', type: 'PDF', url: 'https://cdn.madarek.dev/lectures/greedy.pdf', sizeBytes: 2411520, downloads: 118, views: 342, createdAt: hoursAgo(24 * 6), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
  { id: 'mat_e2e_2', name: 'شرائح الفهارس والمخططات', type: 'PPT', url: 'https://cdn.madarek.dev/lectures/indexing.pptx', sizeBytes: 5242880, downloads: 64, views: 190, createdAt: hoursAgo(24 * 3), course: { code: 'CS-304', name: 'قواعد البيانات' } },
];

/* ── /me/teacher-profile — TeacherFullProfile. */
const TPROFILE = {
  userId: TEACHER_USER.id, name: 'ليلى الفيتوري', firstName: 'ليلى', lastName: 'الفيتوري', email: TEACHER_USER.email,
  avatarColor: '#7c3aed', avatarInitials: 'لف', specialty: 'الخوارزميات وهياكل البيانات', rank: 'PROFESSOR',
  bio: 'أستاذة علوم الحاسوب — مهتمة بالخوارزميات التقريبية وتعليم البرمجة.', degreeLevel: 'PHD', yearsExperience: 14,
  certifications: [{ title: 'شهادة تعليم الحاسوب المتقدم', issuer: 'الاتحاد العربي للحوسبة', year: 2021 }],
  publications: [{ title: 'تقنيات التقريب لهياكل البيانات الموزعة', venue: 'المؤتمر العربي للحوسبة', year: 2023 }],
  awards: [{ title: 'جائزة أفضل محاضرة جامعية', year: 2022 }],
  profileImageUrl: null, officeLocation: 'مبنى الهندسة · مكتب ٣١٢', officeHours: 'الأحد والثلاثاء ١٠–١٢', websiteUrl: null,
  subjectKeywords: ['خوارزميات', 'هياكل بيانات'], verifiedAt: '2026-01-15T08:00:00.000Z',
  department: 'قسم علوم الحاسوب', faculty: 'كلية الهندسة',
  courses: [
    { offeringId: 'offr_e2e_t_algo', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: '🧮', themeColor: '#7c3aed', credits: 3, enrolled: 64, term: 'خريف 2026' },
    { offeringId: 'offr_e2e_t_db', code: 'CS-304', name: 'قواعد البيانات', iconEmoji: '🗄️', themeColor: '#0e7490', credits: 3, enrolled: 48, term: 'خريف 2026' },
  ],
  workload: { courseCount: 2, totalCredits: 6, totalEnrolled: 112 },
};

/* ── /research/queue — R342-09 fixture repair: the D8 fixture still
 * carried the pre-rename statuses (SCANNED/UPLOADED — neither is in
 * the PaperStatus union nor in backend RESEARCH_QUEUE_STATUSES), so
 * the measured page rendered the EMPTY queue + empty states. The
 * honest trio per the live wire contract (learning.routes.ts):
 * CHECKS_PASSED (awaiting the teacher's grade) + GRADED (awaiting
 * the teacher's publish) — the two halves of the review loop. */
const RQUEUE = [
  { id: 'pap_e2e_1', title: 'فهرسة قواعد البيانات الموزعة', abstract: 'دراسة مقارنة لاستراتيجيات الفهرسة في الأنظمة الموزعة.', fileUrl: 'https://cdn.madarek.dev/papers/indexing.pdf', status: 'CHECKS_PASSED', plagiarismPct: 4, aiContentPct: 9, grade: null, feedback: null, uploadedAt: hoursAgo(20), scannedAt: hoursAgo(18), gradedAt: null, publishedAt: null, student: { id: 'stu_e2e_2', firstName: 'سالم', lastName: 'قدّور', avatarInitials: 'سق', avatarColor: '#059669', email: 'salim@zu.edu.ly' }, reviewer: null, offering: { id: 'offr_e2e_t_db', course: { name: 'قواعد البيانات', code: 'CS-304' } } },
  { id: 'pap_e2e_2', title: 'الخوارزميات الجشعة في جدولة المهام', abstract: 'تطبيقات الخوارزميات الجشعة على جدولة المهام الزمنية.', fileUrl: null, status: 'GRADED', plagiarismPct: 2, aiContentPct: 6, grade: 17, feedback: 'معالجة جيدة للبنية الفرعية المثلى مع نقص في التحليل التجريبي.', uploadedAt: hoursAgo(96), scannedAt: hoursAgo(94), gradedAt: hoursAgo(30), publishedAt: null, student: { id: 'stu_e2e_1', firstName: 'مروة', lastName: 'البراني', avatarInitials: 'مر', avatarColor: '#0ea5e9', email: 'marwa@zu.edu.ly' }, reviewer: { firstName: 'ليلى', lastName: 'الفيتوري' }, offering: { id: 'offr_e2e_t_algo', course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } } },
];

/* ── exam authoring: templates list + question bank. */
const TEMPLATES = [
  { id: 'tpl_e2e_quiz4', title: 'اختبار الخوارزميات الرابع', kind: 'QUIZ', status: 'PUBLISHED', durationMin: 30, passingScore: 60, openAt: null, closeAt: daysAhead(3), offering: { id: 'offr_e2e_t_algo', course: { name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: '🧮' } }, faculty: { name: 'كلية الهندسة' }, author: { firstName: 'ليلى', lastName: 'الفيتوري' }, _count: { questions: 8, attempts: 42 } },
  { id: 'tpl_e2e_final', title: 'الاختبار النهائي — قواعد البيانات', kind: 'FINAL', status: 'DRAFT', durationMin: 120, passingScore: 50, openAt: null, closeAt: null, offering: { id: 'offr_e2e_t_db', course: { name: 'قواعد البيانات', code: 'CS-304', iconEmoji: '🗄️' } }, faculty: { name: 'كلية الهندسة' }, author: { firstName: 'ليلى', lastName: 'الفيتوري' }, _count: { questions: 14, attempts: 0 } },
];
const QBANK = [
  { id: 'qb_e2e_1', type: 'MCQ', prompt: 'ما التعقيد الزمني للبحث الثنائي؟', difficulty: 'EASY', points: 2, category: { title: 'الخوارزميات', slug: 'algorithms', iconEmoji: '🧮' }, choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], author: 'ليلى الفيتوري', tags: ['بحث', 'تعقيد'] },
  { id: 'qb_e2e_2', type: 'TRUE_FALSE', prompt: 'الفهرس يحسّن سرعة الاستعلام.', difficulty: 'MEDIUM', points: 1, category: { title: 'قواعد البيانات', slug: 'databases', iconEmoji: '🗄️' }, choices: null, author: 'ليلى الفيتوري', tags: ['فهارس'] },
];
const QCATEGORIES = [
  { id: 'qcat_e2e_algo', slug: 'algorithms', title: 'الخوارزميات', description: 'أسئلة الخوارزميات وهياكل البيانات', iconEmoji: '🧮', isShared: true, faculty: { name: 'كلية الهندسة' }, department: { name: 'قسم علوم الحاسوب' }, _count: { questions: 12 } },
  { id: 'qcat_e2e_db', slug: 'databases', title: 'قواعد البيانات', description: 'أسئلة قواعد البيانات', iconEmoji: '🗄️', isShared: true, faculty: { name: 'كلية الهندسة' }, department: { name: 'قسم علوم الحاسوب' }, _count: { questions: 9 } },
];

/* ── /live/sessions — LiveSessionRow[]. */
const LIVE = [
  { id: 'lv_e2e_1', offeringId: 'offr_e2e_t_algo', teacherId: TEACHER_USER.id, title: 'مراجعة الاختبار الرابع', description: 'جلسة مراجعة قبل الاختبار.', topic: 'الخوارزميات الجشعة', scheduledAt: daysAhead(0.1), startedAt: null, endedAt: null, status: 'SCHEDULED', joinUrl: 'https://meet.madarek.dev/rev-4', recordingUrl: null, offering: { id: 'offr_e2e_t_algo', course: { name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: '🧮', themeColor: '#7c3aed' } }, teacher: { firstName: 'ليلى', lastName: 'الفيتوري', avatarInitials: 'لف', avatarColor: '#7c3aed' } },
  { id: 'lv_e2e_2', offeringId: 'offr_e2e_t_db', teacherId: TEACHER_USER.id, title: 'جلسة الفهارس المباشرة', description: null, topic: 'الفهارس', scheduledAt: hoursAgo(24 * 5), startedAt: hoursAgo(24 * 5), endedAt: hoursAgo(24 * 5 - 2), status: 'ENDED', joinUrl: 'https://meet.madarek.dev/idx-1', recordingUrl: 'https://cdn.madarek.dev/live/idx-1.mp4', offering: { id: 'offr_e2e_t_db', course: { name: 'قواعد البيانات', code: 'CS-304', iconEmoji: '🗄️', themeColor: '#0e7490' } }, teacher: { firstName: 'ليلى', lastName: 'الفيتوري', avatarInitials: 'لف', avatarColor: '#7c3aed' } },
];

/* ── /labs — VirtualLab[]. */
const LABS = [
  { id: 'lab_e2e_1', name: 'مختبر الشبكات الافتراضي', platform: 'NetSim', category: 'net', iconEmoji: '🌐', totalExperiments: 14, themeColor: '#0e7490' },
  { id: 'lab_e2e_2', name: 'مختبر الفيزياء التفاعلي', platform: 'PhET', category: 'physics', iconEmoji: '⚛️', totalExperiments: 22, themeColor: '#7c3aed' },
];

/* ── /invites — InviteRow[] (the students roster's invite card). */
const INVITES = [
  { id: 'inv_e2e_1', code: 'ZU-CS201-2026', role: 'STUDENT', offeringId: 'offr_e2e_t_algo', departmentId: null, facultyId: null, expiresAt: daysAhead(14), maxUses: 40, usedCount: 12, createdAt: hoursAgo(24 * 9) },
];

/* ── /messages — the enveloped inbox. */
const MESSAGES = {
  data: [
    { id: 'msg_e2e_1', body: 'أستاذة، هل يُعاد فتح الواجب للأسبوع الثالث؟', createdAt: hoursAgo(3), fromUser: { id: 'stu_e2e_1', firstName: 'مروة', lastName: 'البراني', avatarColor: '#0ea5e9' }, toUser: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: '#7c3aed' } },
    { id: 'msg_e2e_2', body: 'شكرًا على توضيح الفهارس في المحاضرة الأخيرة.', createdAt: hoursAgo(26), fromUser: { id: 'stu_e2e_3', firstName: 'منى', lastName: 'الزوي', avatarColor: '#f59e0b' }, toUser: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: '#7c3aed' } },
  ],
  meta: { total: 2, page: 1, limit: 30, totalPages: 1, unread: 1 },
};

const overrides = [
  { method: 'GET', path: '/teacher/dashboard', json: ok(TDASH) },
  { method: 'GET', path: '/teacher/me/offerings', json: ok(OFFERINGS) },
  { method: 'GET', path: '/teacher/me/assignments', json: ok(TEACHER_ASSIGNMENTS) },
  { method: 'GET', path: '/teacher/me/pending-submissions', json: ok(PENDING_SUBMISSIONS) },
  { method: 'GET', path: '/teacher/me/materials', json: ok(TMATERIALS) },
  { method: 'GET', path: '/teacher/risks', json: ok(RISKS) },
  { method: 'GET', path: '/me/teacher-profile', json: ok(TPROFILE) },
  { method: 'GET', path: '/teacher/offerings/:id/students', json: ok(TSTUDENTS) },
  { method: 'GET', path: '/teacher/offerings/:id/analytics', json: ok(TANALYTICS) },
  { method: 'GET', path: '/offerings/:id/grades', json: ok(TGRADES) },
  { method: 'GET', path: '/research/queue', json: ok(RQUEUE) },
  { method: 'GET', path: '/research/published', json: ok([]) },
  { method: 'GET', path: '/research/:id/annotations', json: ok([]) },
  { method: 'GET', path: '/exams/templates', json: ok(TEMPLATES) },
  { method: 'GET', path: '/exams/templates/:id/attempts', json: ok([]) },
  { method: 'GET', path: '/exams/moderation-queue', json: ok(MODERATION_QUEUE) },
  { method: 'GET', path: '/question-bank', json: ok(QBANK) },
  { method: 'GET', path: '/question-bank/categories', json: ok(QCATEGORIES) },
  { method: 'GET', path: '/live/sessions', json: ok(LIVE) },
  { method: 'GET', path: '/labs', json: ok(LABS) },
  { method: 'GET', path: '/invites', json: ok(INVITES) },
  /* R342-09 fixture repair: the seeded teacher now carries the real
   * capability grants an exam-authoring teacher holds (the /me/permissions
   * wire shape: capabilities = the user's effective grants). The D8
   * default (empty capabilities) rendered /teacher/exams as its honest
   * PERMISSION WALL — a real state, but not the authoring surface this
   * harness exists to measure. EXAMS_AUTHOR opens the hub + the detail
   * author actions; CURRICULUM_EDIT_OWN opens the intelligence detail's
   * authoring tab; RESEARCH_GRADE_OWN is the research grading grant. */
  { method: 'GET', path: '/me/permissions', json: ok({ role: 'TEACHER', capabilities: ['EXAMS_AUTHOR', 'CURRICULUM_EDIT_OWN', 'RESEARCH_GRADE_OWN'], roleDefaults: [] }) },
  { method: 'GET', path: '/messages', json: MESSAGES },
  /* /teacher/exams/:id — the moderation corpus's template detail. */
  { method: 'GET', path: '/exams/templates/tpl_e2e_quiz4', json: ok(MODERATION_TEMPLATES.tpl_e2e_quiz4) },
  { method: 'GET', path: '/exams/templates/tpl_e2e_final', json: ok(MODERATION_TEMPLATES.tpl_e2e_quiz4) },
];

/* the seeded auth state: TEACHER_USER + the institution context the
 * institution-scoped queries key on (the shape auth.store hydrates). */
const seededUser = { ...TEACHER_USER, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'جامعة الزاوية', nameEn: 'Zawia University', slug: 'zu' }, membershipRole: 'TEACHER' };

/* /auth/me is AUTHORITATIVE for the institution context (useAuth.useMe
 * → applySessionExtras: "no context in the payload resets the context")
 * — the stock meProfile() carries none, so the seeded context would be
 * wiped on boot. A page-level route answers with the me profile + the
 * r178 session-extras siblings (D7a's harness precedent). */
const meJson = JSON.stringify({
  data: {
    id: TEACHER_USER.id,
    email: TEACHER_USER.email,
    firstName: TEACHER_USER.firstName,
    lastName: TEACHER_USER.lastName,
    role: TEACHER_USER.role,
    avatarColor: TEACHER_USER.avatarColor,
    avatarInitials: TEACHER_USER.avatarInitials,
    scopeFaculty: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: '2026-03-15T10:00:00.000Z',
    onboardingCompletedAt: '2026-03-01T10:00:00.000Z',
    firedMilestones: [],
    studentProfile: null,
    teacherProfile: null,
    memberships: [],
    currentInstitution: seededUser.currentInstitution,
    membershipRole: 'TEACHER',
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
        await installMockApi(context, { sessionUser: TEACHER_USER, overrides });
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
writeFileSync(join(__dirname, "pages-teacher-results.json"), JSON.stringify(out, null, 1));
console.log(`\npages-teacher conformance — ${ROUTES.join(", ")} (${DARK ? "dark" : "light"}): worst cell ${worst}% (floor ${FLOOR})`);
if (GATE && worst < FLOOR) {
  console.error(`pages-teacher gate: FAIL — a cell scored ${worst}% < ${FLOOR}%`);
  process.exit(1);
}
console.log("pages-teacher gate: PASS");
