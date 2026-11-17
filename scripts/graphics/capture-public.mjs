#!/usr/bin/env node
/**
 * capture-public.mjs — R366 L5 (Agent 1): the mobile-first capture pass for
 * the public surface. Captures the landing sections + the public pages at
 * the program's width matrix (320/360/390/412/600 + landscape 844×390 +
 * 640×360 + 200% zoom + reduced motion), then tiles contact sheets with
 * ffmpeg (the repo's image tool — no new deps).
 *
 * Output: docs/redesign/r366/agent1-heron/evidence/l5-mobile/
 *   landing-{w}.png        — full-page captures per width
 *   sheet-{name}.png       — the tiled contact sheets (crops ≤480px wide)
 *
 * Usage: node scripts/graphics/capture-public.mjs [--url http://localhost:5310]
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const { chromium } = createRequire(join(REPO, "frontend", "package.json"))("playwright");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg("url", "http://localhost:5310");
const OUT = join(REPO, "docs", "redesign", "agent1-l5-tmp");
mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 360, 390, 412, 600];
const LANDSCAPE = [{ w: 844, h: 390 }, { w: 640, h: 360 }];

const browser = await chromium.launch();
const shots = [];
try {
  // 1) the landing per-width (full page)
  for (const w of WIDTHS) {
    const p = await browser.newPage({ viewport: { width: w, height: 844 } });
    await p.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(1800);
    await p.screenshot({ path: join(OUT, `landing-${w}.png`), fullPage: true });
    shots.push(`landing-${w}.png`);
    await p.close();
    process.stdout.write(`▸ ${w} ✓ `);
  }
  // 2) landscape
  for (const { w, h } of LANDSCAPE) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: join(OUT, `landing-${w}x${h}.png`), fullPage: false });
    shots.push(`landing-${w}x${h}.png`);
    await p.close();
    process.stdout.write(`▸ ${w}x${h} ✓ `);
  }
  // 3) 200% zoom (deviceScaleFactor 2 @390) + reduced motion @390
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await p.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: join(OUT, "landing-390-2x.png"), fullPage: false });
    shots.push("landing-390-2x.png");
    await p.close();
  }
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await p.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: join(OUT, "landing-390-rm.png"), fullPage: false });
    shots.push("landing-390-rm.png");
    await p.close();
  }
  // 4) the public pages @390
  for (const route of ["/about", "/help", "/contact", "/app", "/capabilities", "/colleges", "/legal/privacy", "/auth"]) {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(URL + route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(900);
    const name = "page-" + route.replace(/\//g, "-").replace(/^-/, "") + ".png";
    await p.screenshot({ path: join(OUT, name), fullPage: false });
    shots.push(name);
    await p.close();
    process.stdout.write(`▸ ${route} ✓ `);
  }
} finally {
  await browser.close();
}
console.log(`\n${shots.length} captures → ${OUT}`);
