/**
 * R311 PRODUCTION capture — Phase 11 live verification.
 *
 * The same Gate A states, captured against the LIVE deployment on
 * madarek.onrender.com (fresh contexts; the build identifier and the
 * hashed assets are recorded first — a stale bundle cannot masquerade
 * as the fix). Expectation: exactly ONE square pointer in every state
 * and zero cursor-layer elements anywhere.
 * Run:  node audits/evidence/r311/capture-production.mjs
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://madarek.onrender.com';
const OUT = path.dirname(new URL(import.meta.url).pathname);
const DEST = path.join(OUT, 'production');
fs.mkdirSync(DEST, { recursive: true });

const audit = {
  mission: 'R311 Phase 11 — production verification',
  base: BASE,
  captured: [],
};

async function waitLanded(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 30_000 });
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 40_000 });
  await page.waitForTimeout(1200);
}

const readPointerDom = () => {
  const layer = document.querySelector('.cursor-layer');
  const core = document.querySelector('.cursor-dot-core');
  const canvas = document.querySelector('.sc-canvas');
  const scRing = document.querySelector('.sc-ring');
  const stage = document.querySelector('.bp-stage');
  const hiLayer = document.querySelector('.hi-layer');
  const plus = document.querySelector('.hi-plus');
  const sl = document.querySelector('.sl');
  const scripts = Array.from(document.scripts).map((s) => (s.src || '').split('/').pop()).filter(Boolean);
  const cs = (el, p) => (el ? getComputedStyle(el).getPropertyValue(p) : '(absent)');
  return {
    cursorLayerCount: document.querySelectorAll('.cursor-layer').length,
    dotCoreCount: document.querySelectorAll('.cursor-dot-core').length,
    sheetCanvas: !!canvas,
    sheetRing: { on: scRing ? scRing.getAttribute('data-on') : null },
    heroStage: {
      cursorAttr: stage ? stage.getAttribute('data-cursor') : null,
      nativeCursor: cs(stage, 'cursor'),
      point: hiLayer ? hiLayer.getAttribute('data-point') : null,
      plusOpacity: cs(plus, 'opacity'),
    },
    loader: sl ? { attr: sl.getAttribute('data-cursor') } : null,
    hiddenVocabulary: document.querySelectorAll('[data-cursor="hidden"]').length,
    noneVocabulary: document.querySelectorAll('[data-cursor="none"]').length,
    assetSample: scripts.slice(0, 4),
  };
};

/* 0 — the build identity first: a stale bundle cannot pose as the fix */
const health = await fetch(BASE + '/api/v1/health').then((r) => r.json()).catch(() => null);
audit.health = health;
console.log('buildId:', health && health.buildId);

/* 1 — the landed states */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
console.log('» landing');
await waitLanded(page);

await page.mouse.move(240, 300);
await page.waitForTimeout(600);
audit.rest = await page.evaluate(readPointerDom);
await page.screenshot({ path: path.join(DEST, 'p1-rest-1440.png') });
audit.captured.push('p1-rest-1440.png');

const cta = page.locator('.fo-hero-cta').first();
const cb = await cta.boundingBox();
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.waitForTimeout(500);
audit.linkHover = await page.evaluate(readPointerDom);
await page.screenshot({ path: path.join(DEST, 'p2-link-hover-1440.png') });
audit.captured.push('p2-link-hover-1440.png');

const stage = page.locator('.bp-stage').first();
const sb = await stage.boundingBox();
await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.45);
await page.waitForTimeout(700);
audit.heroEntry = await page.evaluate(readPointerDom);
await page.screenshot({ path: path.join(DEST, 'p3-hero-plus-1440.png') });
audit.captured.push('p3-hero-plus-1440.png');
await browser.close();

/* 2 — the loader on a fresh session */
const b2 = await chromium.launch();
const p2 = await b2.newPage({ viewport: { width: 1440, height: 900 } });
await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p2.waitForFunction(() => !!document.querySelector('.sl'), { timeout: 30_000 });
await p2.waitForTimeout(2200);
await p2.mouse.move(720, 420);
await p2.waitForTimeout(400);
audit.loaderEarly = await p2.evaluate(readPointerDom);
await p2.screenshot({ path: path.join(DEST, 'p5-loader-early-1440.png') });
audit.captured.push('p5-loader-early-1440.png');

/* the exit handoff, then the square owns the sheet again */
await p2.waitForFunction(() => !document.querySelector('.sl'), { timeout: 40_000 });
await p2.waitForTimeout(1200);
audit.postLoader = await p2.evaluate(readPointerDom);
await b2.close();

fs.writeFileSync(path.join(DEST, 'production-dom-audit.json'), JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ rest: audit.rest, linkHover: audit.linkHover, heroEntry: audit.heroEntry, loaderEarly: audit.loaderEarly, postLoader: audit.postLoader }, null, 2));
console.log('» R311 production capture complete.');
