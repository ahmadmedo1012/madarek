import { chromium } from 'playwright-core';
const EXEC = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
const res = await fetch('http://localhost:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'student@test.ly', password: '12345678' }) });
const env = await res.json(); const session = env?.data ?? env;
await page.addInitScript(([s]) => {
  try {
    sessionStorage.setItem('madarek-intro-skip', '1');
    localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: Date.now() }, version: 2 }));
    localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: s.user, accessToken: s.accessToken }, version: 0 }));
  } catch {}
}, [session]);
await page.goto('http://localhost:5173/student/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const out = await page.evaluate(() => {
  const findings = [];
  const walk = (el) => {
    for (const node of el.querySelectorAll('*')) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // text nodes only
      const hasText = Array.from(node.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!hasText) continue;
      const color = cs.color;
      // resolve effective bg
      let bgEl = node, bg = 'rgba(0, 0, 0, 0)';
      while (bgEl && bgEl !== document.documentElement) {
        const c = getComputedStyle(bgEl).backgroundColor;
        if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; }
        bgEl = bgEl.parentElement;
      }
      const m = (s) => s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      const mc = m(color), mb = m(bg);
      if (!mc || !mb) continue;
      const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const l1 = lum(+mc[1], +mc[2], +mc[3]), l2 = lum(+mb[1], +mb[2], +mb[3]);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3.0) {
        const size = parseFloat(cs.fontSize);
        findings.push({ text: node.textContent.trim().slice(0, 35), color, bg, ratio: Math.round(ratio * 10) / 10, size, tag: node.tagName, cls: (node.className || '').toString().slice(0, 60), bgEl: bgEl ? (bgEl.tagName + '.' + (bgEl.className || '').toString().split(' ')[0]) : '?' });
      }
    }
  };
  walk(document.body);
  return findings.slice(0, 40);
});
console.log(JSON.stringify(out, null, 1));
// also the FAB label size + the glow
const fab = await page.evaluate(() => {
  const el = document.querySelector('.fab, [class*="feedback-fab"], [class*="fab"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { cls: el.className.toString().slice(0, 80), shadow: cs.boxShadow.slice(0, 140), fontSize: cs.fontSize, label: el.textContent.trim().slice(0, 40) };
});
console.log('FAB:', JSON.stringify(fab, null, 1));
await page.close();
process.exit(0);
