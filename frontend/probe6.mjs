// 5-A2 probe 6: click-blocked real hover/press audit + color + ripple RTL centering.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const state = (r) => '/tmp/madarek-states/' + r + '.json';

const readCS = (el) => {
  const cs = getComputedStyle(el);
  return {
    cursor: cs.cursor, color: cs.color,
    transform: cs.transform === 'none' ? '' : cs.transform,
    bg: cs.backgroundColor,
    shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 60),
    outline: cs.outlineStyle === 'none' ? '' : (cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor),
    opacity: cs.opacity, scrollW: el.scrollWidth, clientW: el.clientWidth,
    w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height),
  };
};

const browser = await chromium.launch({ executablePath: EXE });
const out = [];

async function audit(page, sel, label) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) { out.push({ label: label, sel: sel, missing: true }); return; }
  await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const base = await loc.evaluate(readCS).catch(() => null);
  if (!base) { out.push({ label: label, missing: true }); return; }
  let hover = null;
  try { await loc.hover({ timeout: 3000 }); await page.waitForTimeout(200); hover = await loc.evaluate(readCS); } catch (e) {}
  let active = null, rippleCenter = null;
  try {
    const box = await loc.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(240);
      active = await loc.evaluate(readCS);
      rippleCenter = await loc.evaluate((el) => {
        const btn = el.getBoundingClientRect();
        const btnCx = btn.x + btn.width / 2;
        const probeEl = document.createElement('span');
        probeEl.style.cssText = 'position:absolute;inset-block-start:50%;inset-inline-start:50%;inline-size:240%;block-size:240%;border-radius:50%;transform:translate(-50%,-50%) scale(1);pointer-events:none;';
        el.appendChild(probeEl);
        const r = probeEl.getBoundingClientRect();
        probeEl.remove();
        return {
          btnCx: Math.round(btnCx), btnW: Math.round(btn.width),
          afterCx: Math.round(r.x + r.width / 2),
          drift: Math.round(r.x + r.width / 2 - btnCx),
          dir: getComputedStyle(document.documentElement).direction,
        };
      });
      await page.mouse.up();
    }
  } catch (e) {}
  out.push({ label: label, sel: sel, base: base, hover: hover, active: active, rippleCenter: rippleCenter });
}

const ctx = await browser.newContext({ storageState: state('student'), viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__auditNoClick = true;
  document.addEventListener('click', (e) => {
    if (window.__auditNoClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);
});
await page.goto(BASE + '/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
await audit(page, 'a.btn.primary', 'btn-primary');
await audit(page, 'button.btn.outline', 'btn-outline');
await audit(page, 'button.pill:not(.on)', 'pill');
await audit(page, 'a.thumb-card', 'card-link');
await ctx.close();

const ctx2 = await browser.newContext({ storageState: state('student'), viewport: { width: 1280, height: 900 } });
const page2 = await ctx2.newPage();
await page2.addInitScript(() => {
  window.__auditNoClick = true;
  document.addEventListener('click', (e) => {
    if (window.__auditNoClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);
});
await page2.goto(BASE + '/student/exams', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page2.waitForTimeout(3500);
await audit(page2, 'a.btn.primary', 'btn-primary-exams');
await ctx2.close();
await browser.close();
console.log(JSON.stringify(out));
