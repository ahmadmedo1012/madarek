#!/usr/bin/env node
/** r324/probe-r324-review.mjs — the reviewer-claims probe: computed
 * styles + WCAG contrast for every defect the three reviewers filed,
 * in both themes, straight from the live DOM (no pixel guessing). */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const l1 = lum(a[0], a[1], a[2]), l2 = lum(b[0], b[1], b[2]);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

const probe = async () => page.evaluate(() => {
  const pick = (sel) => document.querySelector(sel);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const out = {};
  // CTA primary button
  const btn = pick('.fo-cta-actions .btn');
  if (btn) {
    const b = getComputedStyle(btn);
    out.ctaBtn = { bg: b.backgroundColor, color: b.color, fs: b.fontSize, fw: b.fontWeight };
  }
  // CTA meta line (under the button)
  const meta = pick('.fo-cta-meta');
  if (meta) out.ctaMeta = { color: getComputedStyle(meta).color, fs: getComputedStyle(meta).fontSize, text: meta.textContent.trim().slice(0, 30) };
  // the section + its ground behind meta (walk up)
  const ctaSec = pick('.fo-cta');
  if (ctaSec) out.ctaSec = { bg: getComputedStyle(ctaSec).backgroundColor };
  // theme toggle chip in the header
  const chip = pick('.fo-header [data-theme-toggle], .fo-header .theme-toggle, .fo-toggle, [data-theme-switch]');
  out.toggleSel = chip ? chip.className.toString().slice(0, 40) : 'NOT FOUND';
  if (chip) {
    const c = getComputedStyle(chip);
    out.toggle = { color: c.color, bg: c.backgroundColor, border: c.borderColor };
    const svg = chip.querySelector('svg');
    if (svg) out.toggleIcon = { fill: getComputedStyle(svg).fill, stroke: getComputedStyle(svg).stroke };
  }
  // map axis chips (circles?)
  const mapChip = pick('.jt [class*=axis], .jt-map [class*=axis], .bp-axis');
  if (mapChip) {
    const m = getComputedStyle(mapChip);
    out.mapChip = { cls: mapChip.className.toString().slice(0, 34), borderRadius: m.borderRadius, bg: m.backgroundColor };
  }
  // any circle-ish element in the map stage
  const circles = [...document.querySelectorAll('.jt circle, .bp-svg circle, .chapters circle')];
  out.mapCircleCount = circles.length;
  // footer photo strip radius
  const fimg = pick('.fo-fstrip-img, .cg-strip img, .cg-strip [class*=img]');
  if (fimg) out.footerImg = { cls: fimg.className.toString().slice(0, 30), borderRadius: getComputedStyle(fimg).borderRadius };
  // footer surface
  const foot = pick('.fo-footer');
  out.footerBg = getComputedStyle(foot).backgroundColor;
  // dark theme text token (read the CSS var from :root)
  out.textVar = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  out.textMutedVar = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
  out.accentVar = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  out.accentInkVar = getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim();
  return out;
});

console.log('===== LIGHT =====');
const light = await probe();
console.log(JSON.stringify(light, null, 1));

await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await page.waitForTimeout(600);
console.log('===== DARK =====');
const dark = await probe();
console.log(JSON.stringify(dark, null, 1));

// contrast math
const c = (fg, bg) => contrast(parse(fg), parse(bg));
console.log('===== CONTRAST =====');
if (light.ctaBtn) console.log('ctaBtn light:', c(light.ctaBtn.color, light.ctaBtn.bg).toFixed(2) + ':1', JSON.stringify(light.ctaBtn));
if (dark.ctaBtn) console.log('ctaBtn dark:', c(dark.ctaBtn.color, dark.ctaBtn.bg).toFixed(2) + ':1', JSON.stringify(dark.ctaBtn));
if (light.ctaMeta) console.log('ctaMeta light:', c(light.ctaMeta.color, light.ctaSec?.bg || 'rgb(246,246,238)').toFixed(2) + ':1', light.ctaMeta.color, 'on', light.ctaSec?.bg);
if (dark.ctaMeta) console.log('ctaMeta dark:', c(dark.ctaMeta.color, dark.ctaSec?.bg || 'rgb(28,28,26)').toFixed(2) + ':1', dark.ctaMeta.color, 'on', dark.ctaSec?.bg);

await browser.close();
