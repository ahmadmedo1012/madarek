/* P2.6 — sheet-parse probe: count the CSS rules the BROWSER actually
 * parsed per stylesheet on a given base (main :5173 vs ink-app :5211).
 * Settles the slash-star banner claim: a comment that closes early
 * inside a banner can kill the rules that follow in the same sheet. */
import { chromium } from 'playwright-core';
import { sessionForEmail, authStorageJson, ROLE_EMAIL } from './capture-routes.mjs';

const BASE = process.argv[2] || 'http://localhost:5173';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const TARGETS = [
  'r305-student-schedule.css',
  'r305-student-supplemental.css',
  'r305-student.css',
  'r305-research-pdf-ai.css',
  'r321-player-page.css',
  'ai.css',
];

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });

/* sheet → a page that mounts it (per-page JS imports in dev) */
const PAGE_FOR = {
  'r305-student-schedule.css': '/student/calendar',
  'r305-student-supplemental.css': '/student/profile',
  'r305-student.css': '/student/dashboard',
  'r305-research-pdf-ai.css': '/student/research',
  'r321-player-page.css': '/student/lectures/cmvv0q0uj00fv78snnq41bqs9',
  'ai.css': '/student/ai',
};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar', colorScheme: 'dark', serviceWorkers: 'block' });
await ctx.addInitScript(() => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch { } });
const session = await sessionForEmail(ROLE_EMAIL.student);
await ctx.addInitScript(({ auth }) => { try { localStorage.setItem('mdrk-auth', auth); } catch { } }, { auth: authStorageJson(session) });

const counts = {};
for (const [target, pagePath] of Object.entries(PAGE_FOR)) {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + pagePath, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2200);
    const res = await page.evaluate((t) => {
      const viteId = `styles/${t}`;
      for (const sheet of Array.from(document.styleSheets)) {
        const node = sheet.ownerNode;
        const stamped = node && node.textContent && node.textContent.includes(viteId);
        if (sheet.href && sheet.href.includes(t)) {
          try { return { rules: sheet.cssRules.length, via: 'link' }; } catch { return { rules: -2, via: 'link' }; }
        }
        if (stamped) {
          /* the style tag's text carries the vite module url; the sheet
           * itself is a constructed CSSStyleSheet — count its rules */
          try { return { rules: sheet.cssRules.length, via: 'style-tag' }; } catch { return { rules: -2, via: 'style-tag' }; }
        }
      }
      return { rules: 'NOT LOADED', via: '-' };
    }, target);
    counts[target] = res;
  } catch (e) {
    counts[target] = { rules: 'ERR ' + String(e.message).slice(0, 60), via: '-' };
  }
  await page.close();
}
console.log(`BASE ${BASE}`);
for (const t of TARGETS) console.log(' ', t.padEnd(34), JSON.stringify(counts[t] ?? { rules: 'NOT LOADED' }));
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
