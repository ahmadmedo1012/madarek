// 5-A2 probe 1: inventory interactive elements on key pages.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const state = (r) => `/tmp/madarek-states/${r}.json`;
const pages = [
  { name: 'landing',     url: '/',                      role: null },
  { name: 'student-dash',url: '/dashboard',             role: 'student' },
  { name: 'courses',     url: '/student/courses',       role: 'student' },
  { name: 'exams',       url: '/student/exams',         role: 'student' },
  { name: 'grades',      url: '/student/grades',        role: 'student' },
  { name: 'community',   url: '/community',             role: 'student' },
  { name: 'teacher-grades', url: '/teacher/grades',     role: 'teacher' },
  { name: 'admin-dash',  url: '/admin',                 role: 'admin' },
];
const results = [];
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome' });
for (const p of pages) {
  const ctx = await browser.newContext(p.role
    ? { storageState: state(p.role), viewport: { width: 1280, height: 900 } }
    : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(600);
    const data = await page.evaluate(() => {
      const sels = ['.btn', '.icon-btn', '.nav-item', '.tab', '.pill', '.chip',
        'input.input', '.dropdown-item', '.sheet-handle', 'th[aria-sort]',
        '.pagination button', '.toast', '.filter-pill', '[role="button"]',
        'a > .card', '.card.interactive', '.segmented button'];
      const seen = new Map();
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((el) => {
          const cls = typeof el.className === 'string'
            ? el.tagName.toLowerCase() + '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : el.tagName.toLowerCase();
          if (!seen.has(sel)) seen.set(sel, { sel, cls: cls, count: 0 });
          seen.get(sel).count++;
        });
      }
      return { url: location.pathname, title: document.title,
        groups: [...seen.values()].filter(g => g.count > 0) };
    });
    results.push({ page: p.name, ...data });
  } catch (e) {
    results.push({ page: p.name, error: String(e).slice(0, 150) });
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results));
