// 5-A2 probe 5: REAL hover/active via mouse + ripple + scrollWidth measurement.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const state = (r) => `/tmp/madarek-states/${r}.json`;

const readCS = (el) => {
  const cs = getComputedStyle(el);
  return {
    cursor: cs.cursor,
    transform: cs.transform === 'none' ? '' : cs.transform,
    bg: cs.backgroundColor,
    shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 80),
    outline: cs.outlineStyle === 'none' ? '' : `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
    opacity: cs.opacity,
    scrollW: el.scrollWidth, clientW: el.clientWidth,
    w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height),
  };
};

const browser = await chromium.launch({ executablePath: EXE });
const out = [];

async function audit(page, sel, label) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) { out.push({ label, sel, missing: true }); return; }
  await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const base = await loc.evaluate(readCS).catch((e) => ({ err: String(e).slice(0, 80) }));
  if (base.err) { out.push({ label, err: base.err }); return; }
  // real hover
  let hover = null;
  try { await loc.hover({ timeout: 3000 }); await page.waitForTimeout(250); hover = await loc.evaluate(readCS); } catch {}
  // real press (mouse down, hold)
  let active = null, ripple = null;
  try {
    const box = await loc.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(200);
      active = await loc.evaluate(readCS);
      ripple = await loc.evaluate((el) => {
        const after = getComputedStyle(el, '::after');
        return {
          afterContent: after.content, afterAnim: after.animationName,
          afterW: after.width, afterH: after.height,
          afterTransform: after.transform === 'none' ? '' : after.transform.slice(0, 60),
          afterOpacity: after.opacity,
          rect: JSON.stringify(el.getBoundingClientRect()).slice(0, 90),
          afterRectBox: (() => { try { return JSON.stringify(el.getBoundingClientRect()).slice(0,90); } catch { return ''; } })(),
        };
      });
      await page.mouse.up();
    }
  } catch {}
  out.push({ label, sel, base, hover, active, ripple });
}

// ── courses page: pills, cards, buttons, nav ──
const ctx = await browser.newContext({ storageState: state('student'), viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
await audit(page, 'a.btn.primary', 'btn-primary');
await audit(page, 'button.btn.outline', 'btn-outline');
await audit(page, 'button.pill', 'pill');
await audit(page, 'a.thumb-card', 'card-link');
await audit(page, '.nav-item:not(.on)', 'nav-item');
await audit(page, 'button.topbar-user-trigger', 'dropdown-trigger');
await audit(page, 'button.topbar-notif', 'icon-btn-notif');
// open the user dropdown → audit a dropdown item
try {
  await page.locator('button.topbar-user-trigger').click();
  await page.waitForTimeout(600);
  await audit(page, '.dropdown-item', 'dropdown-item');
  await page.keyboard.press('Escape');
} catch (e) { out.push({ label: 'dropdown-item', err: String(e).slice(0, 100) }); }
await ctx.close();

// ── community page: tabs ──
const ctx2 = await browser.newContext({ storageState: state('student'), viewport: { width: 1280, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto(BASE + '/community', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page2.waitForTimeout(3500);
await audit(page2, 'button.tab:not(.on)', 'tab');
await audit(page2, 'button.tab.on', 'tab-on');
await ctx2.close();

// ── mobile viewport: touch targets (pills, thumb-cards, nav) ──
const ctx3 = await browser.newContext({ storageState: state('student'), viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page3 = await ctx3.newPage();
await page3.goto(BASE + '/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page3.waitForTimeout(3500);
const touch = await page3.evaluate(() => {
  const m = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel, w: Math.round(r.width), h: Math.round(r.height), cursor: cs.cursor };
  };
  return [m('a.btn.primary'), m('button.pill'), m('.icon-btn'), m('a.bottom-nav-item'),
          m('button.topbar-search-toggle'), m('button.topbar-notif'), m('.nav-item')]
    .filter(Boolean);
});
out.push({ label: 'mobile-touch-targets-390px', touch });
await ctx3.close();
await browser.close();
console.log(JSON.stringify(out));
