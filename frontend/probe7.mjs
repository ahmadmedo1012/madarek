// 5-A2 probe 7 (final combined): interaction states + authored moments + focus walk.
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
const out = { interactions: [], authored: [], focus: [] };

async function auditEl(page, sel, label) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) { out.interactions.push({ label: label, missing: true }); return; }
  await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const base = await loc.evaluate(readCS).catch(() => null);
  if (!base) { out.interactions.push({ label: label, missing: true }); return; }
  let hover = null;
  try { await loc.hover({ timeout: 2500 }); await page.waitForTimeout(180); hover = await loc.evaluate(readCS); } catch (e) {}
  let active = null, rippleCenter = null;
  try {
    const box = await loc.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down(); await page.waitForTimeout(220);
      active = await loc.evaluate(readCS);
      rippleCenter = await loc.evaluate((el) => {
        const btn = el.getBoundingClientRect();
        const btnCx = btn.x + btn.width / 2;
        const probeEl = document.createElement('span');
        probeEl.style.cssText = 'position:absolute;inset-block-start:50%;inset-inline-start:50%;inline-size:240%;block-size:240%;border-radius:50%;transform:translate(-50%,-50%) scale(1);pointer-events:none;';
        el.appendChild(probeEl);
        const r = probeEl.getBoundingClientRect();
        probeEl.remove();
        return { btnCx: Math.round(btnCx), afterCx: Math.round(r.x + r.width / 2), drift: Math.round(r.x + r.width / 2 - btnCx), dir: getComputedStyle(document.documentElement).direction };
      });
      await page.mouse.up();
    }
  } catch (e) {}
  out.interactions.push({ label: label, sel: sel, base: base, hover: hover, active: active, rippleCenter: rippleCenter });
}

async function loadPage(url, role) {
  const ctx = await browser.newContext(role ? { storageState: state(role), viewport: { width: 1280, height: 900 } } : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__auditNoClick = true;
    document.addEventListener('click', (e) => { if (window.__auditNoClick) { e.preventDefault(); e.stopPropagation(); } }, true);
  });
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  return { ctx, page };
}

// ── courses: buttons, pills, cards, nav ──
{
  const { ctx, page } = await loadPage('/student/courses', 'student');
  await auditEl(page, 'a.btn.primary', 'btn-primary');
  await auditEl(page, 'button.btn.outline', 'btn-outline');
  await auditEl(page, 'button.pill:not(.on)', 'pill');
  await auditEl(page, 'a.thumb-card', 'card-link');
  await auditEl(page, '.nav-item:not(.on)', 'nav-item');
  // focus-visible keyboard walk (first 12 focus stops)
  try {
    await page.mouse.click(4, 4);
    const stops = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 2).join('.'),
          fv: el.matches(':focus-visible'),
          outline: cs.outlineStyle === 'none' ? 'none' : (cs.outlineWidth + ' ' + cs.outlineStyle),
        };
      });
      if (info) stops.push(info);
    }
    out.focus.push({ page: 'courses', stops });
  } catch (e) {}
  await ctx.close();
}

// ── community: tabs ──
{
  const { ctx, page } = await loadPage('/community', 'student');
  await auditEl(page, 'button.tab:not(.on)', 'tab');
  await ctx.close();
}

// ── authored-moments inventory on 8 pages (single load each) ──
const PAGES = [
  ['landing', '/', null],
  ['student-dash', '/student/dashboard', 'student'],
  ['courses', '/student/courses', 'student'],
  ['exams', '/student/exams', 'student'],
  ['results', '/student/results', 'student'],
  ['teacher-grades', '/teacher/grades', 'teacher'],
  ['admin-dash', '/admin/dashboard', 'admin'],
  ['community', '/community', 'student'],
];
for (const [name, url, role] of PAGES) {
  try {
    const { ctx, page } = await loadPage(url, role);
    const inv = await page.evaluate(() => {
      const anims = new Map();
      document.querySelectorAll('body *').forEach((el) => {
        const cs = getComputedStyle(el);
        const an = cs.animationName;
        if (an && an !== 'none') anims.set(an, (anims.get(an) || 0) + 1);
      });
      return {
        reveals: document.querySelectorAll('[data-reveal]').length,
        revealed: document.querySelectorAll('[data-revealed="true"]').length,
        sectionAccents: document.querySelectorAll('[class*="section-accent"]').length,
        parallax: document.querySelectorAll('.parallax').length,
        animatedEls: [...anims.entries()].map(([k, v]) => k + 'x' + v),
        numeric: document.querySelectorAll('[data-numeric="true"]').length,
        metrics: document.querySelectorAll('.metric').length,
      };
    });
    out.authored.push({ page: name, ...inv });
    await ctx.close();
  } catch (e) { out.authored.push({ page: name, error: String(e).slice(0, 100) }); }
}
await browser.close();
console.log(JSON.stringify(out));
