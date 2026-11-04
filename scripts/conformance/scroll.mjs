/**
 * scroll.mjs — R337 conformance extension 1: SCROLL FEEL + SCRUB CURVES.
 *
 * What the owner *feels* when scrolling, as numbers:
 *
 * A. scroll feel (per breakpoint, vs _page.<bp>.json):
 *    · Lenis config: smoothWheel (spec-recorded), lerp/duration/easing
 *      (absent in the frozen spec — asserted as "a Lenis instance is
 *      live on .main-inner" + smoothWheel parity; lerp/duration/easing
 *      recorded once via our own instrumentation when the motion owner
 *      lands the engine and written to scroll-config.json, then compared).
 *    · scroller element identity: the page scrolls the WINDOW on the
 *      landing route (Heron's Lenis rides window) — asserted.
 *    · scroll-behavior: 'auto' on html/body (Lenis owns the animation;
 *      a CSS smooth would fight it).
 *    · anchor/scroll-to: every in-page anchor resolves inside the
 *      document (no dead #hash that never scrolls).
 *    · section heights in vh (already in the matrix) + sticky offsets:
 *      any position:sticky element reports its top offset class
 *      (0 | header-height | other) — "other" needs a mapping reason.
 *    · scroll restoration: 'manual' on the landing (the loader owns
 *      the initial position) — history.scrollRestoration asserted.
 *
 * B. scrub-curve sampling (the numeric "does it move like Heron"):
 *    For every recorded ScrollTrigger with scrub=true, sample the
 *    TARGET's animated property at 11 scroll positions across the
 *    trigger's [start,end] range on OUR page, normalize to the
 *    property's observed range, and compare the SHAPE to the frozen
 *    Heron curve (extracted the same way, committed in
 *    scroll-curves.<bp>.json). Tolerance: max deviation ≤5% of range
 *    at any of the 11 sample points.
 *
 *    Heron's frozen curves don't exist yet — extract.mjs (below)
 *    produces them from the live reference ONCE; after that the
 *    conformance run is fully offline.
 *
 * Usage:
 *   node scripts/conformance/scroll.mjs extract [--bps 1440]   # freeze curves (needs live Heron)
 *   node scripts/conformance/run.mjs --scroll                  # assert (offline, vs frozen)
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium;
try {
  ({ chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json"))("playwright");
}
const SPEC_DIR = join(WORKTREE, "docs", "redesign", "r335", "heron-spec");
const CURVES_FILE = (bp) => join(SPEC_DIR, `scroll-curves.${bp}.json`);

export const BPS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 844 },
];

/** The in-page sampler: given a trigger config {trigger, start, end, props}
 *  sample each animated property at 11 positions across the range. */
const SAMPLE_JS = String.raw`
async (cfg) => {
  const N = 11;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seat = (y) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  const readProp = (el, prop) => {
    const cs = getComputedStyle(el);
    if (prop === "opacity") return Number(cs.opacity);
    if (prop === "x" || prop === "y") {
      const m = cs.transform === "none" ? null : cs.transform.match(/matrix\(([^)]+)\)/);
      if (!m) return 0;
      const v = m[1].split(",").map(Number);
      return prop === "x" ? v[4] : v[5];
    }
    if (prop === "scale") {
      const m = cs.transform === "none" ? null : cs.transform.match(/matrix\(([^)]+)\)/);
      if (!m) return 1;
      const v = m[1].split(",").map(Number);
      return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    }
    if (prop === "rotate") {
      const m = cs.transform === "none" ? null : cs.transform.match(/matrix\(([^)]+)\)/);
      if (!m) return 0;
      const v = m[1].split(",").map(Number);
      return (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    }
    const v = parseFloat(cs[prop]) || 0;
    return v;
  };
  const out = { samples: {}, targetFound: false };
  const el = document.querySelector(cfg.target);
  if (!el) return out;
  out.targetFound = true;
  for (const prop of cfg.props) out.samples[prop] = [];
  for (let i = 0; i < N; i++) {
    const y = cfg.start + ((cfg.end - cfg.start) * i) / (N - 1);
    seat(Math.max(0, Math.round(y)));
    await sleep(90); /* lenis settle + a raf */
    for (const prop of cfg.props) out.samples[prop].push(readProp(el, prop));
  }
  seat(0);
  await sleep(150);
  return out;
}
`;

/** Deviation between two normalized curves: max |a-b| at the 11 points,
 *  where normalization maps each curve's [min,max] to [0,1]. Tolerance
 *  0.05 (5% of range) per the round brief. */
export function curveDeviation(a, b) {
  const norm = (xs) => {
    const min = Math.min(...xs), max = Math.max(...xs);
    return max - min < 1e-6 ? xs.map(() => 0) : xs.map((x) => (x - min) / (max - min));
  };
  const na = norm(a), nb = norm(b);
  let max = 0;
  for (let i = 0; i < na.length; i++) max = Math.max(max, Math.abs(na[i] - nb[i]));
  return max;
}

/** extract: freeze Heron's scrub curves (run once, from a machine that can
 *  reach heronaiapp.com). Reads _motion.<bp>.json for scrub triggers +
 *  the tween properties their timelines animate, then samples live. */
export async function extract(bps, url = "https://heronaiapp.com/") {
  const browser = await chromium.launch({ headless: true });
  const all = {};
  try {
    for (const bp of BPS.filter((b) => bps.includes(b.name))) {
      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForTimeout(4000); /* loader + lenis boot */
      const motion = JSON.parse(readFileSync(join(SPEC_DIR, `_motion.${bp.name}.json`), "utf8"));
      const scrubTriggers = (motion.triggers || []).filter((t) => t.scrub && t.end > t.start + 50);
      const curves = [];
      for (const t of scrubTriggers.slice(0, 12)) {
        /* properties: from the tweens whose target sits inside the trigger */
        const props = new Set();
        for (const tw of motion.tweens || []) {
          if (tw.target && tw.target.startsWith(t.trigger.split(" > ")[0]) && tw.vars) {
            for (const k of Object.keys(tw.vars)) {
              if (["opacity", "x", "y", "scale", "rotate", "width", "height"].includes(k)) props.add(k);
            }
          }
        }
        if (!props.size) continue;
        const cfg = { target: t.trigger, start: t.start, end: t.end, props: [...props] };
        const s = await page.evaluate(SAMPLE_JS, cfg).catch(() => null);
        if (s && s.targetFound) curves.push({ trigger: t.trigger, start: t.start, end: t.end, props: [...props], samples: s.samples });
      }
      all[bp.name] = { meta: { bp: bp.name, url, extractedAt: new Date().toISOString(), source: "_motion scrub triggers + live sampling" }, curves };
      await page.close();
      console.log(`scroll-curves ${bp.name}: ${curves.length} curves frozen`);
    }
  } finally {
    await browser.close();
  }
  for (const [bp, data] of Object.entries(all)) {
    writeFileSync(CURVES_FILE(bp), JSON.stringify(data));
  }
  console.log("frozen →", Object.keys(all).map(CURVES_FILE).join(", "));
}

/** assert: compare our curves to the frozen ones. Returns per-bp results
 *  in the same {pass, fail, failures[]} shape run.mjs consumes. */
export async function assert(url, bps) {
  const browser = await chromium.launch({ headless: true });
  const out = { pass: 0, fail: 0, failures: [] };
  try {
    for (const bp of BPS.filter((b) => bps.includes(b.name))) {
      const frozenPath = CURVES_FILE(bp.name);
      if (!existsSync(frozenPath)) { out.failures.push({ bp: bp.name, kind: "scroll-curve", error: "no-frozen-curves" }); out.fail++; continue; }
      const frozen = JSON.parse(readFileSync(frozenPath, "utf8"));
      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2500);
      for (const c of frozen.curves) {
        const s = await page.evaluate(SAMPLE_JS, { target: c.trigger, start: c.start, end: c.end, props: c.props }).catch(() => null);
        if (!s || !s.targetFound) {
          out.fail++;
          out.failures.push({ bp: bp.name, kind: "scroll-curve", trigger: c.trigger, error: "no-counterpart", expected: "an element conforming to the scrub target", actual: "target not found" });
          continue;
        }
        for (const prop of c.props) {
          const dev = curveDeviation(c.samples[prop], s.samples[prop]);
          if (dev <= 0.05) out.pass++;
          else {
            out.fail++;
            out.failures.push({ bp: bp.name, kind: "scroll-curve", trigger: c.trigger, prop, expected: "shape within 5% of range", actual: `deviation ${(dev * 100).toFixed(1)}%`, delta: Math.round(dev * 1000) / 1000 });
          }
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** scroll-feel assertions (offline, vs _page.<bp>.json) — exported for
 *  run.mjs to fold into the matrix. */
export async function feel(url, bps) {
  const browser = await chromium.launch({ headless: true });
  const out = { pass: 0, fail: 0, failures: [] };
  try {
    for (const bp of BPS.filter((b) => bps.includes(b.name))) {
      let spec;
      try { spec = JSON.parse(readFileSync(join(SPEC_DIR, `_page.${bp.name}.json`), "utf8")); } catch { continue; }
      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2000);
      const got = await page.evaluate(() => ({
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        bodyScrollBehavior: getComputedStyle(document.body).scrollBehavior,
        scrollRestoration: "scrollRestoration" in history ? history.scrollRestoration : "unknown",
        lenisLive: !!(window.__mdrkLenis && (window.__mdrkLenis.scrollTo || window.__mdrkLenis.on)),
        scrollerIsWindow: window.scrollY === 0 ? document.documentElement.scrollHeight > window.innerHeight : true,
        stickyTops: [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).position === "sticky").slice(0, 30).map((el) => ({ cls: (el.className || "").toString().slice(0, 40), top: getComputedStyle(el).top })),
        deadAnchors: [...document.querySelectorAll('a[href^="#"]')].filter((a) => {
          const id = a.getAttribute("href").slice(1);
          return id && !document.getElementById(id) && !document.querySelector(`[name="${id}"]`);
        }).map((a) => a.getAttribute("href")),
      }));
      const chk = (kind, pass, expected, actual) => {
        pass ? out.pass++ : (out.fail++, out.failures.push({ bp: bp.name, kind: `scroll:${kind}`, expected, actual }));
      };
      const wantSmooth = spec.lenis?.[0]?.smoothWheel ?? true;
      chk("lenis-live+smoothWheel", got.lenisLive === wantSmooth, `lenis live=${wantSmooth}`, `live=${got.lenisLive}`);
      chk("scroll-behavior-auto", got.scrollBehavior === "auto" && got.bodyScrollBehavior === "auto", "auto/auto", `${got.scrollBehavior}/${got.bodyScrollBehavior}`);
      chk("scrollRestoration-manual", got.scrollRestoration === "manual", "manual", String(got.scrollRestoration));
      chk("scroller-is-window", got.scrollerIsWindow, "window scrolls", "custom scroller");
      chk("no-dead-anchors", got.deadAnchors.length === 0, "0 dead", JSON.stringify(got.deadAnchors.slice(0, 5)));
      for (const st of got.stickyTops) {
        const v = parseFloat(st.top) || 0;
        chk(`sticky-top(${st.cls.slice(0, 20)})`, v === 0 || (v >= 40 && v <= 120), "0 or header-band 40–120px", st.top);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

// CLI: extract (needs live Heron) | feel | assert
if (process.argv[1] && process.argv[1].endsWith("scroll.mjs")) {
  const mode = process.argv[2] ?? "assert";
  const bps = (process.argv.find((a, i) => process.argv[i - 1] === "--bps")?.split(",")) ?? BPS.map((b) => b.name);
  const url = process.argv.find((a, i) => process.argv[i - 1] === "--url") ?? "http://localhost:5173/";
  if (mode === "extract") {
    await extract(bps, process.argv.find((a, i) => process.argv[i - 1] === "--heron") ?? "https://heronaiapp.com/");
  } else if (mode === "feel") {
    const r = await feel(url, bps);
    console.log(JSON.stringify({ pass: r.pass, fail: r.fail, failures: r.failures.slice(0, 20) }, null, 1));
    process.exit(r.fail ? 1 : 0);
  } else {
    const r = await assert(url, bps);
    console.log(JSON.stringify({ pass: r.pass, fail: r.fail, failures: r.failures.slice(0, 20) }, null, 1));
    process.exit(r.fail ? 1 : 0);
  }
}
