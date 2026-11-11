#!/usr/bin/env node
/**
 * pages-owner.mjs — R341 D11 — the PER-PAGE conformance harness for
 * the authed OWNER routes (pages-authed.mjs's exact probe axes/score/
 * floor, D7a's hermetic seeded-session method re-keyed to OWNER_USER):
 * the REAL e2e fixture transport (mock-transport.ts + api-fixtures.ts,
 * esbuild-bundled the r319 way) with the `mdrk-auth` persist key
 * seeded OWNER before first paint, so the app boots signed-in
 * reload-style. Distinct filename from pages-authed/pages-quality so
 * the concurrent branches merge without conflict.
 *
 * D11 extras (honest fixtures for the owner surfaces the standard
 * table lacks — each mirrors its wire shape, the interfaces in
 * hooks/useOwner.ts + hooks/useInstitutions.ts + hooks/resources/
 * {admin,feedback}.ts): the whole /owner/* read surface (stats, users,
 * activity, realtime, ai-metrics, alerts, login-analytics, education,
 * system, settings, feature-flags, governance, institutions) + the
 * institution-detail admin riders (/admin/faculties, /admin/courses
 * with institutionSlug) + the feedback inbox (/feedback,
 * /client-errors).
 *
 * Usage:
 *   node scripts/conformance/pages-owner.mjs --url http://localhost:5343 \
 *     --routes /owner/dashboard,/owner/users --bps 1440,390 [--dark] [--gate]
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
  const dir = path.join(os.tmpdir(), `r341-pages-owner-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true, force: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: {
        contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { OWNER_USER } from ${JSON.stringify(sources[1])};`,
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
const ROUTES = (arg('routes', '/owner/dashboard') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
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

/* ── the runner (hermetic seeded OWNER session) ───────────────── */
const { installMockApi, seedSession, OWNER_USER } = await ensureTransport();

/* D11 extras: honest fixtures for the owner read surface the standard
 * table lacks (each mirrors its wire shape — the interfaces in
 * hooks/useOwner.ts + useInstitutions.ts + resources/{admin,feedback}.ts). */
const ok = (data) => ({ data });
const NOW = '2026-03-15T10:00:00.000Z';
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();

/* GET /owner/stats — OwnerStats. */
const STATS = {
  totalUsers: 312, students: 240, teachers: 38, admins: 24, quality: 8, owners: 2,
  totalCourses: 41, totalOfferings: 63, totalEnrollments: 1284, recentAuditLogs: 96,
};

/* GET /owner/users — PaginatedResponse<OwnerUser> (memberships ride the
 * rows — the directory's institution column reads them, r183-B5). */
const USERS = {
  data: [
    { id: 'usr_e2e_owner', email: 'owner@test.ly', firstName: 'المدير', lastName: 'الأعلى', role: 'OWNER', avatarColor: '#dc2626', avatarInitials: 'مأ', isActive: true, createdAt: hoursAgo(24 * 700), memberships: [{ institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu', status: 'ACTIVE' } }] },
    { id: 'usr_e2e_admin', email: 'admin@test.ly', firstName: 'المسجل', lastName: 'العام', role: 'ADMIN', avatarColor: '#0891b2', avatarInitials: 'مع', isActive: true, createdAt: hoursAgo(24 * 300), memberships: [{ institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu', status: 'ACTIVE' } }] },
    { id: 'usr_e2e_teacher', email: 'teacher@test.ly', firstName: 'أستاذ', lastName: 'الرياضيات', role: 'TEACHER', avatarColor: '#7c3aed', avatarInitials: 'أر', isActive: true, createdAt: hoursAgo(24 * 90), memberships: [{ institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu', status: 'ACTIVE' } }] },
    { id: 'usr_e2e_student', email: 'student@test.ly', firstName: 'طالب', lastName: 'السنة الثالثة', role: 'STUDENT', avatarColor: '#15803d', avatarInitials: 'طس', isActive: true, createdAt: hoursAgo(24 * 60), memberships: [{ institution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', slug: 'zu', status: 'ACTIVE' } }] },
    { id: 'usr_e2e_quality', email: 'quality@test.ly', firstName: 'أخصائي', lastName: 'الجودة', role: 'QUALITY', avatarColor: '#b45309', avatarInitials: 'أج', isActive: false, createdAt: hoursAgo(24 * 40), memberships: [] },
  ],
  meta: { page: 1, limit: 20, total: 5, totalPages: 1 },
};

/* GET /owner/activity — PaginatedResponse<AuditLogEntry>. */
const ACTIVITY = {
  data: [
    { id: 'aud_e2e_1', action: 'COURSE_CREATED', resourceType: 'Course', resourceId: 'crs_e2e_stats', userId: 'usr_e2e_admin', metadata: null, createdAt: hoursAgo(2), user: { firstName: 'المسجل', lastName: 'العام', email: 'admin@test.ly' } },
    { id: 'aud_e2e_2', action: 'ROLE_CHANGE', resourceType: 'User', resourceId: 'usr_e2e_teacher', userId: 'usr_e2e_owner', metadata: null, createdAt: hoursAgo(6), user: { firstName: 'المدير', lastName: 'الأعلى', email: 'owner@test.ly' } },
    { id: 'aud_e2e_3', action: 'user.login', resourceType: 'User', resourceId: null, userId: 'usr_e2e_student', metadata: null, createdAt: hoursAgo(26), user: { firstName: 'طالب', lastName: 'السنة الثالثة', email: 'student@test.ly' } },
    { id: 'aud_e2e_4', action: 'SETTING_UPDATED', resourceType: 'PlatformSetting', resourceId: 'set_maintenance', userId: 'usr_e2e_owner', metadata: null, createdAt: hoursAgo(50), user: { firstName: 'المدير', lastName: 'الأعلى', email: 'owner@test.ly' } },
    { id: 'aud_e2e_5', action: 'ALERT_RESOLVED', resourceType: 'OperationalAlert', resourceId: 'alr_e2e_1', userId: 'usr_e2e_owner', metadata: null, createdAt: hoursAgo(78), user: { firstName: 'المدير', lastName: 'الأعلى', email: 'owner@test.ly' } },
  ],
  meta: { page: 1, limit: 20, total: 5, totalPages: 1 },
};

/* GET /owner/realtime — RealtimeMetrics. */
const REALTIME = { activeSessions: 47, aiRequestsPerMin: 12, liveBroadcasts: 2, activeExams: 3 };

/* GET /owner/ai-metrics — AiMetrics. */
const AI_METRICS = {
  totalRequests: 1840, totalTokens: 2_450_000, successRate: 0.96, avgLatencyMs: 820,
  byFeature: [
    { feature: 'مساعد المقرّرات', count: 720, tokens: 980_000 },
    { feature: 'تلخيص المحاضرات', count: 540, tokens: 760_000 },
    { feature: 'توليد الأسئلة', count: 380, tokens: 510_000 },
    { feature: 'تحليل الفجوات', count: 200, tokens: 200_000 },
  ],
  trend: Array.from({ length: 14 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, count: 80 + Math.round(60 * Math.sin(i / 2)) })),
};

/* GET /owner/alerts — OperationalAlert[] (one critical + one warning
 * open, one resolved — every board state renders). */
const ALERTS = [
  { id: 'alr_e2e_1', severity: 'critical', category: 'قاعدة البيانات', title: 'بطء في الاستجابة', message: 'زمن استجابة قاعدة البيانات تجاوز 800ms خلال آخر ساعة.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: hoursAgo(3) },
  { id: 'alr_e2e_2', severity: 'warning', category: 'التخزين', title: 'اقتراب حدّ المساحة', message: 'استُهلك 82% من مساحة التخزين المخصّصة.', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: hoursAgo(30) },
  { id: 'alr_e2e_3', severity: 'info', category: 'المزامنة', title: 'اكتملت مزامنة دورية', message: 'اكتملت مزامنة بيانات الجامعة دون أخطاء.', metadata: null, resolvedAt: hoursAgo(74), resolvedBy: 'usr_e2e_owner', createdAt: hoursAgo(76) },
];

/* GET /owner/login-analytics — LoginAnalytics. */
const LOGIN_ANALYTICS = {
  total: 640, successCount: 590, failureCount: 50,
  daily: Array.from({ length: 7 }, (_, i) => ({ date: `2026-03-${String(9 + i).padStart(2, '0')}`, success: 70 + i * 3, failure: 9 - i })),
  topReasons: [
    { reason: 'كلمة مرور خاطئة', count: 31 },
    { reason: 'حساب موقوف', count: 12 },
    { reason: 'محاولات كثيرة', count: 7 },
  ],
};

/* GET /owner/education — OwnerEducation. */
const EDUCATION = {
  totals: { totalCourses: 41, totalOfferings: 63, teachers: 38, avgEnrolment: 20.4 },
  byFaculty: [
    { name: 'كلية الهندسة', courseCount: 18 },
    { name: 'كلية العلوم', courseCount: 14 },
    { name: 'كلية الآداب', courseCount: 9 },
  ],
  topCourses: [
    { code: 'CS-201', name: 'مقدمة في الخوارزميات', facultyName: 'كلية الهندسة', enrolled: 96 },
    { code: 'CS-310', name: 'قواعد البيانات المتقدمة', facultyName: 'كلية الهندسة', enrolled: 74 },
    { code: 'MA-210', name: 'الإحصاء التطبيقي', facultyName: 'كلية العلوم', enrolled: 61 },
  ],
  workloadBuckets: { idle: 3, one: 8, two: 12, three: 9, fourPlus: 6 },
  attendanceTrend: [
    { month: '2025-10', attendancePct: 87.2, samples: 1240 },
    { month: '2025-11', attendancePct: 84.6, samples: 1310 },
    { month: '2025-12', attendancePct: 81.9, samples: 1180 },
    { month: '2026-01', attendancePct: 88.4, samples: 1420 },
    { month: '2026-02', attendancePct: 90.1, samples: 1490 },
  ],
};

/* GET /owner/system — OwnerSystem (storage block present — the honest
 * s3 probe answer renders; r164-i). */
const SYSTEM = {
  sync: {
    lastRunAt: hoursAgo(26),
    recent: [
      { id: 'sync_e2e_1', action: 'مزامنة كاملة', at: hoursAgo(26), actor: 'النظام', metadata: null },
      { id: 'sync_e2e_2', action: 'مزامنة تدريجية', at: hoursAgo(74), actor: 'النظام', metadata: null },
    ],
  },
  alerts: {
    open: ALERTS.filter((a) => !a.resolvedAt).map(({ resolvedAt: _r, resolvedBy: _b, ...rest }) => rest),
    openCount: 2,
    criticalCount: 1,
  },
  activity: { recentEventsLast7Days: 96 },
  storage: { driver: 's3', persistent: true, reachable: true, checkedAt: hoursAgo(1) },
};

/* GET /owner/settings — PlatformSetting[]. */
const SETTINGS = [
  { id: 'set_1', key: 'platform.name', value: 'مدارك', category: 'عام', updatedAt: hoursAgo(24 * 90), updatedBy: 'usr_e2e_owner' },
  { id: 'set_2', key: 'maintenance.mode', value: 'false', category: 'تشغيل', updatedAt: hoursAgo(24 * 10), updatedBy: 'usr_e2e_owner' },
  { id: 'set_3', key: 'ai.dailyLimit', value: '200', category: 'ذكاء اصطناعي', updatedAt: hoursAgo(24 * 3), updatedBy: 'usr_e2e_admin' },
];

/* GET /owner/feature-flags — FeatureFlag[]. */
const FLAGS = [
  { id: 'ff_1', slug: 'ai-assistant', name: 'المساعد الذكي', description: 'مساعد المحتوى التوليدي في المقرّرات.', enabled: true, category: 'ذكاء اصطناعي', updatedAt: hoursAgo(24 * 20), updatedBy: 'usr_e2e_owner' },
  { id: 'ff_2', slug: 'live-broadcasts', name: 'البث المباشر', description: 'قاعات البث المباشر للمحاضرات.', enabled: true, category: 'تعليم', updatedAt: hoursAgo(24 * 45), updatedBy: 'usr_e2e_owner' },
  { id: 'ff_3', slug: 'gamification', name: 'لوحة الإنجازات', description: 'نقاط وشارات التحدي الأسبوعي.', enabled: false, category: 'تجربة', updatedAt: hoursAgo(24 * 8), updatedBy: 'usr_e2e_admin' },
];

/* GET /owner/governance — GovernanceMetrics. */
const GOVERNANCE = {
  permissionChanges: 14, roleChanges: 9, newUsersThisMonth: 27,
  weeklyGrowth: Array.from({ length: 8 }, (_, i) => ({ week: `أسبوع ${i + 1}`, count: 40 + i * 7 })),
};

/* GET /owner/institutions — OwnerInstitution[] (lib/api.ts rows). The
 * REAL wire shape (institution.routes.ts GET /owner/institutions):
 * { id, name, nameEn, slug, status, createdAt, updatedAt,
 *   activeMembershipCount, facultyCount, admins } — NO city and NO
 * student/teacher/course counts (the D11 fixture carried fields the
 * route never sends and MISSED the required activeMembershipCount,
 * so the detail page's countAr(institution.activeMembershipCount)
 * rendered a literal «undefined عضواً نشطاً» in the hermetic capture).
 * facultyCount mirrors the FACULTIES fixture (zu=2); active membership
 * counts stay plausible-but-honest (zu=3 active, ms=1, tb=0 — a
 * suspended institution's memberships are deactivated). */
const INSTITUTIONS = [
  {
    id: 'inst_e2e_zu', slug: 'zu', name: 'مؤسسة مدارك النموذجية', nameEn: 'Madarek Model Institution', status: 'ACTIVE',
    createdAt: '2024-09-01T08:00:00.000Z', updatedAt: '2026-03-01T09:00:00.000Z',
    activeMembershipCount: 3, facultyCount: 2,
    admins: [
      { id: 'mem_1', membershipId: 'mem_1', userId: 'usr_e2e_admin', name: 'المسجل العام', email: 'admin@test.ly', isActive: true, revokedAt: null },
    ],
  },
  {
    id: 'inst_e2e_ms', slug: 'ms', name: 'مؤسسة العرض الأولى', nameEn: 'Misrata University', status: 'ACTIVE',
    createdAt: '2024-10-12T10:00:00.000Z', updatedAt: '2026-02-20T12:00:00.000Z',
    activeMembershipCount: 1, facultyCount: 0,
    admins: [],
  },
  {
    id: 'inst_e2e_tb', slug: 'tb', name: 'مؤسسة العرض الثانية', nameEn: 'Tobruk University', status: 'SUSPENDED',
    createdAt: '2024-11-03T09:00:00.000Z', updatedAt: '2026-01-15T11:00:00.000Z',
    activeMembershipCount: 0, facultyCount: 0,
    admins: [],
  },
];

/* GET /admin/faculties?institutionSlug=zu — AdminFaculty[] (the detail
 * page's academic-setup tree). */
const FACULTIES = [
  {
    id: 'fac_e2e_eng', name: 'كلية الهندسة', iconEmoji: null, city: 'الزاوية',
    departmentCount: 2, studentCount: 140, teacherCount: 20, courseCount: 18,
    departments: [
      { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', students: 90, teachers: 12, courses: 11 },
      { id: 'dep_e2e_civil', name: 'قسم الهندسة المدنية', students: 50, teachers: 8, courses: 7 },
    ],
  },
  {
    id: 'fac_e2e_sci', name: 'كلية العلوم', iconEmoji: null, city: 'الزاوية',
    departmentCount: 1, studentCount: 70, teacherCount: 12, courseCount: 14,
    departments: [
      { id: 'dep_e2e_math', name: 'قسم الرياضيات', students: 70, teachers: 12, courses: 14 },
    ],
  },
];

/* GET /admin/courses?institutionSlug=zu — { data: AdminCourse[], meta }. */
const ADMIN_COURSES = {
  data: [
    { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', credits: 3, themeColor: '#7c3aed', faculty: 'كلية الهندسة', facultyEmoji: null, department: 'قسم علوم الحاسوب', departmentId: 'dep_e2e_cs', offeringCount: 2, conceptCount: 24, totalEnrollments: 96, totalLectures: 24, totalMaterials: 18, recentOfferings: [{ id: 'offr_1', term: 'ربيع 2026', enrollments: 54, lectures: 12, teacher: 'أستاذ الرياضيات' }] },
    { id: 'crs_e2e_databases', code: 'CS-310', name: 'قواعد البيانات المتقدمة', credits: 3, themeColor: '#0ea5e9', faculty: 'كلية الهندسة', facultyEmoji: null, department: 'قسم علوم الحاسوب', departmentId: 'dep_e2e_cs', offeringCount: 1, conceptCount: 18, totalEnrollments: 42, totalLectures: 18, totalMaterials: 12, recentOfferings: [{ id: 'offr_2', term: 'ربيع 2026', enrollments: 42, lectures: 18, teacher: 'أستاذ الرياضيات' }] },
    { id: 'crs_e2e_stats', code: 'MA-210', name: 'الإحصاء التطبيقي', credits: 2, themeColor: '#15803d', faculty: 'كلية العلوم', facultyEmoji: null, department: 'قسم الرياضيات', departmentId: 'dep_e2e_math', offeringCount: 1, conceptCount: 14, totalEnrollments: 61, totalLectures: 14, totalMaterials: 9, recentOfferings: [{ id: 'offr_3', term: 'خريف 2025', enrollments: 61, lectures: 14, teacher: 'أستاذ الرياضيات' }] },
  ],
  meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
};

/* GET /feedback — the inbox rows (FeedbackRow shape). */
const FEEDBACK = {
  data: [
    { id: 'fb_1', kind: 'BUG', role: 'STUDENT', route: '/student/dashboard', userAgent: null, console: null, note: 'لا تظهر العلامات في لوحة النتائج بعد التحديث.', screenshot: null, status: 'open', createdAt: hoursAgo(5), user: { id: 'usr_e2e_student', firstName: 'طالب', lastName: 'السنة الثالثة', role: 'STUDENT' } },
    { id: 'fb_2', kind: 'IDEA', role: 'TEACHER', route: '/teacher/courses', userAgent: null, console: null, note: 'إضافة تصدير كشف العلامات بصيغة Excel.', screenshot: null, status: 'triage', createdAt: hoursAgo(28), user: { id: 'usr_e2e_teacher', firstName: 'أستاذ', lastName: 'الرياضيات', role: 'TEACHER' } },
    { id: 'fb_3', kind: 'BUG', role: 'STUDENT', route: '/student/calendar', userAgent: null, console: null, note: 'تقويم الأسبوع يفقد التمرير على الهاتف.', screenshot: null, status: 'fixed', createdAt: hoursAgo(120), user: { id: 'usr_e2e_student', firstName: 'طالب', lastName: 'السنة الثالثة', role: 'STUDENT' } },
  ],
  meta: { total: 3, totalPages: 1, page: 1 },
};

/* GET /client-errors — the telemetry rows (ClientErrorRow shape). */
const CLIENT_ERRORS = {
  data: [
    { id: 'ce_1', kind: 'js_error', message: 'TypeError: rows.map is not a function', stack: null, route: '/owner/users', role: 'OWNER', breadcrumbs: null, appVersion: null, updateId: null, runtimeVersion: null, deviceModel: null, osName: null, osVersion: null, reviewedAt: null, createdAt: hoursAgo(9), user: { id: 'usr_e2e_owner', firstName: 'المدير', lastName: 'الأعلى', email: 'owner@test.ly' } },
  ],
  meta: { total: 1, totalPages: 1, page: 1, unreviewed: 1 },
};

const overrides = [
  { method: 'GET', path: '/owner/stats', json: ok(STATS) },
  /* BEFORE the general /owner/users entry: the detail page's offering
   * form asks /owner/users?role=TEACHER&institutionSlug=zu (the r181
   * teacher picker) and the mock's no-query route would swallow it,
   * listing every role as a choosable «أستاذ». The query-constrained
   * entry answers the honest filtered roster; first-match wins. */
  {
    method: 'GET', path: '/owner/users', query: { role: 'TEACHER', institutionSlug: 'zu' },
    json: {
      data: USERS.data.filter((u) => u.role === 'TEACHER'),
      meta: { page: 1, limit: 200, total: 1, totalPages: 1 },
    },
  },
  { method: 'GET', path: '/owner/users', json: USERS },
  { method: 'GET', path: '/owner/activity', json: ACTIVITY },
  { method: 'GET', path: '/owner/realtime', json: ok(REALTIME) },
  { method: 'GET', path: '/owner/ai-metrics', json: ok(AI_METRICS) },
  { method: 'GET', path: '/owner/alerts', json: ok(ALERTS) },
  { method: 'GET', path: '/owner/login-analytics', json: ok(LOGIN_ANALYTICS) },
  { method: 'GET', path: '/owner/education', json: ok(EDUCATION) },
  { method: 'GET', path: '/owner/system', json: ok(SYSTEM) },
  { method: 'GET', path: '/owner/settings', json: ok(SETTINGS) },
  { method: 'GET', path: '/owner/feature-flags', json: ok(FLAGS) },
  { method: 'GET', path: '/owner/governance', json: ok(GOVERNANCE) },
  { method: 'GET', path: '/owner/institutions', json: ok(INSTITUTIONS) },
  { method: 'GET', path: '/admin/faculties', json: ok(FACULTIES) },
  { method: 'GET', path: '/admin/courses', json: ADMIN_COURSES },
  { method: 'GET', path: '/feedback', json: FEEDBACK },
  { method: 'GET', path: '/client-errors', json: CLIENT_ERRORS },
  /* GET /ai/config — the r160/r164-i honest-surface badge the /owner/ai
   * header reads (useAiConfig, fail-soft: no answer = no badge). The D11
   * baseline ran badge-less (501 in the console); the honest fixture for
   * THIS transport is the local composer — provider 'local', model null —
   * so the badge renders its truthful «محليّ» label, never a fake LLM. */
  { method: 'GET', path: '/ai/config', json: ok({ provider: 'local', model: null }) },
];

/* the seeded auth state: OWNER_USER (no memberships — the owner scope
 * is platform-wide; the console's institution queries key on slugs,
 * not the session context). */
const seededUser = OWNER_USER;

/* /auth/me is AUTHORITATIVE for the session extras — the stock
 * meProfile(OWNER_USER) carries no memberships/currentInstitution,
 * which is the truthful owner payload (platform-wide scope), so the
 * transport's dynamic /auth/me answer stands (unlike D7a's student,
 * which needed the institution context patched in). */

const browser = await chromium.launch({ headless: true });
const out = { generatedAt: new Date().toISOString(), url: URL, dark: DARK, routes: {}, gate: GATE, floor: FLOOR };
let worst = 100;
try {
  for (const route of ROUTES) {
    out.routes[route] = {};
    for (const bp of BPS) {
      for (const theme of DARK ? ["dark"] : ["light"]) {
        const context = await browser.newContext({ viewport: { width: bp, height: bp === 390 ? 844 : 900 } });
        await installMockApi(context, { sessionUser: OWNER_USER, overrides });
        await seedSession(context, seededUser, { token: 'e2e-token-owner', theme: theme === 'dark' ? 'dark' : undefined });
        const page = await context.newPage();
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
writeFileSync(join(__dirname, "pages-owner-results.json"), JSON.stringify(out, null, 1));
console.log(`\npages-owner conformance — ${ROUTES.join(", ")} (${DARK ? "dark" : "light"}): worst cell ${worst}% (floor ${FLOOR})`);
if (GATE && worst < FLOOR) {
  console.error(`pages-owner gate: FAIL — a cell scored ${worst}% < ${FLOOR}%`);
  process.exit(1);
}
console.log("pages-owner gate: PASS");
