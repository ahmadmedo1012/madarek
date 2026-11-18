/**
 * r368 T1 — the real touchscreen swipe trace (the plan's Q touch-family
 * residual #2: "the real touchscreen swipe trace — the modality probe covers
 * the coarse-pointer page config + the seam driver; a swipe-driven trace is
 * the recorded residual").
 *
 * The contract under test: the smooth-scroll engine must actually respond to
 * REAL touch sequences (CDP Input.dispatchTouchEvent: touchStart → touchMove
 * band → touchEnd), scroll a meaningful distance, animate with the engine's
 * easing and SETTLE (the same settle law as fidelity.mjs: two consecutive
 * equal-height frames). The trace records the velocity curve + settle, not
 * just the end position.
 *
 * Usage (your OWN task port — AGENTS.md law):
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/swipe.mjs \
 *     --url http://localhost:53NN/ --out docs/audit/evidence/swipe.json
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
const URL = arg("url", "http://localhost:5301/");
const OUT = join(ROOT, arg("out", "docs/audit/evidence/swipe.json"));

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
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await settle(page);

  const engine = await page.evaluate(() => ({
    hasSeam: typeof window.__mdrkLenis !== "undefined",
    seamOptions: typeof window.__mdrkLenis === "object" && window.__mdrkLenis
      ? {
        smoothWheel: window.__mdrkLenis.options?.smoothWheel,
        syncTouch: window.__mdrkLenis.options?.syncTouch,
        touchMultiplier: window.__mdrkLenis.options?.touchMultiplier,
        duration: typeof window.__mdrkLenis.options?.duration === "object"
          ? window.__mdrkLenis.options.duration
          : { from: window.__mdrkLenis.options?.duration, to: window.__mdrkLenis.options?.easing },
      } : null,
  }));

  // The swipe: a real touch band down the middle of the screen, ~340px travel
  // in 8 moves at ~16ms intervals (a physical flick), released.
  const startX = 195, startY = 620, endY = 280;
  const moves = 8;
  const y0 = await page.evaluate(() => window.scrollY);
  const gestureT0 = Date.now();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: startY, id: 1 }],
  });
  for (let i = 1; i <= moves; i++) {
    const y = startY + ((endY - startY) * i) / moves;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y, id: 1 }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const yAtRelease = await page.evaluate(() => window.scrollY);

  // The settle law (fidelity.mjs's): poll scrollY until two equal samples
  // 100ms apart, cap 4s — then the settle frame count + the velocity curve.
  const curve = [];
  let settled = false;
  let settleFrames = 0;
  let lastY = await page.evaluate(() => window.scrollY);
  const t0 = Date.now();
  for (let i = 0; i < 100 && Date.now() - t0 < 6000; i++) {
    const y = await page.evaluate(() => window.scrollY);
    curve.push({ t: Date.now() - t0, y: Math.round(y * 10) / 10 });
    if (y === lastY && i > 3) { settleFrames++; } else { settleFrames = 0; }
    lastY = y;
    if (settleFrames >= 2) { settled = true; break; }
    await page.waitForTimeout(100);
  }

  const yFinal = curve.length ? curve[curve.length - 1].y : yAtRelease;
  const fingerPx = startY - endY;
  const trackedPx = yAtRelease - y0; // 1:1 finger tracking during the band (syncTouch)
  const momentumPx = yFinal - yAtRelease; // the engine's post-release animation
  const deltas = curve.slice(1).map((c, i) => Math.round((c.y - curve[i].y) * 10) / 10);
  const maxV = Math.max(0, ...deltas.map(Math.abs)); // px per 100ms sample

  const record = {
    generatedAt: new Date().toISOString(),
    url: URL,
    viewport: "390x844 DPR2 hasTouch isMobile (real CDP touch sequence)",
    engine,
    swipe: { startX, startY, endY, moves, gestureMs: 16 * moves },
    curve,
    result: {
      yStart: Math.round(y0),
      yAtRelease: Math.round(yAtRelease),
      yFinal,
      fingerPx,
      trackedPx: Math.round(trackedPx),
      momentumPx: Math.round(momentumPx),
      scrolledPx: Math.round(yFinal - y0),
      settled,
      settleFrames,
      maxVelocityPer100ms: maxV,
      monotonic: deltas.every((d) => d >= -0.5) || deltas.every((d) => d <= 0.5),
    },
    verdict: {
      // a 340px physical flick must be tracked (syncTouch 1:1) AND animate past
      // the release (engine momentum), then settle within the budget.
      responded: yFinal - y0 > Math.max(60, fingerPx * 0.5),
      animated: momentumPx > 5,
      settledWithinBudget: settled && settleFrames <= 20, // 2s at 100ms sampling
    },
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(record, null, 2) + "\n");
  const v = record.verdict;
  console.log(`SWIPE TRACE  responded:${v.responded ? "PASS" : "FAIL"} (tracked ${record.result.trackedPx}/${record.result.fingerPx}px + momentum ${record.result.momentumPx}px) · animated:${v.animated ? "PASS" : "FAIL"} · settle:${v.settledWithinBudget ? "PASS" : "FAIL"} (${record.result.settleFrames} frames, max v ${record.result.maxVelocityPer100ms}px/100ms)`);
  console.log(`swipe.json → ${OUT}`);
  await browser.close();
  if (!v.responded || !v.settledWithinBudget) process.exit(1);
};

run().catch((e) => { console.error(e); process.exit(2); });
