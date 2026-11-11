#!/usr/bin/env node
/**
 * pages-student.mjs — R342-08 — the PER-PAGE conformance harness for
 * the authed STUDENT D7d surfaces (pages.mjs's exact probe axes/
 * score/floor; pages-authed.mjs's hermetic seeded-session method —
 * the D7a original — extended with the D7d fixture corpus the
 * standard table lacks). Distinct filename from pages-authed.mjs
 * (D7a), pages-teacher.mjs (D8), pages-owner.mjs (D11) and
 * pages-quality.mjs (D10) so the concurrent R342 branches merge
 * without conflict.
 *
 * D7d honest fixtures (each mirrors its wire shape — the interfaces
 * in hooks/resources/{student,catalog,research,live,social,ai,training}.ts):
 *   /mooc · /jobs · /labs · /me/lab-sessions · /ar-experiences ·
 *   /library/books · /me/loans · /me/matrix · /me/research ·
 *   /research/published · /live/sessions · /events · /ai/config ·
 *   /ai/conversations · /posts · /leaderboard · /me/achievements ·
 *   /me/skills · /training/me · /me/materials (+ the D7a extras:
 *   /me/gaps · /me/results · /courses).
 *
 * Usage:
 *   node scripts/conformance/pages-student.mjs --url http://localhost:5308 \
 *     --routes /student/mooc,/student/jobs --bps 1440,390 [--dark] [--gate]
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
const ROUTES = (arg('routes', '/student/mooc') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
const BPS = (arg('bps', '1440,390') ?? '').split(',').map((b) => Number(b.trim())).filter(Boolean);
const DARK = process.argv.includes('--dark');
const GATE = process.argv.includes('--gate');
const URL = arg('url', 'http://localhost:5173/');
const FLOOR = 90;

/* the type ladder: rung NAMES (--fs-*) harvested from the token sheets */
const rungNames = [];
{
  const strip = (s) => s.replace(/\/[\s\S]*?\*\//g, '');
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

/* D7d honest fixtures — every wire shape mirrors the hook interfaces.
 * NOW anchors the same boot instant as the D7a harness so relative
 * times («قبل ساعتين») render deterministically. */
const ok = (data) => ({ data });
const NOW = '2026-03-15T10:00:00.000Z';
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();
const daysAgo = (d) => new Date(Date.parse(NOW) - d * 86400_000).toISOString();
const inHours = (h) => new Date(Date.parse(NOW) + h * 3600_000).toISOString();

/* GET /me/gaps — Gap[] (the matrix page + the assistant's gaps rail). */
const GAPS = [
  { conceptId: 'cpt_e2e_dp', conceptName: 'البرمجة الديناميكية', courseId: 'crs_e2e_algorithms', courseName: 'مقدمة في الخوارزميات', courseColor: '#7c3aed', level: 0.2, recommendedLectureId: 'lec_e2e_greedy', recommendedLectureTitle: 'الخوارزميات الجشعة' },
  { conceptId: 'cpt_e2e_grd', conceptName: 'الخوارزميات الجشعة', courseId: 'crs_e2e_algorithms', courseName: 'مقدمة في الخوارزميات', courseColor: '#7c3aed', level: 0.55, recommendedLectureId: null, recommendedLectureTitle: null },
  { conceptId: 'cpt_e2e_idx', conceptName: 'الفهارس في قواعد البيانات', courseId: 'crs_e2e_databases', courseName: 'قواعد البيانات المتقدمة', courseColor: '#0ea5e9', level: 0.4, recommendedLectureId: 'lec_e2e_sql', recommendedLectureTitle: 'استعلامات SQL المتقدمة' },
];

/* GET /me/results — StudentResults (the results band's GradeBars). */
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

/* GET /courses?institutionSlug=zu — CatalogCourseRow[] + meta. */
const CATALOG = {
  data: [
    { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: '🧮', themeColor: '#7c3aed', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu' } },
    { id: 'crs_e2e_databases', code: 'CS-310', name: 'قواعد البيانات المتقدمة', iconEmoji: '🗄️', themeColor: '#0ea5e9', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu' } },
    { id: 'crs_e2e_stats', code: 'MA-210', name: 'الإحصاء التطبيقي', iconEmoji: '📊', themeColor: '#15803d', credits: 2, department: { id: 'dep_e2e_math', name: 'قسم الرياضيات' }, institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu' } },
    { id: 'crs_e2e_net', code: 'CS-304', name: 'شبكات الحاسوب', iconEmoji: '🌐', themeColor: '#b45309', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu' } },
    { id: 'crs_e2e_ai', code: 'CS-410', name: 'أساسيات الذكاء الاصطناعي', iconEmoji: '🤖', themeColor: '#dc2626', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu' } },
    { id: 'crs_e2e_se', code: 'CS-330', name: 'هندسة البرمجيات', iconEmoji: '🧩', themeColor: '#0891b2', credits: 3, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' }, institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu' } },
  ],
  meta: { page: 1, limit: 12, total: 6, totalPages: 1 },
};

/* GET /mooc?limit=50 — MoocCourse[] (the external-catalog grid). */
const MOOCS = [
  { id: 'mooc_e2e_1', title: 'هياكل البيانات والخوارزميات', organization: 'Coursera — جامعة ستانفورد', iconEmoji: '🧠', category: 'prog', durationHours: 36, level: 'INTERMEDIATE', rating: '4.8', enrolled: 184320, hasCertificate: true, jobReady: true, externalUrl: 'https://www.coursera.org/specializations/data-structures-algorithms' },
  { id: 'mooc_e2e_2', title: 'أساسيات علم البيانات', organization: 'edX — MIT', iconEmoji: '📊', category: 'data', durationHours: 48, level: 'BEGINNER', rating: '4.7', enrolled: 96210, hasCertificate: true, jobReady: false, externalUrl: 'https://www.edx.org/learn/data-science' },
  { id: 'mooc_e2e_3', title: 'تصميم تجربة المستخدم', organization: 'Google Career Certificates', iconEmoji: '🎨', category: 'design', durationHours: 28, level: 'BEGINNER', rating: '4.9', enrolled: 231450, hasCertificate: true, jobReady: true, externalUrl: 'https://www.coursera.org/professional-certificates/google-ux-design' },
  { id: 'mooc_e2e_4', title: 'الإنجليزية الأكاديمية للدراسة الجامعية', organization: 'British Council', iconEmoji: '🗣️', category: 'lang', durationHours: 20, level: 'INTERMEDIATE', rating: '4.6', enrolled: 54200, hasCertificate: true, jobReady: false, externalUrl: null },
  { id: 'mooc_e2e_5', title: 'إدارة المشاريع التقنية', organization: 'edX — كالتك', iconEmoji: '📋', category: 'business', durationHours: 32, level: 'ADVANCED', rating: '4.5', enrolled: 38900, hasCertificate: true, jobReady: true, externalUrl: 'https://www.edx.org/learn/project-management' },
  { id: 'mooc_e2e_6', title: 'مقدمة في قواعد البيانات العلائقية', organization: 'Coursera — جامعة واشنطن', iconEmoji: '🗄️', category: 'db', durationHours: 24, level: 'BEGINNER', rating: '4.7', enrolled: 121300, hasCertificate: false, jobReady: false, externalUrl: 'https://www.coursera.org/learn/databases' },
];

/* GET /jobs?limit=50 — JobsPayload (the jobs board + applied set). */
const JOBS = {
  data: [
    { id: 'job_e2e_1', title: 'مطوّر واجهات أمامية (تدريب تعاوني)', company: 'شركة أفق للحلول التقنية', location: 'طرابلس — عن بُعد جزئياً', type: 'INTERNSHIP', salary: '1500 د.ل / شهرياً', category: 'تقنية', iconEmoji: '💻', postedAt: hoursAgo(6) },
    { id: 'job_e2e_2', title: 'محلّل بيانات مبتدئ', company: 'بنك الاتحاد', location: 'بنغازي', type: 'FULL_TIME', salary: '2800 د.ل / شهرياً', category: 'بيانات', iconEmoji: '📊', postedAt: hoursAgo(26) },
    { id: 'job_e2e_3', title: 'مصمم واجهات (عمل حرّ)', company: 'منصة إبداع الرقمية', location: 'عن بُعد', type: 'FREELANCE', salary: 'حسب المشروع', category: 'تصميم', iconEmoji: '🎨', postedAt: daysAgo(3) },
    { id: 'job_e2e_4', title: 'مساعد مختبر حاسوب — دوام جزئي', company: 'كلية الهندسة', location: 'الزاوية — الحرم الجامعي', type: 'PART_TIME', salary: '900 د.ل / شهرياً', category: 'تعليم', iconEmoji: '🧪', postedAt: daysAgo(5) },
    { id: 'job_e2e_5', title: 'مهندس شبكات (حديث تخرّج)', company: 'شركة الليبية للاتصالات', location: 'طرابلس', type: 'FULL_TIME', salary: '3500 د.ل / شهرياً', category: 'تقنية', iconEmoji: '🌐', postedAt: daysAgo(8) },
  ],
  meta: { page: 1, limit: 50, total: 5, totalPages: 1 },
  appliedJobIds: ['job_e2e_2'],
};

/* GET /labs — VirtualLab[]. */
const LABS = [
  { id: 'lab_e2e_net', name: 'مختبر شبكات الحاسوب', platform: 'Cisco Packet Tracer', category: 'شبكات', iconEmoji: '🌐', totalExperiments: 12, themeColor: '#0e7490' },
  { id: 'lab_e2e_db', name: 'مختبر قواعد البيانات', platform: 'SQL Sandbox', category: 'قواعد بيانات', iconEmoji: '🗄️', totalExperiments: 9, themeColor: '#b45309' },
  { id: 'lab_e2e_emb', name: 'مختبر الأنظمة المدمجة', platform: 'Arduino Cloud', category: 'إلكترونيات', iconEmoji: '🔌', totalExperiments: 7, themeColor: '#7c3aed' },
  { id: 'lab_e2e_phy', name: 'مختبر الفيزياء التفاعلي', platform: 'PhET', category: 'فيزياء', iconEmoji: '⚛️', totalExperiments: 15, themeColor: '#15803d' },
];

/* GET /me/lab-sessions — MyLabStats. */
const LAB_STATS = {
  active: 1,
  completed: 6,
  total: 43,
  recent: [
    { id: 'labs_e2e_1', experimentName: 'تهيئة شبكة فرعية VLAN', progressPct: 60, score: null, startedAt: hoursAgo(5), completedAt: null, lab: { id: 'lab_e2e_net', name: 'مختبر شبكات الحاسوب' } },
    { id: 'labs_e2e_2', experimentName: 'استعلامات الانضمام المتعددة', progressPct: 100, score: 88, startedAt: daysAgo(3), completedAt: daysAgo(3), lab: { id: 'lab_e2e_db', name: 'مختبر قواعد البيانات' } },
    { id: 'labs_e2e_3', experimentName: 'قياس الجهد على المتصل التوالي', progressPct: 100, score: 95, startedAt: daysAgo(9), completedAt: daysAgo(9), lab: { id: 'lab_e2e_phy', name: 'مختبر الفيزياء التفاعلي' } },
  ],
};

/* GET /ar-experiences — ArExperience[]. */
const AR_EXPERIENCES = [
  { id: 'arx_e2e_1', title: 'تشريح المحرك الكهربائي', subject: 'آلات كهربائية', type: 'AR', iconEmoji: '⚡', themeColor: '#b45309', description: 'تفكيك المحرك طبقة بطبقة فوق الطاولة ومعاينة المجال المغناطيسي دوراناً.' },
  { id: 'arx_e2e_2', title: 'جولة في معمارة المعالج', subject: 'بنية الحاسوب', type: 'VR', iconEmoji: '🔬', themeColor: '#7c3aed', description: 'مسار غامر داخل وحدة المعالجة: من ناقل العنوان إلى وحدة الحساب والمنطق.' },
  { id: 'arx_e2e_3', title: 'محاكاة تفاعلات كيميائية', subject: 'كيمياء عامة', type: 'AR', iconEmoji: '⚗️', themeColor: '#15803d', description: 'تجارب آمنة فوق ورقة الاختبار: معاينة الروابط والتزايُن قبل وبعد.' },
  { id: 'arx_e2e_4', title: 'موقع البناء الإنشائي', subject: 'هندسة مدنية', type: 'VR', iconEmoji: '🏗️', themeColor: '#0e7490', description: 'تفتيش إطار إنشائي قيد التشييد مع تمييز العناصر الخرسانية والفولاذية.' },
];

/* GET /library/books?q&category&page&limit — { data: Book[], meta }. */
const BOOKS = {
  data: [
    { id: 'bok_e2e_1', title: 'مقدمة في الخوارزميات', author: 'توماس كورمن وآخرون', category: 'خوارزميات', iconEmoji: '📕', themeColor: '#7c3aed', rating: '4.9', totalCopies: 6, availableCopies: 2 },
    { id: 'bok_e2e_2', title: 'قواعد البيانات: المفاهيم والتصميم', author: 'رامز المعموري', category: 'قواعد بيانات', iconEmoji: '📘', themeColor: '#0ea5e9', rating: '4.6', totalCopies: 4, availableCopies: 0 },
    { id: 'bok_e2e_3', title: 'الشبكات العصبية والتعلم العميق', author: 'مايكل نيلسن', category: 'ذكاء اصطناعي', iconEmoji: '📗', themeColor: '#dc2626', rating: '4.8', totalCopies: 3, availableCopies: 1 },
    { id: 'bok_e2e_4', title: 'الإحصاء والاحتمالات لل مهندسين', author: 'أنتوني هاير', category: 'رياضيات', iconEmoji: '📙', themeColor: '#15803d', rating: '4.4', totalCopies: 5, availableCopies: 5 },
    { id: 'bok_e2e_5', title: 'هندسة البرمجيات — ممارسات الصناعة', author: 'إيان سومرفيل', category: 'هندسة برمجيات', iconEmoji: '📒', themeColor: '#0891b2', rating: '4.7', totalCopies: 4, availableCopies: 3 },
    { id: 'bok_e2e_6', title: 'أمن المعلومات: مبادئ وممارسات', author: 'وليام ستالينغز', category: 'أمن معلومات', iconEmoji: '📔', themeColor: '#b45309', rating: '4.5', totalCopies: 2, availableCopies: 1 },
    { id: 'bok_e2e_7', title: 'التفاضل والتكامل مع التطبيقات', author: 'جورج توماس', category: 'رياضيات', iconEmoji: '📕', themeColor: '#7c2d12', rating: '4.3', totalCopies: 8, availableCopies: 6 },
    { id: 'bok_e2e_8', title: 'نظم التشغيل: مبادئ وبنية', author: 'أبراهام سيلبرشتز', category: 'نظم تشغيل', iconEmoji: '📘', themeColor: '#4d7c0f', rating: '4.6', totalCopies: 3, availableCopies: 2 },
  ],
  meta: { page: 1, limit: 24, total: 8, totalPages: 1 },
};

/* GET /me/loans — MyLoan[]. */
const LOANS = [
  { id: 'loan_e2e_1', bookId: 'bok_e2e_1', status: 'ACTIVE', borrowedAt: daysAgo(6), dueAt: inHours(24 * 9), returnedAt: null, book: { id: 'bok_e2e_1', title: 'مقدمة في الخوارزميات', author: 'توماس كورمن وآخرون', category: 'خوارزميات' } },
  { id: 'loan_e2e_2', bookId: 'bok_e2e_3', status: 'OVERDUE', borrowedAt: daysAgo(21), dueAt: daysAgo(2), returnedAt: null, book: { id: 'bok_e2e_3', title: 'الشبكات العصبية والتعلم العميق', author: 'مايكل نيلسن', category: 'ذكاء اصطناعي' } },
  { id: 'loan_e2e_3', bookId: 'bok_e2e_5', status: 'RETURNED', borrowedAt: daysAgo(30), dueAt: daysAgo(16), returnedAt: daysAgo(18), book: { id: 'bok_e2e_5', title: 'هندسة البرمجيات — ممارسات الصناعة', author: 'إيان سومرفيل', category: 'هندسة برمجيات' } },
];

/* GET /me/matrix — MatrixCourse[] (concepts + levels). */
const MATRIX = [
  { courseId: 'crs_e2e_algorithms', courseCode: 'CS-201', courseName: 'مقدمة في الخوارزميات', themeColor: '#7c3aed', offeringId: OFFERING_ID, concepts: [
    { id: 'cpt_e2e_sort', name: 'خوارزميات الترتيب', level: 0.9, attempts: 14 },
    { id: 'cpt_e2e_dp', name: 'البرمجة الديناميكية', level: 0.2, attempts: 6 },
    { id: 'cpt_e2e_grd', name: 'الخوارزميات الجشعة', level: 0.55, attempts: 9 },
    { id: 'cpt_e2e_grf', name: 'الطَوفان على المخططات', level: 0.75, attempts: 11 },
  ] },
  { courseId: 'crs_e2e_databases', courseCode: 'CS-310', courseName: 'قواعد البيانات المتقدمة', themeColor: '#0ea5e9', offeringId: 'offr_e2e_databases', concepts: [
    { id: 'cpt_e2e_nrm', name: 'التطبيع حتى الشكل الثالث', level: 0.8, attempts: 8 },
    { id: 'cpt_e2e_idx', name: 'الفهارس في قواعد البيانات', level: 0.4, attempts: 5 },
    { id: 'cpt_e2e_txn', name: 'المعاملات والتزامن', level: 0.6, attempts: 7 },
  ] },
];

/* GET /me/research — ResearchPaper[] (the student's own papers). */
const MY_RESEARCH = [
  { id: 'pap_e2e_1', title: 'تحسين استعلامات الانضمام في قواعد البيانات العلائقية', abstract: 'دراسة تجريبية لأثر الفهارس المركّبة على زمن تنفيذ استعلامات الانضمام المتعددة على مجموعات بيانات متوسطة الحجم.', fileUrl: '/media/lecture.mp4', status: 'GRADED', plagiarismPct: 3, aiContentPct: 8, grade: 92, feedback: 'منهجية سليمة وتحليل واضح للنتائج؛ يُقترح توسيع عيّنة الاختبار في النسخة القادمة.', uploadedAt: daysAgo(12), scannedAt: daysAgo(12), gradedAt: daysAgo(9), publishedAt: null, student: { id: STUDENT_USER.id, firstName: STUDENT_USER.firstName, lastName: STUDENT_USER.lastName, avatarInitials: STUDENT_USER.avatarInitials, avatarColor: STUDENT_USER.avatarColor, email: STUDENT_USER.email }, reviewer: { id: 'usr_e2e_teacher', firstName: 'أحمد', lastName: 'المهدي' }, offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } } },
  { id: 'pap_e2e_2', title: 'مقارنة بروتوكولات التوجيه في شبكات الاستشعار اللاسلكية', abstract: 'تقييم أداء بروتوكولات التوجيه من حيث استهلاك الطاقة وزمن الوصول في طوبولوجيا شبكية.', fileUrl: null, status: 'CHECKS_PASSED', plagiarismPct: 1, aiContentPct: 4, grade: null, feedback: null, uploadedAt: daysAgo(4), scannedAt: daysAgo(4), gradedAt: null, publishedAt: null, student: { id: STUDENT_USER.id, firstName: STUDENT_USER.firstName, lastName: STUDENT_USER.lastName, avatarInitials: STUDENT_USER.avatarInitials, avatarColor: STUDENT_USER.avatarColor, email: STUDENT_USER.email }, reviewer: null, offering: { id: 'offr_e2e_databases', course: { name: 'قواعد البيانات المتقدمة', code: 'CS-310' } } },
  { id: 'pap_e2e_3', title: 'أنماط استخدام الطلبة لمنصات التعلم الإلكتروني', abstract: 'مسح ميداني لعادات الدراسة الرقمية لدى عيّنة من طلبة كلية الهندسة.', fileUrl: null, status: 'UPLOADED', plagiarismPct: null, aiContentPct: null, grade: null, feedback: null, uploadedAt: hoursAgo(3), scannedAt: null, gradedAt: null, publishedAt: null, student: { id: STUDENT_USER.id, firstName: STUDENT_USER.firstName, lastName: STUDENT_USER.lastName, avatarInitials: STUDENT_USER.avatarInitials, avatarColor: STUDENT_USER.avatarColor, email: STUDENT_USER.email }, reviewer: null, offering: null },
];

/* GET /research/published — published papers (the library's shelf). */
const PUBLISHED_RESEARCH = [
  { ...MY_RESEARCH[0], id: 'pap_e2e_pub1', status: 'PUBLISHED', publishedAt: daysAgo(7), title: 'تحسين استعلامات الانضمام في قواعد البيانات العلائقية', student: { id: 'usr_e2e_s2', firstName: 'سالم', lastName: 'القاسم', avatarInitials: 'سق', avatarColor: '#0e7490', email: 's2@e2e.madarek.io' } },
  { ...MY_RESEARCH[1], id: 'pap_e2e_pub2', status: 'PUBLISHED', publishedAt: daysAgo(15), title: 'نمذجة الحمل الحراري للحواسيب المحمولة', student: { id: 'usr_e2e_s3', firstName: 'ريم', lastName: 'الفيتوري', avatarInitials: 'رف', avatarColor: '#7c3aed', email: 's3@e2e.madarek.io' } },
];

/* GET /live/sessions — LiveSessionRow[]. */
const LIVE_SESSIONS = [
  { id: 'liv_e2e_1', offeringId: OFFERING_ID, teacherId: 'usr_e2e_teacher', title: 'مراجعة البرمجة الديناميكية قبل الاختبار', description: 'جلسة أسئلة وأجوبة على نماذج الاختبار السابقة مع حلّ مسألتين تفاعلياً.', topic: 'البرمجة الديناميكية', scheduledAt: inHours(1), startedAt: null, endedAt: null, status: 'SCHEDULED', joinUrl: 'https://meet.example.com/dp-review', recordingUrl: null, offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: '🧮', themeColor: '#7c3aed' } }, teacher: { firstName: 'أحمد', lastName: 'المهدي', avatarInitials: 'أم', avatarColor: '#0e7490' } },
  { id: 'liv_e2e_2', offeringId: 'offr_e2e_databases', teacherId: 'usr_e2e_teacher2', title: 'معمل SQL المباشر — الفهارس وخطط التنفيذ', description: null, topic: 'الفهارس', scheduledAt: hoursAgo(1), startedAt: hoursAgo(1), endedAt: null, status: 'LIVE', joinUrl: 'https://meet.example.com/sql-lab', recordingUrl: null, offering: { id: 'offr_e2e_databases', course: { name: 'قواعد البيانات المتقدمة', code: 'CS-310', iconEmoji: '🗄️', themeColor: '#0ea5e9' } }, teacher: { firstName: 'سعاد', lastName: 'بن عمران', avatarInitials: 'سع', avatarColor: '#15803d' } },
  { id: 'liv_e2e_3', offeringId: OFFERING_ID, teacherId: 'usr_e2e_teacher', title: 'محاضرة الترتيب الخطي — تسجيل متاح', description: 'شُرحت فيه خوارزميات الترتيب الثلاث بمقارنات زمنية حية.', topic: 'خوارزميات الترتيب', scheduledAt: daysAgo(6), startedAt: daysAgo(6), endedAt: daysAgo(6), status: 'ENDED', joinUrl: null, recordingUrl: 'https:// recordings.example.com/linear-sort', offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: '🧮', themeColor: '#7c3aed' } }, teacher: { firstName: 'أحمد', lastName: 'المهدي', avatarInitials: 'أم', avatarColor: '#0e7490' } },
];

/* GET /events — CampusEventRow[]. */
const CAMPUS_EVENTS = [
  { id: 'evt_e2e_1', title: 'ندوة: الذكاء الاصطناعي في التعليم الجامعي', description: 'محاضرة مفتوحة مع نقاش حول توظيف النماذج اللغوية في التعليم، يقدّمها أستاذ زائر من كلية الحاسوب.', location: 'قاعة المؤتمرات الكبرى', startsAt: inHours(26), endsAt: inHours(29), capacity: 220, iconEmoji: '🤖', themeColor: '#7c3aed', organizer: { firstName: 'أحمد', lastName: 'المهدي', role: 'TEACHER' }, _count: { rsvps: 148 }, myRsvp: null },
  { id: 'evt_e2e_2', title: 'ورشة: كتابة السيرة الذاتية للمهندسين', description: 'ورشة تطبيقية لمدة ساعتين: صياغة سيرة تقنية موجّهة لفرص التدريب التعاوني.', location: 'مبنى الهندسة — القاعة 204', startsAt: inHours(52), endsAt: inHours(55), capacity: 60, iconEmoji: '📝', themeColor: '#b45309', organizer: { firstName: 'سعاد', lastName: 'بن عمران', role: 'TEACHER' }, _count: { rsvps: 41 }, myRsvp: 'GOING' },
  { id: 'evt_e2e_3', title: 'معرض مشاريع التخرج — الفصل الثاني', description: 'عرض ملصقات مشاريع التخرج مع لجان تقييم ميدانية وتصويت زائرين.', location: 'بهو كلية الهندسة', startsAt: daysAgo(2), endsAt: daysAgo(2), capacity: 300, iconEmoji: '🏗️', themeColor: '#0e7490', organizer: { firstName: 'خالد', lastName: 'الورفلي', role: 'OWNER' }, _count: { rsvps: 267 }, myRsvp: null },
];

/* GET /ai/config + /ai/conversations. */
const AI_CONFIG = { provider: 'openrouter', model: 'glm-4.7x' };
const AI_CONVERSATIONS = [
  { id: 'cnv_e2e_1', title: 'شرح البرمجة الديناميكية', createdAt: hoursAgo(20) },
  { id: 'cnv_e2e_2', title: 'مراجعة الفهارس في SQL', createdAt: daysAgo(2) },
  { id: 'cnv_e2e_3', title: 'خطة مذاكرة الأسبوع', createdAt: daysAgo(5) },
];

/* GET /posts?limit=20 — Post[]. */
const POSTS = [
  { id: 'pst_e2e_1', body: 'أنهيت اليوم مسألة التتابع الأطول المشترك بالبرمجة الديناميكية — أخيراً فهمت شجرة الحالات! #الخوارزميات', hashtags: ['الخوارزميات'], imageUrl: null, createdAt: hoursAgo(2), author: { id: 'usr_e2e_s2', firstName: 'سالم', lastName: 'القاسم', avatarColor: '#0e7490', avatarInitials: 'سق' }, _count: { comments: 4, reactions: 12 }, viewerReacted: false },
  { id: 'pst_e2e_2', body: 'مجموعة مذاكرة لمقرر قواعد البيانات في المكتبة الرقمية غداً العاشرة — من يشارك؟ #قواعد_البيانات #مجموعة_مذاكرة', hashtags: ['قواعد_البيانات', 'مجموعة_مذاكرة'], imageUrl: null, createdAt: hoursAgo(7), author: { id: 'usr_e2e_s3', firstName: 'ريم', lastName: 'الفيتوري', avatarColor: '#7c3aed', avatarInitials: 'رف' }, _count: { comments: 9, reactions: 21 }, viewerReacted: true },
  { id: 'pst_e2e_3', body: 'نصيحة لزملائي في التدريب التعاوني: ابدؤوا ببناء معرض أعمال مبكراً — سُئلت عنه في كل مقابلة تقريباً. #التدريب_التعاوني', hashtags: ['التدريب_التعاوني'], imageUrl: null, createdAt: daysAgo(1), author: { id: 'usr_e2e_s4', firstName: 'منى', lastName: 'الزروق', avatarColor: '#b45309', avatarInitials: 'مز' }, _count: { comments: 6, reactions: 33 }, viewerReacted: false },
  { id: 'pst_e2e_4', body: 'فتحنا غرفة نقاش لمتابعة أخبار الندوة التقنية القادمة — القاعة تبدو تمتلئ بسرعة. #الندوات', hashtags: ['الندوات'], imageUrl: null, createdAt: daysAgo(2), author: { id: 'usr_e2e_s2', firstName: 'سالم', lastName: 'القاسم', avatarColor: '#0e7490', avatarInitials: 'سق' }, _count: { comments: 2, reactions: 8 }, viewerReacted: false },
];

/* GET /leaderboard — LeaderEntry[]. */
const LEADERBOARD = [
  { id: 'usr_e2e_s2', firstName: 'سالم', lastName: 'القاسم', avatarInitials: 'سق', avatarColor: '#0e7490', totalXp: 4820, level: 9 },
  { id: STUDENT_USER.id, firstName: STUDENT_USER.firstName, lastName: STUDENT_USER.lastName, avatarInitials: STUDENT_USER.avatarInitials, avatarColor: STUDENT_USER.avatarColor, totalXp: 4310, level: 8 },
  { id: 'usr_e2e_s3', firstName: 'ريم', lastName: 'الفيتوري', avatarInitials: 'رف', avatarColor: '#7c3aed', totalXp: 3980, level: 8 },
  { id: 'usr_e2e_s4', firstName: 'منى', lastName: 'الزروق', avatarInitials: 'مز', avatarColor: '#b45309', totalXp: 3410, level: 7 },
  { id: 'usr_e2e_s5', firstName: 'يوسف', lastName: 'التاجوري', avatarInitials: 'يت', avatarColor: '#15803d', totalXp: 2950, level: 6 },
];

/* GET /me/achievements — UserAchievement[]. */
const ACHIEVEMENTS = [
  { unlockedAt: hoursAgo(30), achievement: { id: 'ach_e2e_streak', name: 'سلسلة السبعة أيام', description: 'دخلت المنصة وسجّلت تقدماً سبعة أيام متتالية', icon: 'flame', xp: 150 } },
  { unlockedAt: daysAgo(4), achievement: { id: 'ach_e2e_firstquiz', name: 'أول اختبار مكتمل', description: 'أكملت اختباراً إلكترونياً بنجاح لأول مرة', icon: 'target', xp: 100 } },
  { unlockedAt: daysAgo(11), achievement: { id: 'ach_e2e_paper', name: 'باحث مبتدئ', description: 'رفعت ورقتك البحثية الأولى للفحص', icon: 'book', xp: 200 } },
  { unlockedAt: daysAgo(20), achievement: { id: 'ach_e2e_labs', name: 'يدي المختبر', description: 'أكملت خمس تجارب افتراضية بتقييم جيد', icon: 'microscope', xp: 120 } },
];

/* GET /me/skills — UserSkill[]. */
const SKILLS = [
  { level: 4, progressPct: 72, skill: { id: 'skl_e2e_py', name: 'بايثون', category: 'برمجة', icon: 'terminal' } },
  { level: 3, progressPct: 45, skill: { id: 'skl_e2e_sql', name: 'SQL', category: 'قواعد بيانات', icon: 'database' } },
  { level: 2, progressPct: 30, skill: { id: 'skl_e2e_git', name: 'Git وتحكم الإصدارات', category: 'أدوات', icon: 'git-branch' } },
  { level: 2, progressPct: 60, skill: { id: 'skl_e2e_ds', name: 'تحليل البيانات', category: 'بيانات', icon: 'bar-chart' } },
  { level: 1, progressPct: 15, skill: { id: 'skl_e2e_ux', name: 'تصميم الواجهات', category: 'تصميم', icon: 'pen-tool' } },
];

/* GET /training/me — TrainingMeSummary. */
const TRAINING_ME = {
  points: 4310,
  level: { level: 8, tier: 'GOLD', toNext: 690, pctIntoLevel: 55 },
  badgeCount: 7,
  certificateCount: 2,
  tracksEnrolled: 3,
  tracksCompleted: 1,
  recentBadges: [
    { slug: 'night-owl', title: 'بومة الليل', iconEmoji: '🦉', rarity: 'RARE', earnedAt: daysAgo(2) },
    { slug: 'first-track', title: 'أول مسار مكتمل', iconEmoji: '🏁', rarity: 'COMMON', earnedAt: daysAgo(8) },
  ],
};

/* GET /me/materials — StudentMaterial[]. */
const MATERIALS = [
  { id: 'mat_e2e_1', name: 'شرائح الوحدة الخامسة — البرمجة الديناميكية.pdf', type: 'PDF', url: '/media/lecture.mp4', sizeBytes: 2_411_520, createdAt: daysAgo(3), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
  { id: 'mat_e2e_2', name: 'ورقة تمارين الفهارس.docx', type: 'DOC', url: '/media/lecture.mp4', sizeBytes: 348_160, createdAt: daysAgo(4), course: { code: 'CS-310', name: 'قواعد البيانات المتقدمة' } },
  { id: 'mat_e2e_3', name: 'تسجيل محاضرة الترتيب الخطي.mp4', type: 'VIDEO', url: '/media/lecture.mp4', sizeBytes: 184_320_000, createdAt: daysAgo(6), course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
  { id: 'mat_e2e_4', name: 'قاموس مصطلحات الإحصاء.pdf', type: 'PDF', url: '/media/lecture.mp4', sizeBytes: 1_048_576, createdAt: daysAgo(9), course: { code: 'MA-210', name: 'الإحصاء التطبيقي' } },
  { id: 'mat_e2e_5', name: 'بيانات معمل شبكات VLAN.zip', type: 'ZIP', url: '/media/lecture.mp4', sizeBytes: 15_728_640, createdAt: daysAgo(11), course: { code: 'CS-304', name: 'شبكات الحاسوب' } },
];

const overrides = [
  { method: 'GET', path: '/me/gaps', json: ok(GAPS) },
  { method: 'GET', path: '/me/results', json: ok(RESULTS) },
  { method: 'GET', path: '/courses', json: CATALOG },
  { method: 'GET', path: '/mooc', json: ok(MOOCS) },
  { method: 'GET', path: '/jobs', json: JOBS },
  { method: 'GET', path: '/labs', json: ok(LABS) },
  { method: 'GET', path: '/me/lab-sessions', json: ok(LAB_STATS) },
  { method: 'GET', path: '/ar-experiences', json: ok(AR_EXPERIENCES) },
  { method: 'GET', path: '/library/books', json: BOOKS },
  { method: 'GET', path: '/me/loans', json: ok(LOANS) },
  { method: 'GET', path: '/me/matrix', json: ok(MATRIX) },
  { method: 'GET', path: '/me/research', json: ok(MY_RESEARCH) },
  { method: 'GET', path: '/research/published', json: ok(PUBLISHED_RESEARCH) },
  { method: 'GET', path: '/research/queue', json: ok([]) },
  { method: 'GET', path: '/live/sessions', json: ok(LIVE_SESSIONS) },
  { method: 'GET', path: '/events', json: ok(CAMPUS_EVENTS) },
  { method: 'GET', path: '/ai/config', json: ok(AI_CONFIG) },
  { method: 'GET', path: '/ai/conversations', json: ok(AI_CONVERSATIONS) },
  { method: 'GET', path: '/posts', json: ok(POSTS) },
  { method: 'GET', path: '/leaderboard', json: ok(LEADERBOARD) },
  { method: 'GET', path: '/me/achievements', json: ok(ACHIEVEMENTS) },
  { method: 'GET', path: '/me/skills', json: ok(SKILLS) },
  { method: 'GET', path: '/training/me', json: ok(TRAINING_ME) },
  { method: 'GET', path: '/me/materials', json: ok(MATERIALS) },
];

/* the seeded auth state: STUDENT_USER + the institution context the
 * institution-scoped queries key on (the shape auth.store hydrates). */
const seededUser = { ...STUDENT_USER, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', nameEn: 'Madarek Model Institution', slug: 'zu' }, membershipRole: 'STUDENT' };

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
writeFileSync(join(__dirname, "pages-student-results.json"), JSON.stringify(out, null, 1));
console.log(`\npages-student conformance — ${ROUTES.join(", ")} (${DARK ? "dark" : "light"}): worst cell ${worst}% (floor ${FLOOR})`);
if (GATE && worst < FLOOR) {
  console.error(`pages-student gate: FAIL — a cell scored ${worst}% < ${FLOOR}%`);
  process.exit(1);
}
console.log("pages-student gate: PASS");
