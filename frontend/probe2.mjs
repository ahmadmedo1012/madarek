// 5-A2 probe 2: per-element interaction-state measurement (hover/active/focus/cursor/touch).
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const state = (r) => `/tmp/madarek-states/${r}.json`;
const pages = [
  { name: 'landing',        url: '/',                  role: null },
  { name: 'student-dash',   url: '/student/dashboard', role: 'student' },
  { name: 'courses',        url: '/student/courses',   role: 'student' },
  { name: 'exams',          url: '/student/exams',     role: 'student' },
  { name: 'results',        url: '/student/results',   role: 'student' },
  { name: 'community',      url: '/community',         role: 'student' },
  { name: 'teacher-grades', url: '/teacher/grades',    role: 'teacher' },
  { name: 'admin-dash',     url: '/admin/dashboard',   role: 'admin' },
];
const FAMILIES = ['.btn', '.icon-btn', '.nav-item', '.tab', '.pill', '.chip',
  'input.input', '.dropdown-item', '.sheet-handle', 'th[aria-sort]',
  '.pagination button, .pagination a', '.toast', '[role="button"]',
  'a > .card', '.card.interactive', '.filter-pill', '.segmented button',
  '.chip-btn', '.expander, [data-expander]', '.sortable, [data-sortable]'];

const readCS = (el) => {
  const cs = getComputedStyle(el);
  return {
    cursor: cs.cursor,
    transform: cs.transform,
    background: cs.backgroundColor,
    boxShadow: cs.boxShadow.slice(0, 60),
    opacity: cs.opacity,
    outline: (cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor).slice(0, 60),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
  };
};

const browser = await chromium.launch({ executablePath: EXE });
const results = [];
for (const p of pages) {
  const ctx = await browser.newContext(p.role
    ? { storageState: state(p.role), viewport: { width: 1280, height: 900 } }
    : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.content-inner, .landing, [class*="page"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const fams = await page.evaluate((FAMILIES) => {
      const found = [];
      for (const sel of FAMILIES) {
        const els = document.querySelectorAll(sel);
        if (els.length) found.push({ sel, count: els.length });
      }
      return found;
    }, FAMILIES);
    const pageResults = { page: p.name, url: await page.evaluate(() => location.pathname), families: [] };
    for (const fam of fams.slice(0, 8)) {
      const el = page.locator(fam.sel).first();
      try {
        await el.scrollIntoViewIfNeeded({ timeout: 3000 });
      } catch {}
      const base = await el.evaluate(readCS).catch(() => null);
      if (!base) continue;
      // hover
      let hover = null;
      try { await el.hover({ timeout: 3000 }); hover = await el.evaluate(readCS); } catch {}
      // active (press and hold)
      let active = null;
      try {
        const box = await el.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          active = await el.evaluate(readCS);
          await page.mouse.up();
        }
      } catch {}
      // keyboard focus-visible
      let focus = null;
      try {
        await el.focus({ timeout: 2000 });
        // focus() API doesn't trigger :focus-visible; simulate keyboard nav
        await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        focus = await el.evaluate(readCS);
      } catch {}
      pageResults.families.push({
        sel: fam.sel, count: fam.count, sample: (await el.textContent().catch(() => '') || '').trim().slice(0, 20),
        base, hover, active, focus,
      });
    }
    results.push(pageResults);
  } catch (e) {
    results.push({ page: p.name, error: String(e).slice(0, 200) });
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results));
