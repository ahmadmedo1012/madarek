// Quick screenshot harness for the Madarek rebuild — uses Playwright's
// bundled chromium-headless-shell so it doesn't need /opt/google/chrome.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '/tmp/madarek-shots';
mkdirSync(OUT, { recursive: true });

const PUBLIC_ROUTES = [
  ['/',     'landing'],
  ['/auth', 'auth'],
];

// Authed routes — keyed by demo email (matches AuthPage demo buttons)
const AUTHED = [
  { email: 'student@zu.edu.ly', routes: [
    ['/student/dashboard', 'student-dashboard'],
    ['/student/courses',   'student-courses'],
    ['/student/library',   'student-library'],
    ['/student/research',  'student-research'],
    ['/student/ai',        'student-ai'],
    ['/student/matrix',    'student-matrix'],
    ['/student/profile',   'student-profile'],
  ]},
  { email: 'teacher@zu.edu.ly', routes: [
    ['/teacher/dashboard',    'teacher-dashboard'],
    ['/teacher/intelligence', 'teacher-intelligence'],
    ['/teacher/students',     'teacher-students'],
  ]},
  { email: 'admin@zu.edu.ly', routes: [
    ['/admin/dashboard',  'admin-dashboard'],
    ['/admin/faculties',  'admin-faculties'],
  ]},
  { email: 'quality@zu.edu.ly', routes: [
    ['/quality/dashboard',   'quality-dashboard'],
    ['/quality/courses',     'quality-courses'],
  ]},
  { email: 'owner@zu.edu.ly', routes: [
    ['/owner/dashboard',  'owner-dashboard'],
    ['/owner/realtime',   'owner-realtime'],
  ]},
];

const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['mobile',  390,  844],
];

const THEMES = ['light', 'dark'];

async function snap(page, route, file) {
  await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle', timeout: 25_000 });
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
  // scroll-to-bottom so IntersectionObserver-based reveal animations fire
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = window.innerHeight * 0.7;
      const tick = () => {
        y += step;
        window.scrollTo(0, y);
        if (y < document.documentElement.scrollHeight) requestAnimationFrame(tick);
        else { window.scrollTo(0, 0); setTimeout(res, 600); }
      };
      requestAnimationFrame(tick);
    });
  });
  await page.screenshot({ path: file, fullPage: true });
}

const browser = await chromium.launch();
const issues = [];

for (const theme of THEMES) {
  for (const [vpName, w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      colorScheme: theme,
      locale: 'ar-LY',
    });
    await ctx.addInitScript((t) => {
      try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t }, version: 0 })); } catch {}
    }, theme);

    const page = await ctx.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') issues.push({ where: page.url(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      issues.push({ where: page.url(), text: 'PAGEERR ' + err.message });
    });

    // Public routes (no login)
    for (const [route, name] of PUBLIC_ROUTES) {
      try {
        await snap(page, route, join(OUT, `${name}__${theme}__${vpName}.png`));
      } catch (e) {
        issues.push({ where: route, text: 'NAV ' + (e instanceof Error ? e.message : String(e)) });
      }
    }

    // Authed flows
    for (const cohort of AUTHED) {
      try {
        await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle', timeout: 20_000 });
        await page.fill('#auth-email', cohort.email);
        await page.fill('#auth-password', '1234');
        await Promise.all([
          page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 20_000 }),
          page.click('button[type="submit"].auth-submit'),
        ]);
        await page.waitForLoadState('networkidle', { timeout: 20_000 });
      } catch (e) {
        issues.push({ where: cohort.email, text: 'LOGIN ' + (e instanceof Error ? e.message : String(e)) });
        continue;
      }
      for (const [route, name] of cohort.routes) {
        try {
          await snap(page, route, join(OUT, `${name}__${theme}__${vpName}.png`));
        } catch (e) {
          issues.push({ where: route, text: 'NAV ' + (e instanceof Error ? e.message : String(e)) });
        }
      }
    }

    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(OUT, 'issues.json'), JSON.stringify(issues, null, 2));
console.log(`Captured. issues=${issues.length}`);
console.log(issues.map(i => `  ${i.where}: ${i.text}`).join('\n'));
