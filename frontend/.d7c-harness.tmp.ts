/**
 * D7c hermetic seeded-session pages harness (D6's method, uncommitted tool):
 * pages.mjs's probe axes × the e2e mock-transport + seedSession + frozen
 * clock, so authed student rows are measurable without a backend.
 *   node_modules/.bin/tsx frontend/.d7c-harness.tmp.ts [--label x] [--json /tmp/x.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');

import { installMockApi, seedSession, type MockRouteDef } from './tests/e2e/fixtures/mock-transport';
import { FIXED_NOW_ISO, STUDENT_USER } from './tests/e2e/fixtures/api-fixtures';

const URL = process.env.D7C_URL ?? 'http://localhost:5349';
const ROUTES = ['/student/results', '/student/schedule', '/student/alerts', '/student/messages'];
const BPS = [1440, 390];
const THEMES = ['light', 'dark'] as const;
const FLOOR = 90;

/* ── extra fixtures (standard table carries neither) ─────────────── */
const RESULTS = {
  headline: {
    avgGradePct: 81.5,
    highest: { courseName: 'مقدمة في الخوارزميات', gradePct: 94 },
    lowest: { courseName: 'قواعد البيانات', gradePct: 68 },
    courseCount: 4,
  },
  courses: [
    { offeringId: 'offr_e2e_algorithms', term: 'خريف 2026', courseCode: 'CS201', courseName: 'مقدمة في الخوارزميات', themeColor: null, gradePct: 94, breakdown: [{ kind: 'FINAL', score: 47, maxScore: 50, weight: 40, feedback: null }] },
    { offeringId: 'offr_e2e_databases', term: 'خريف 2026', courseCode: 'CS210', courseName: 'قواعد البيانات', themeColor: null, gradePct: 68, breakdown: [{ kind: 'MIDTERM', score: 17, maxScore: 25, weight: 30, feedback: 'راجع التطبيقات العملية' }] },
    { offeringId: 'offr_e2e_net', term: 'خريف 2026', courseCode: 'CS230', courseName: 'شبكات الحاسوب', themeColor: null, gradePct: 86, breakdown: [] },
    { offeringId: 'offr_e2e_math', term: 'خريف 2026', courseCode: 'MTH101', courseName: 'الرياضات المتقطعة', themeColor: null, gradePct: 78, breakdown: [] },
  ],
  recentAssignments: [
    { id: 'asg_e2e_1', title: 'واجب الخوارزميات الجشعة', type: 'HOMEWORK' as const, offeringId: 'offr_e2e_algorithms', gradePct: 92, gradedAt: FIXED_NOW_ISO, grade: 23, maxScore: 25, feedback: 'حلّ منظّم', submittedAt: FIXED_NOW_ISO },
    { id: 'asg_e2e_2', title: 'اختبار قصير — الاستعلامات', type: 'QUIZ' as const, offeringId: 'offr_e2e_databases', gradePct: 64, gradedAt: FIXED_NOW_ISO, grade: 16, maxScore: 25, feedback: null, submittedAt: FIXED_NOW_ISO },
  ],
  pendingSubmissions: [
    { id: 'sub_e2e_1', title: 'مشروع الفهرسة', type: 'PROJECT' as const, offeringId: 'offr_e2e_databases', courseCode: 'CS210', courseName: 'قواعد البيانات', status: 'SUBMITTED' as const, late: false, submittedAt: FIXED_NOW_ISO },
  ],
};
const MESSAGES = {
  data: [
    { id: 'msg_e2e_1', body: 'تذكير: تسليم الواجب الثالث غداً.', createdAt: FIXED_NOW_ISO, readAt: null, fromUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: null }, toUser: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarColor: null } },
    { id: 'msg_e2e_2', body: 'شكراً على التوضيح.', createdAt: FIXED_NOW_ISO, readAt: FIXED_NOW_ISO, fromUser: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarColor: null }, toUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: null } },
    { id: 'msg_e2e_3', body: 'موعد الامتحان الفصلي الأحد القادم.', createdAt: FIXED_NOW_ISO, readAt: FIXED_NOW_ISO, fromUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: null }, toUser: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarColor: null } },
  ],
  meta: { page: 1, limit: 30, total: 3, totalPages: 1, unread: 1 },
};
const OVERRIDES: MockRouteDef[] = [
  { method: 'GET', path: '/me/results', json: { data: RESULTS } },
  { method: 'GET', path: '/messages', json: MESSAGES },
  { method: 'PATCH', path: '/messages/:id/read', json: { data: { ok: true } } },
  { method: 'POST', path: '/messages/read-all', json: { data: { updated: 1 } } },
];

/* ── the type ladder (verbatim pages.mjs) ────────────────────────── */
const rungNames: string[] = [];
{
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const f of ['tokens.css', 'tokens.generated.css']) {
    let css = '';
    try { css = strip(readFileSync(`/home/z/wt/d7c/frontend/src/styles/tokens/${f}`, 'utf8')); } catch { continue; }
    for (const m of css.matchAll(/--(fs-[a-z-]+)\s*:/g)) {
      if (!rungNames.includes(m[1])) rungNames.push(m[1]);
    }
  }
}
const RUNG_TOL = 0.5;

/* ── in-browser probe (verbatim pages.mjs) ───────────────────────── */
import { PAGE_PROBE, CTA_PROBE, CTA_READ } from './.d7c-probe.tmp.mjs';

/* ── runner ──────────────────────────────────────────────────────── */
const browser = await chromium.launch({ headless: true });
/* Warm the Vite module graph once (the first navigation pays the
 * on-demand transform of the route chunks + shell; without this the
 * FIRST measured cell races the skeleton → flaky axis reads). */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar', timezoneId: 'UTC' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* noop */ } });
  await seedSession(ctx, STUDENT_USER, { theme: 'light' });
  await installMockApi(ctx, { sessionUser: STUDENT_USER, overrides: OVERRIDES });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(FIXED_NOW_ISO);
  for (const r of ROUTES) {
    await page.goto(`${URL}${r}`, { waitUntil: 'load', timeout: 60000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await ctx.close();
}
const out: any = {};
let worst = 100;
try {
  for (const route of ROUTES) {
    out[route] = {} as never;
    for (const bp of BPS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: bp, height: bp === 390 ? 844 : 900 },
          locale: 'ar',
          timezoneId: 'UTC',
        });
        await context.addInitScript(() => {
          try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* noop */ }
        });
        await seedSession(context, STUDENT_USER, { theme });
        await installMockApi(context, { sessionUser: STUDENT_USER, overrides: OVERRIDES });
        const page = await context.newPage();
        await page.clock.setFixedTime(FIXED_NOW_ISO);
        await page.goto(`${URL}${route}`, { waitUntil: 'load', timeout: 60000 });
        /* settle gate: the settled pages own these seats (skeletons
         * render none of them) — measure the DATA state, never the
         * loading mirror. */
        await page.waitForSelector('.r319s-bar, .np-list, .pf-statline, .list-row', { timeout: 20000 }).catch(() => undefined);
        await page.waitForTimeout(1500);
        const r: any = await page.evaluate(PAGE_PROBE as never, { bp, rungNames, rungTol: RUNG_TOL } as never);
        const cta: any = await page.evaluate(CTA_PROBE as never);
        let hover = { score: 0, channels: 0, label: cta?.label ?? '' };
        if (cta && Number.isFinite(cta.cx) && Number.isFinite(cta.cy)) {
          await page.mouse.move(cta.cx, cta.cy);
          await page.waitForTimeout(250);
          const after: any = await page.evaluate(CTA_READ as never);
          if (after) {
            const channels = Object.keys(cta.before).filter((k) => cta.before[k as keyof typeof cta.before] !== after[k as keyof typeof after]);
            hover = { score: channels.length >= 2 ? 100 : 0, channels: channels.length, label: cta.label };
          }
          await page.mouse.move(0, 0);
        }
        (r as any).hover = hover;
        const axes = ['typeRungs', 'spacing', 'pattern', 'darkInk', 'edge390', 'hover'];
        const score = Math.round((axes.reduce((a: number, k: string) => a + Math.min(100, (r as any)[k].score), 0) / axes.length) * 10) / 10;
        out[route][`${bp}:${theme}`] = { score, axes: r };
        worst = Math.min(worst, score);
        console.log(`  ${route} @${bp} ${theme}: ${score}%  [${axes.map((k) => `${k} ${Math.round(Math.min(100, (r as any)[k].score))}`).join(' · ')}]`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
const jsonPath = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : '/tmp/d7c-pages.json';
writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), worst, routes: out }, null, 1));
console.log(`\nD7c pages (seeded session, ${THEMES.join('+')}): worst cell ${worst}% (floor ${FLOOR}) → ${jsonPath}`);
