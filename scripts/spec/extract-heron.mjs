#!/usr/bin/env node
/**
 * extract-heron.mjs — R335 Phase 1a: freeze Heron into machine-checkable specs.
 *
 * Measures (never copies) the live site at each breakpoint and writes JSON specs:
 *   <section>.<bp>.json   — element tree: role paths, geometry, type, colour, spacing,
 *                           opacity/transform, interactivity, CSS transitions/animations,
 *                           :hover deltas
 *   _page.<bp>.json       — scroll geometry: per-section tops/heights in vh, pin marks,
 *                           Lenis params, wrap diagnostics
 *   _motion.<bp>.json     — recorded (not guessed) motion: ScrollTrigger table, gsap
 *                           tweens (setup-time + scroll-time), targets as role paths
 *
 * Schema + tolerances live in scripts/spec/README.md. The specs are COMMITTED; the
 * conformance suite (scripts/conformance/) runs against the frozen JSON with NO live
 * Heron dependency.
 *
 * Usage:
 *   node scripts/spec/extract-heron.mjs --sections home-hero-wrap,footer --bps 1440,390 \
 *        --out docs/redesign/r335/heron-spec
 *
 * Reproduces measured PARAMETERS only — no Heron assets, text, images or fonts are
 * written into the specs (text is reduced to a length class; images to a density flag).
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
// playwright is a pinned devDependency of frontend/ (E2E) — resolve from there.
const require2 = createRequire(join(REPO, "frontend", "package.json"));
const { chromium } = require2("playwright");

const HERON = "https://heronaiapp.com/";

/** Sections (spec of record: docs/redesign/r331/heron-program.json pageMap).
 *  The <home-*-wrap> custom elements are zero-height hosts; the rendered
 *  blocks are div.<name> (verified live in R331 probe-1440.json). */
const SECTIONS = [
  "home-hero-wrap",
  "home-intro-wrap",
  "home-problem-wrap",
  "home-map-wrap",
  "home-platform-wrap",
  "home-why-wrap",
  "home-usecase-wrap",
  "home-cta-wrap",
  "footer",
];
const BPS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 844 },
];

// ── args ────────────────────────────────────────────────────────────────────
function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
}
const sectionsArg = arg("sections", null);
const bpsArg = arg("bps", null);
const outArg = arg("out", "docs/redesign/r335/heron-spec");
// absolute --out must win over REPO (path.join would concatenate, not reset)
const OUT = outArg.startsWith("/") ? outArg : join(REPO, outArg);
const SECTIONS_WANTED = sectionsArg ? sectionsArg.split(",").map((s) => s.trim()) : SECTIONS;
const BPS_WANTED = bpsArg ? bpsArg.split(",").map((b) => b.trim()) : BPS.map((b) => b.name);

mkdirSync(OUT, { recursive: true });

// ── the in-page instrumentation (runs BEFORE Heron's own scripts) ───────────
const INIT_JS = String.raw`
(() => {
  const SPEC = (window.__SPEC = { tweens: [], triggers: [], lenis: [], wrapErr: [] });

  // role path for an element: <wrap-key> > tag[n] chain (stable, section-relative)
  function pathOf(el) {
    if (!el || el.nodeType !== 1) return String(el && el.tagName ? el.tagName : el);
    const wrap = el.closest('[class*="-wrap"], footer, header');
    const root = wrap || document.body;
    const segs = [];
    let n = el;
    while (n && n !== root.parentElement && segs.length < 8) {
      const tag = n.tagName.toLowerCase();
      let idx = 1, sib = n;
      while (sib && (sib = sib.previousElementSibling)) idx++;
      segs.unshift(tag + "[" + idx + "]");
      n = n.parentElement;
    }
    const key = wrap ? (wrap.tagName.toLowerCase() + "." + String(wrap.className || "").split(/\s+/)[0]) : "body";
    return key + " > " + segs.join(" > ");
  }

  function describe(targets) {
    try {
      if (typeof targets === "string") return { sel: targets };
      const arr = targets && targets.length !== undefined && !(targets instanceof Element)
        ? Array.from(targets).slice(0, 6) : [targets];
      const out = [];
      for (const t of arr) {
        if (t instanceof Element) out.push(pathOf(t));
        else if (t && t.targets) out.push({ nested: true });
        else out.push({ other: typeof t });
      }
      return out.length === 1 ? out[0] : out;
    } catch (e) { return { err: String(e) }; }
  }

  const VARS_KEEP = ["duration","delay","ease","stagger","autoAlpha","opacity","y","yPercent","x","xPercent",
    "scale","scaleX","scaleY","rotate","rotateX","rotateY","width","height","left","top","right","bottom",
    "clipPath","backgroundColor","color","borderRadius","scrollTrigger","text","snap","repeat","yoyo",
    "startAt","keyframes","attr","morphSVG","drawSVG","letterSpacing","lineHeight","fontSize","marginTop","translateX"];
  function pick(vars) {
    const out = {};
    if (!vars || typeof vars !== "object") return out;
    for (const k of VARS_KEEP) if (k in vars) out[k] = vars[k];
    if (out.scrollTrigger && typeof out.scrollTrigger === "object") {
      const st = out.scrollTrigger, keep = {};
      for (const k of ["trigger","start","end","scrub","pin","pinSpacing","toggleActions","anticipatePin","markers"]) {
        if (k in st) {
          const v = st[k];
          keep[k] = v instanceof Element ? pathOf(v) : v;
        }
      }
      out.scrollTrigger = keep;
    }
    return out;
  }

  let gsapWrapped = false, lenisWrapped = false;
  function wrapGsap(g) {
    if (!g || gsapWrapped) return;
    gsapWrapped = true;
    for (const m of ["to", "from", "fromTo", "set"]) {
      const orig = g[m] && g[m].bind(g);
      if (!orig) continue;
      g[m] = (targets, vars, ...rest) => {
        try {
          if (vars && typeof vars === "object") {
            SPEC.tweens.push({ method: m, target: describe(targets), vars: pick(vars), at: Math.round(performance.now()) });
          }
        } catch (e) { SPEC.wrapErr.push("gsap." + m + ": " + e); }
        return orig(targets, vars, ...rest);
      };
    }
    const origTimeline = g.timeline && g.timeline.bind(g);
    if (origTimeline) {
      g.timeline = (vars, ...rest) => {
        try {
          if (vars && typeof vars === "object") SPEC.tweens.push({ method: "timeline", target: { timeline: true }, vars: pick(vars), at: Math.round(performance.now()) });
        } catch (e) {}
        return origTimeline(vars, ...rest);
      };
    }
    // ScrollTrigger: prefer the global table (getAll), no wrapping needed
    const ST = window.ScrollTrigger || (g.core && g.core.plugins && g.core.plugins.scrollTrigger) || (g.plugins && g.plugins.scrollTrigger);
    if (ST && ST.getAll) {
      window.__SPEC_getTriggers = () => {
        try {
          return ST.getAll().map((t) => ({
            trigger: t.trigger instanceof Element ? pathOf(t.trigger) : String(t.trigger),
            start: t.start, end: t.end,
            scrub: !!(t.vars && t.vars.scrub),
            scrubVal: t.vars && t.vars.scrub !== undefined ? t.vars.scrub : null,
            pin: !!t.pin,
            pinSpacing: t.vars ? t.vars.pinSpacing !== false : true,
            toggleActions: t.vars ? t.vars.toggleActions || null : null,
            anticipatePin: t.vars ? t.vars.anticipatePin || 0 : 0,
            animationDuration: t.animation && t.animation.duration ? Number(t.animation.duration().toFixed(3)) : null,
          }));
        } catch (e) { return [{ err: String(e) }]; }
      };
    } else {
      SPEC.wrapErr.push("ScrollTrigger global not reachable");
    }
  }

  function wrapLenis(L) {
    if (!L || lenisWrapped) return;
    lenisWrapped = true;
    const Orig = L;
    window.Lenis = function (opts, ...rest) {
      SPEC.lenis.push({
        lerp: opts && opts.lerp, duration: opts && opts.duration,
        easing: opts && opts.easing ? String(opts.easing) : null,
        wheelMultiplier: opts && opts.wheelMultiplier, smoothWheel: opts && opts.smoothWheel,
      });
      return new Orig(opts, ...rest);
    };
    window.Lenis.prototype = Orig.prototype;
  }

  const poll = setInterval(() => {
    try {
      if (window.gsap) wrapGsap(window.gsap);
      if (window.Lenis) wrapLenis(window.Lenis);
      if (gsapWrapped && (lenisWrapped || performance.now() > 20000)) clearInterval(poll);
    } catch (e) {}
  }, 40);
})();
`;

// ── in-page measurement helpers ─────────────────────────────────────────────
const WALK_JS = String.raw`
() => {
  const px = (v) => (v && String(v).endsWith("px") ? Math.round(parseFloat(v) * 100) / 100 : v === "0px" ? 0 : v);
  function textClass(el) {
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const len = own.length;
    return len === 0 ? "none" : len < 24 ? "short" : len < 80 ? "medium" : "long";
  }
  function decompose(tr) {
    if (!tr || tr === "none" || tr === "matrix(1, 0, 0, 1, 0, 0)") return null;
    const m = tr.match(/matrix\(([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\)/);
    if (!m) return tr;
    const a = Number(m[1]), b = Number(m[2]), e = Number(m[5]), f = Number(m[6]);
    return { tx: Math.round(e * 100) / 100, ty: Math.round(f * 100) / 100, scale: Math.round(Math.sqrt(a * a + b * b) * 1000) / 1000, rotateDeg: Math.round(((Math.atan2(b, a) * 180) / Math.PI) * 10) / 10 };
  }
  function makeWalk(wrapEl, wrapKey, out) {
    const wr = wrapEl.getBoundingClientRect();
    const walk = (el, depth) => {
      if (out.length > 2200 || el.nodeType !== 1) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && el.children.length === 0) return;
      const segs = [];
      let n = el;
      const stop = wrapEl.parentElement;
      while (n && n !== stop && segs.length < 6) {
        let idx = 1, sib = n;
        while ((sib = sib.previousElementSibling)) idx++;
        segs.unshift(n.tagName.toLowerCase() + "[" + idx + "]");
        n = n.parentElement;
      }
      const interactive = el.tagName === "A" || el.tagName === "BUTTON" || cs.cursor === "pointer" || el.getAttribute("role") === "button";
      out.push({
        p: wrapKey + " > " + segs.join(" > "),
        tag: el.tagName.toLowerCase(),
        tc: textClass(el),
        leaf: el.children.length === 0,
        vr: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        sr: { x: Math.round(r.left - wr.left), y: Math.round(r.top - wr.top), w: Math.round(r.width), h: Math.round(r.height) },
        fs: px(cs.fontSize), lh: px(cs.lineHeight), fw: cs.fontWeight, ls: px(cs.letterSpacing),
        ff: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        color: cs.color, bg: cs.backgroundColor, bgImg: cs.backgroundImage !== "none",
        border: cs.borderTopWidth !== "0px" ? { w: px(cs.borderTopWidth), c: cs.borderTopColor, style: cs.borderTopStyle } : null,
        radius: px(cs.borderTopLeftRadius),
        pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px),
        margin: [cs.marginTop, cs.marginBottom].map(px),
        gap: px(cs.gap),
        opacity: Number(cs.opacity),
        transform: decompose(cs.transform),
        interactive,
        transition: cs.transitionProperty !== "all" || cs.transitionDuration !== "0s"
          ? { p: cs.transitionProperty, d: cs.transitionDuration, e: cs.transitionTimingFunction } : null,
        anim: cs.animationName !== "none" ? { name: cs.animationName, d: cs.animationDuration, iter: cs.animationIterationCount } : null,
      });
      for (const c of el.children) walk(c, depth + 1);
    };
    return walk;
  }
  function collectInteractive(el) {
    const all = [];
    const walk2 = (n) => { if (n.nodeType === 1) { const cs = getComputedStyle(n); if (n.tagName === "A" || n.tagName === "BUTTON" || cs.cursor === "pointer" || n.getAttribute("role") === "button") all.push(n); for (const c of n.children) walk2(c); } };
    walk2(el);
    return all;
  }
  return { makeWalk, collectInteractive };
}
`;

async function extractBreakpoint(bp, sectionKeys, browser) {
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
  await page.addInitScript(INIT_JS);
  const t0 = Date.now();
  await page.goto(HERON, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".main-inner", { timeout: 30000 });
  await page.waitForTimeout(4500); // intro animations + SplitText settle

  const motionSetup = await page.evaluate(() =>
    JSON.parse(JSON.stringify({
      tweens: (window.__SPEC || {}).tweens || [],
      lenis: (window.__SPEC || {}).lenis || [],
      wrapErr: (window.__SPEC || {}).wrapErr || [],
      hasTriggerTable: typeof window.__SPEC_getTriggers === "function",
    })),
  );

  // ── scroll geometry + scroll-time motion: walk the scroller ───────────────
  const geometry = await page.evaluate(async () => {
    const scroller = document.querySelector(".main-inner");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const max = scroller.scrollHeight - scroller.clientHeight;
    const steps = 70;
    const marks = [];
    const wrapKeys = Array.from(document.querySelectorAll("div[class*='-wrap'], footer, header"))
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => ({ el, key: el.tagName.toLowerCase() + "." + String(el.className || "").split(/\s+/)[0] }));
    for (let i = 0; i <= steps; i++) {
      scroller.scrollTop = Math.round((max * i) / steps);
      await sleep(120);
      const y = scroller.scrollTop;
      const vh = window.innerHeight;
      const row = { y, sections: [] };
      for (const { el, key } of wrapKeys) {
        const r = el.getBoundingClientRect();
        if (r.height > 0) row.sections.push({ key, topVh: Math.round((r.top / vh) * 1000) / 1000, hVh: Math.round((r.height / vh) * 1000) / 1000 });
      }
      marks.push(row);
    }
    return { maxScroll: max, vh: window.innerHeight, scrollHeight: scroller.scrollHeight, marks };
  });

  const motionScroll = await page.evaluate(() => ({
    tweens: ((window.__SPEC || {}).tweens || []).slice(),
    triggers: typeof window.__SPEC_getTriggers === "function" ? window.__SPEC_getTriggers() : [],
  }));

  // ── per-section DOM walks (back at scroll 0) ───────────────────────────────
  await page.evaluate(() => { document.querySelector(".main-inner").scrollTop = 0; });
  await page.waitForTimeout(600);

  const perSection = {};
  for (const key of sectionKeys) {
    const data = await page.evaluate(({ key, WALK }) => {
      const { makeWalk, collectInteractive } = new Function("return (" + WALK + ")")()();
      const el = document.querySelector("div." + CSS.escape(key)) || document.querySelector(CSS.escape(key));
      if (!el) return { missing: true };
      const out = [];
      makeWalk(el, key, out)(el, 0);
      const interactiveCount = collectInteractive(el).length;
      return { elements: out, rect: el.getBoundingClientRect().toJSON(), interactiveCount };
    }, { key, WALK: WALK_JS });
    if (data.missing) {
      perSection[key] = { missing: true };
      continue;
    }

    // hover deltas for interactive elements (cap 36 per section)
    const hovers = [];
    const hoverCount = Math.min(data.interactiveCount, 36);
    for (let idx = 0; idx < hoverCount; idx++) {
      try {
        const handle = await page.evaluateHandle(({ key, idx, WALK }) => {
          const { collectInteractive } = new Function("return (" + WALK + ")")()();
          const el = document.querySelector("div." + CSS.escape(key)) || document.querySelector(CSS.escape(key));
          return collectInteractive(el)[idx];
        }, { key, idx, WALK: WALK_JS });
        const el = handle.asElement();
        if (!el) { hovers.push({ i: idx, hover: null }); continue; }
        const path = await page.evaluate(({ n, i }) => {
          const wrap = n.closest('[class*="-wrap"], footer, header');
          return (wrap ? wrap.tagName.toLowerCase() + "." + wrap.className.split(/\s+/)[0] : "body") + " > interactive[" + i + "]";
        }, { n: el, i: idx }).catch(() => "unknown");
        const before = await el.evaluate((n) => { const cs = getComputedStyle(n); return { color: cs.color, bg: cs.backgroundColor, tr: cs.transform, op: cs.opacity, bd: cs.borderColor, sh: cs.boxShadow }; });
        await el.hover({ timeout: 3000 });
        await page.waitForTimeout(420);
        const after = await el.evaluate((n) => { const cs = getComputedStyle(n); return { color: cs.color, bg: cs.backgroundColor, tr: cs.transform, op: cs.opacity, bd: cs.borderColor, sh: cs.boxShadow }; });
        await page.mouse.move(0, 0);
        await page.waitForTimeout(120);
        hovers.push({ p: path, hover: { before, after } });
      } catch (e) {
        hovers.push({ i: idx, hover: { err: String(e).slice(0, 120) } });
      }
    }
    perSection[key] = {
      elements: data.elements,
      rectVh: Math.round((data.rect.height / bp.height) * 1000) / 1000,
      interactiveCount: data.interactiveCount,
      hovers,
    };
  }

  await page.close();
  return { bp: bp.name, tookMs: Date.now() - t0, motionSetup, motionScroll, geometry, perSection };
}

// ── main ────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
try {
  for (const bp of BPS.filter((b) => BPS_WANTED.includes(b.name))) {
    process.stdout.write(`▸ ${bp.name} … `);
    const res = await extractBreakpoint(bp, SECTIONS_WANTED, browser);
    for (const key of SECTIONS_WANTED) {
      const sec = res.perSection[key];
      if (!sec) continue;
      writeFileSync(
        join(OUT, `${key}.${bp.name}.json`),
        JSON.stringify({ meta: { bp: bp.name, url: HERON, extractedAt: new Date().toISOString() }, ...sec }, null, 1),
      );
    }
    const pageJson = {
      meta: { bp: bp.name, url: HERON, extractedAt: new Date().toISOString() },
      scrollHeight: res.geometry.scrollHeight,
      maxScroll: res.geometry.maxScroll,
      vh: res.geometry.vh,
      marks: res.geometry.marks,
      lenis: res.motionSetup.lenis,
      wrapErr: res.motionSetup.wrapErr,
      hasTriggerTable: res.motionSetup.hasTriggerTable,
    };
    writeFileSync(join(OUT, `_page.${bp.name}.json`), JSON.stringify(pageJson, null, 1));
    const seen = new Set();
    const tweens = [];
    for (const t of [...res.motionSetup.tweens, ...res.motionScroll.tweens]) {
      const sig = JSON.stringify([t.method, t.target, t.vars]);
      if (seen.has(sig)) continue;
      seen.add(sig);
      tweens.push(t);
    }
    const motionJson = {
      meta: { bp: bp.name, url: HERON, extractedAt: new Date().toISOString() },
      triggers: res.motionScroll.triggers,
      tweens,
    };
    writeFileSync(join(OUT, `_motion.${bp.name}.json`), JSON.stringify(motionJson, null, 1));
    process.stdout.write(`tweens=${tweens.length} triggers=${(res.motionScroll.triggers || []).length} ${res.tookMs}ms\n`);
  }
} finally {
  await browser.close();
}
