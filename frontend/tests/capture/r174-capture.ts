/**
 * r174-capture.ts — visual capture harness (Phase A/E evidence).
 *
 * Boots the REAL Vite dev server build of the SPA against the hermetic
 * mock transport (tests/e2e/fixtures/mock-transport.ts — real router,
 * real hooks, real stores, real render trees; only the wire is fixed),
 * then captures the requested routes at the mission's viewport × theme
 * matrix into /tmp/r174-captures.
 *
 * Run from frontend/:
 *   npx tsx tests/capture/r174-capture.ts [route ...]
 * (defaults: /student/dashboard)
 */
import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { installMockApi, seedSession, STUDENT_USER, TEACHER_USER } from '../e2e/fixtures/mock-transport';
import type { MockRouteDef } from '../e2e/fixtures/mock-transport';
import { teacherRoutes } from './teacher-fixtures';

const OUT = '/tmp/r174-captures';
const BASE = process.env.MADAREK_CAPTURE_BASE ?? 'http://localhost:5173';

const VIEWPORTS: Array<[string, number, number]> = [
  ['m360', 360, 780],
  ['m390', 390, 844],
  ['tbl768', 768, 1024],
  ['d1280', 1280, 800],
  ['d1440', 1440, 900],
];

const THEMES = ['light', 'dark'] as const;

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // CountIn (700ms) + chart entrance (520ms) + one paint margin.
  await page.waitForTimeout(1400);
}

async function capture(
  browser: Browser,
  route: string,
  slug: string,
  role: 'student' | 'teacher' = 'student',
): Promise<void> {
  const user = role === 'teacher' ? TEACHER_USER : STUDENT_USER;
  const overrides = role === 'teacher' ? teacherRoutes() : [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await installMockApi(ctx, { sessionUser: user, overrides });
  await seedSession(ctx, user, { token: 'e2e-token-student' });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  for (const [vpName, w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    for (const theme of THEMES) {
      // Force the theme store before load (the store reads on boot).
      await page.addInitScript(
        ([t]) => {
          try {
            localStorage.setItem(
              'madarek-theme',
              JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 }),
            );
          } catch { /* storage unavailable */ }
        },
        [theme] as const,
      );
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.screenshot({
        path: `${OUT}/${slug}--${vpName}--${theme}.png`,
        fullPage: false,
      });
    }
  }
  if (errors.length > 0) {
    console.log(`[console errors on ${route}]`);
    for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ✗', e);
  }
  await ctx.close();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2);
  // --role teacher flips the seeded session + adds teacher fixtures.
  let role: 'student' | 'teacher' = 'student';
  const routes = args.filter((a) => {
    if (a === '--role=teacher') { role = 'teacher'; return false; }
    if (a === '--role=student') { role = 'student'; return false; }
    return true;
  });
  const jobs: Array<[string, string]> =
    routes.length > 0
      ? routes.map((r) => [r, r.replace(/^\//, '').replace(/[/]/g, '-') || 'root'])
      : [[role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard', `${role}-dashboard`]];
  const browser = await chromium.launch();
  for (const [route, slug] of jobs) {
    console.log(`capturing ${route} (${role}) …`);
    await capture(browser, route, slug, role);
  }
  await browser.close();
  console.log(`done → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
