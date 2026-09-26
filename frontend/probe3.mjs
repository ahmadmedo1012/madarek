// 5-A2 probe 3: broad inventory of all clickable/focusable elements per page.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const state = (r) => `/tmp/madarek-states/${r}.json`;
const pages = [
  { name: 'student-dash',   url: '/student/dashboard', role: 'student' },
  { name: 'courses',        url: '/student/courses',   role: 'student' },
  { name: 'exams',          url: '/student/exams',     role: 'student' },
  { name: 'results',        url: '/student/results',   role: 'student' },
  { name: 'community',      url: '/community',         role: 'student' },
  { name: 'teacher-grades', url: '/teacher/grades',    role: 'teacher' },
  { name: 'admin-dash',     url: '/admin/dashboard',   role: 'admin' },
];
const browser = await chromium.launch({ executablePath: EXE });
const out = [];
for (const p of pages) {
  const ctx = await browser.newContext({ storageState: state(p.role), viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3500);
  const inv = await page.evaluate(() => {
    const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), summary';
    const map = new Map();
    document.querySelectorAll(sel).forEach((el) => {
      // only main content (skip sidebar nav which we audit separately)
      const inMain = el.closest('.content') || el.closest('main') || !el.closest('.sidebar');
      if (!inMain) return;
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join(' ') : '';
      const key = el.tagName.toLowerCase() + (cls ? '.' + cls : '');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  });
  out.push({ page: p.name, inv });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out));
