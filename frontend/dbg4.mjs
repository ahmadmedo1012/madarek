import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ storageState: '/tmp/madarek-states/student.json', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/colleges/leaderboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
const res = await page.evaluate(() => {
  const m = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel, w: Math.round(r.width), h: Math.round(r.height), cursor: cs.cursor, visible: r.width > 0 && r.height > 0 };
  };
  return {
    sorts: document.querySelectorAll('.leaderboard-sort').length,
    first: m('.leaderboard-sort'),
    th: m('th[aria-sort]'),
    table: m('.leaderboard-table'),
    tblStack: !!document.querySelector('.tbl-stack'),
  };
});
console.log(JSON.stringify(res));
// dropdown item at 390: open command palette? skip; check via topbar user menu
const ctx2 = await browser.newContext({ storageState: '/tmp/madarek-states/student.json', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page2 = await ctx2.newPage();
await page2.goto('http://localhost:5173/student/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page2.waitForTimeout(2500);
// mobile: topbar user trigger opens sheet? try clicking
try {
  await page2.locator('button.topbar-user-trigger, .topbar-user-trigger').first().click({ timeout: 3000 });
  await page2.waitForTimeout(800);
  const dd = await page2.evaluate(() => {
    const el = document.querySelector('.dropdown-item');
    if (!el) return { found: false, sheets: document.querySelectorAll('.sheet-panel').length };
    const r = el.getBoundingClientRect();
    return { found: true, w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log(JSON.stringify(dd));
} catch (e) { console.log(JSON.stringify({ err: String(e).slice(0, 80) })); }
await browser.close();
