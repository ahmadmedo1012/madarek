// probe-determinism.mjs — repeat the conformance census prelude N times and
// diff the map-seat state to isolate the run-to-run phase variance
// (marka y 8↔86 @1440 — the "phase-shifted tail" root cause hunt).
import { chromium } from "playwright";

const URL_ = process.argv[2] || "http://localhost:5320";
const N = Number(process.argv[3] || 4);

const browser = await chromium.launch({ headless: true });
const runs = [];
for (let n = 0; n < N; n++) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL_, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  // the SCROLL_WALK prelude (60 seats × 110ms, seat(0), 400ms)
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const seat = (y) => {
      const L = window.__mdrkLenis;
      if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    };
    await sleep(200);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    for (let i = 0; i <= 60; i++) {
      seat(Math.round((max * i) / 60));
      await sleep(110);
    }
    seat(0);
    await sleep(400);
  });
  const snap = await page.evaluate(() => {
    const sec = document.querySelector("section#chapters.chapters");
    const q = (s) => sec.querySelector(s);
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect(), s = sec.getBoundingClientRect();
      return { y: Math.round(b.top - s.top), h: Math.round(b.height), w: Math.round(b.width) };
    };
    const track = sec.querySelector(".jt");
    return {
      stage: track?.getAttribute("data-stage"),
      finding: track?.getAttribute("data-finding"),
      wash: track?.getAttribute("data-wash"),
      rm: track?.getAttribute("data-rm"),
      open: track?.querySelector(".jt-close")?.getAttribute("data-open"),
      viewBox: sec.querySelector(".jt-plan-svg")?.getAttribute("viewBox") ?? sec.querySelector("svg")?.getAttribute("viewBox"),
      fonts: document.fonts.status,
      marka: r(q('[data-spec="map.marka"]')),
      markc: r(q('[data-spec="map.markc"]')),
      window: r(q(".jt-map-window")),
      introbody: r(q('[data-spec="map.introbody"]')),
      finding1b: r(q('[data-spec="map.finding1b"]')),
      raile: r(q('[data-spec="map.raile"]')),
      introhead: r(q('[data-spec="map.introhead"]')),
    };
  });
  runs.push(snap);
  await page.close();
  console.log(`run ${n}:`, JSON.stringify(snap));
}
await browser.close();
const ref = JSON.stringify(runs[0]);
const allSame = runs.every((r) => JSON.stringify(r) === ref);
console.log("\nDETERMINISTIC:", allSame);
if (!allSame) {
  console.log("diff fields per run:");
  for (const k of Object.keys(runs[0])) {
    const vals = runs.map((r) => JSON.stringify(r[k]));
    if (new Set(vals).size > 1) console.log(`  ${k}: ${vals.join("  |  ")}`);
  }
}
