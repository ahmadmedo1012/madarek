import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ storageState: '/tmp/madarek-states/student.json', viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__auditNoClick = true;
  document.addEventListener('click', (e) => { if (window.__auditNoClick) { e.preventDefault(); e.stopPropagation(); } }, true);
});
await page.goto('http://localhost:5173/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
const nav = page.locator('.nav-item:not(.on)').first();
await nav.scrollIntoViewIfNeeded().catch(() => {});
await nav.hover();
await page.waitForTimeout(300);
const res = await nav.evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    matchesHover: el.matches(':hover'),
    bg: cs.backgroundColor,
    color: cs.color,
    surface2: getComputedStyle(document.documentElement).getPropertyValue('--surface-2'),
    sidebarItemHoverBg: getComputedStyle(document.documentElement).getPropertyValue('--sidebar-item-hover-bg'),
    inCollapsed: !!el.closest('.sidebar.collapsed, [data-sidebar-collapsed] *'),
    parentChain: (() => { let a = [], n = el; for (let i = 0; i < 4 && n.parentElement; i++) { n = n.parentElement; a.push(n.tagName + '.' + (typeof n.className === 'string' ? n.className.split(' ')[0] : '')); } return a.join(' > '); })(),
    htmlAttrs: document.documentElement.getAttributeNames().filter((a) => a.startsWith('data-')),
  };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
