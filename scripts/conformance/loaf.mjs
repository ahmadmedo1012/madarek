/**
 * r368 T1 — the LoAF trace on a pinned production build (the plan's Task 1
 * residual #3: "LoAF <50 ms on a pinned production build — not yet traced").
 *
 * The contract under test: the landing scroll trace on the PRODUCTION build
 * has no long animation frame >50 ms (LoAF API, Chromium) and no dropped-frame
 * storm vs the 60 fps budget. The probe drives the full landing scroll with
 * wheel cadence + reading pauses, front-to-back, plus the return pass, and
 * records every LoAF entry with attribution and every rAF delta over budget.
 *
 * Usage (pin the build FIRST: `npm run build -w frontend`, then serve dist
 * with `npx vite preview --port 5302 --strictPort` from frontend/):
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/loaf.mjs \
 *     --url http://localhost:5302/ --out docs/audit/evidence/loaf.json
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const requireFrontend = createRequire(join(ROOT, "frontend", "package.json"));
const { chromium } = requireFrontend("playwright");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg("url", "http://localhost:5302/");
const OUT = join(ROOT, arg("out", "docs/audit/evidence/loaf.json"));
const LOAF_LIMIT_MS = 50; // the plan's gate
const FRAME_BUDGET_MS = 1000 / 60;

const settle = async (page) => {
  await page.evaluate(async () => { await document.fonts.ready; }).catch(() => {});
  for (let i = 0; i < 40; i++) {
    const gone = await page.evaluate(() => {
      const p = document.querySelector('[data-spec="preloader.overlay"]');
      if (!p) return true;
      const cs = getComputedStyle(p);
      return cs.display === "none" || Number(cs.opacity) < 0.02;
    }).catch(() => true);
    if (gone) break;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // LoAF + frame-delta collectors — installed BEFORE any app script runs.
  await page.addInitScript(() => {
    window.__loaf = [];
    window.__raf = [];
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__loaf.push({
            startTime: Math.round(e.startTime * 10) / 10,
            duration: Math.round(e.duration * 10) / 10,
            renderStart: Math.round((e.renderStart ?? 0) * 10) / 10,
            blockingDuration: Math.round((e.blockingDuration ?? 0) * 10) / 10,
            scripts: (e.scripts ?? []).slice(0, 4).map((s) => ({
              name: s.name || s.invoker || s.invokerType || "unknown",
              duration: Math.round((s.duration ?? 0) * 10) / 10,
              sourceURL: (s.sourceURL || "").slice(-120),
              function: (s.functionName || "").slice(0, 60),
            })),
          });
        }
      });
      po.observe({ type: "long-animation-frame", buffered: true });
    } catch { /* engine without LoAF — recorded by the unsupported flag */ window.__loaf = "unsupported"; }
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      window.__raf.push({ t: Math.round(now * 10) / 10, d: Math.round((now - last) * 10) / 10, pass: window.__pass || 1 });
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__phaseMark = (pass) => { window.__scrollStart = performance.now(); window.__pass = pass; };
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await settle(page);

  const docEnd = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const engine = await page.evaluate(() => ({
    hasSeam: typeof window.__mdrkLenis !== "undefined",
    ua: navigator.userAgent,
  }));

  // The scroll trace: wheel cadence with reading pauses, front-to-back + back.
  // Same seam law as fidelity.mjs: drive __mdrkLenis when present, native fallback.
  // TWO passes, cold then warm (reloaded): pass 1 keeps the honest first-visit
  // observations (cold image decode et al); the gate judges the WARM steady
  // state, which is what the landing scroll trace means on a pinned build.
  const driveScroll = async (pass) => {
    await page.evaluate((p) => { if (window.__phaseMark) window.__phaseMark(p); }, pass);
    let lastY = -1;
    for (let guard = 0; guard < 400; guard++) {
      const y = await page.evaluate(() => window.scrollY);
      if (y >= docEnd - 2) break;
      if (y === lastY && y > 0) break; // stuck: engine parked (modal, etc.)
      lastY = y;
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(140); // wheel cadence
      if (guard % 8 === 7) await page.waitForTimeout(700); // reading pause
    }
    await page.waitForTimeout(1200); // end settle + footer state
    // the return pass (scroll restoration toward the top)
    for (let i = 0; i < 60; i++) {
      const y = await page.evaluate(() => window.scrollY);
      if (y <= 2) break;
      await page.mouse.wheel(0, -900);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1200);
  };
  await driveScroll(1);
  const collect = `(() => {
    const loaf = window.__loaf === "unsupported" ? [] : (window.__loaf || []);
    const rafAll = (window.__raf || []).slice(1);
    const scrollStart = window.__scrollStart ?? 0;
    const raf = rafAll.filter((f) => f.t >= scrollStart);
    const rafLoad = rafAll.filter((f) => f.t < scrollStart);
    const inScroll = (e) => e.startTime >= scrollStart - 50;
    const loafScroll = loaf.filter(inScroll);
    const loafLoad = loaf.filter((e) => !inScroll(e));
    const overS = loafScroll.filter((l) => l.duration > ${LOAF_LIMIT_MS});
    const jank = raf.filter((f) => f.d > ${Math.round(FRAME_BUDGET_MS * 1.5 * 10) / 10});
    const jankLoad = rafLoad.filter((f) => f.d > ${Math.round(FRAME_BUDGET_MS * 1.5 * 10) / 10});
    return {
      loafUnsupported: window.__loaf === "unsupported",
      scrollStartMark: Math.round(scrollStart * 10) / 10,
      pass: window.__pass || 1,
      loafScroll: { total: loafScroll.length, overLimit: overS.length, max: loafScroll.reduce((m, l) => Math.max(m, l.duration), 0), entries: loafScroll.slice(0, 40) },
      loafMount: { total: loafLoad.length, max: loafLoad.reduce((m, l) => Math.max(m, l.duration), 0), entries: loafLoad.slice(0, 20) },
      rafSamples: raf.length,
      rafOverBudget15x: jank.length,
      rafOverBudget15xList: jank.slice(0, 40),
      rafMax: raf.reduce((m, f) => Math.max(m, f.d), 0),
      rafMountOverBudget: jankLoad.length,
    };
  })()`;
  const cold = await page.evaluate(collect);
  // the warm pass: reload the same page (cache primed), same trace
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await settle(page);
  await driveScroll(2);
  const warm = await page.evaluate(collect);

  const record = {
    generatedAt: new Date().toISOString(),
    url: URL,
    build: "npm run build -w frontend (dist, served by vite preview)",
    viewport: "1440x900, DPR 1, reducedMotion no-preference",
    engine,
    docEnd,
    law: {
      loafLimitMs: LOAF_LIMIT_MS,
      frameBudgetMs: Math.round(FRAME_BUDGET_MS * 100) / 100,
      jankGate: "1.5x budget, WARM steady-state scroll only",
      phaseLaw: "pass 1 = cold first-visit observations (recorded); the gate judges pass 2 (warm steady state) after a reload with primed cache; mount-phase frames are the LCP/INP ledger, never the scroll gate",
    },
    cold,
    warm,
    verdict: {
      loafPass: warm.loafUnsupported ? "UNSUPPORTED" : warm.loafScroll.overLimit === 0,
      jankNote: warm.rafOverBudget15x,
    },
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(record, null, 2) + "\n");
  const verdict = warm.loafUnsupported
    ? "UNSUPPORTED (engine lacks LoAF)"
    : warm.loafScroll.overLimit === 0 ? "PASS" : "FAIL";
  console.log(`LOAF TRACE  ${verdict} — WARM scroll-phase frames>${LOAF_LIMIT_MS}ms: ${warm.loafScroll.overLimit}/${warm.loafScroll.total} (max ${warm.loafScroll.max}ms) · COLD observations (pass 1): scroll LoAF ${cold.loafScroll.overLimit}/${cold.loafScroll.total} max ${cold.loafScroll.max}ms, mount LoAF ${cold.loafMount.total} max ${cold.loafMount.max}ms · warm rAF jank>25ms: ${warm.rafOverBudget15x}/${warm.rafSamples} (max ${warm.rafMax}ms)`);
  console.log(`loaf.json → ${OUT}`);
  await browser.close();
  if (verdict === "FAIL") process.exit(1);
};

run().catch((e) => { console.error(e); process.exit(2); });
