// 5-A2 probe 4: force pseudo-states via CDP and measure computed styles.
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const state = (r) => `/tmp/madarek-states/${r}.json`;

const readCS = () => {
  const el = this || document.activeElement;
  const cs = getComputedStyle(el);
  return {
    cursor: cs.cursor, transform: cs.transform === 'none' ? '' : cs.transform,
    bg: cs.backgroundColor, shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 70),
    outline: cs.outlineStyle === 'none' ? '' : `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
    borderColor: cs.borderColor, opacity: cs.opacity,
    w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height),
  };
};

async function measure(cdp, page, handle, label, extra = {}) {
  const get = async () => handle.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      cursor: cs.cursor,
      transform: cs.transform === 'none' ? '' : cs.transform,
      bg: cs.backgroundColor,
      shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 70),
      outline: cs.outlineStyle === 'none' ? '' : `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
      opacity: cs.opacity,
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
    };
  });
  const base = await get();
  const out = { label, base, extra };
  for (const ps of ['hover', 'active', 'focus-visible', 'disabled']) {
    try {
      const { nodeId } = await cdp.send('DOM.describeNode', {
        objectId: (await handle.evaluateHandle((el) => el)).remoteObject().objectId,
      });
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [ps] });
      out[ps] = await get();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    } catch (e) { out[ps] = 'ERR:' + String(e).slice(0, 60); }
  }
  return out;
}

const browser = await chromium.launch({ executablePath: EXE });
const results = [];

async function runPage(name, url, role, actions) {
  const ctx = await browser.newContext({ storageState: state(role), viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const pageOut = { page: name, elements: [] };
  for (const [sel, label] of actions) {
    const handle = page.locator(sel).first();
    if (!(await handle.count())) { pageOut.elements.push({ label, sel, missing: true }); continue; }
    try {
      await handle.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
      pageOut.elements.push(await measure(cdp, page, handle, label));
    } catch (e) { pageOut.elements.push({ label, sel, error: String(e).slice(0, 80) }); }
  }
  results.push(pageOut);
  await ctx.close();
}

await runPage('courses', '/student/courses', 'student', [
  ['a.btn.primary', 'btn-primary'],
  ['button.btn.outline', 'btn-outline'],
  ['button.pill', 'pill'],
  ['button.pill.on', 'pill-on'],
  ['a.thumb-card', 'card-link'],
  ['.nav-item:not(.on)', 'nav-item'],
  ['button.topbar-user-trigger', 'dropdown-trigger'],
  ['button.topbar-notif', 'icon-btn-notif'],
  ['input', 'topbar-input'],
  ['a.bottom-nav-item:not(.active)', 'bottom-nav-item'],
]);
await runPage('community', '/community', 'student', [
  ['button.tab:not(.on)', 'tab'],
  ['button.tab.on', 'tab-on'],
  ['a.btn.primary', 'btn-primary'],
]);
await runPage('teacher-grades', '/teacher/grades', 'teacher', [
  ['a.btn.primary', 'btn-primary'],
  ['th', 'table-th'],
  ['th[aria-sort]', 'th-sortable'],
  ['.icon-btn', 'icon-btn'],
]);
await runPage('admin-dash', '/admin/dashboard', 'admin', [
  ['a.btn.primary', 'btn-primary'],
  ['.metric', 'metric'],
]);
await browser.close();
console.log(JSON.stringify(results));
