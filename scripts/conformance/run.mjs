#!/usr/bin/env node
/**
 * run.mjs — R336 conformance suite runner (v2 — honest instrument).
 *
 * Compares OUR landing page (http://localhost:5173, React/Vite, RTL Arabic)
 * against the FROZEN Heron specs in docs/redesign/r335/heron-spec/ —
 * deterministic, machine-checkable, NO live Heron dependency, NO screenshots.
 *
 * v2 (the R336 instrument fix — a pass-rate built on unmatched elements and
 * waivers is a self-graded metric):
 *   · MATCHING: explicit-first. (a) data-spec hooks: our elements carrying
 *     data-spec="<section>.<role>" map to the spec role path via the
 *     mapping's "spec" field; (b) legacy explicit selectors; (c) heuristic
 *     (tag+tc ordinal) ONLY for elements the mapping marks heuristic-ok.
 *     Every UNMATCHED spec element is reported as a FAIL row of kind
 *     `no-counterpart` (with its role path) unless the mapping lists it in
 *     "noCounterpart" with a reason (then it is counted as excused and
 *     reported by name — never silently dropped).
 *   · TOLERANCES: transformed expectations (tolerances.mjs v2) — the Arabic
 *     adaptations assert, they do not waive. exceptions.json keeps only
 *     true waivers (tc ±1 class today), capped <5%.
 *   · MATRIX: one report covers every section × every breakpoint requested
 *     (default all 9 sections × all 5 bps); results.json carries the full
 *     per-cell detail plus mapping quality (explicit/heuristic/unmatched/
 *     excused counts per cell).
 *   · GATE: `--gate` compares the overall pass-rate against the RATCHET file
 *     (ratchet.json, committed) — the run fails if the rate is below the
 *     ratchet; after a green run with `--ratchet` the file updates to the
 *     new rate (monotonic — the number may never drop).
 *
 * Usage:
 *   node scripts/conformance/run.mjs                            # 9 sections × 5 bps
 *   node scripts/conformance/run.mjs --sections home-hero-wrap,footer --bps 1440,390
 *   node scripts/conformance/run.mjs --gate                     # CI: exit 1 below ratchet
 *   node scripts/conformance/run.mjs --ratchet                  # raise ratchet to current rate
 *   node scripts/conformance/run.mjs --url http://localhost:5174/
 *
 * Output: console matrix + scripts/conformance/results.json.
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as T from "./tolerances.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium;
try {
  ({ chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json"))("playwright");
}

const SPEC_DIR = join(WORKTREE, "docs", "redesign", "r335", "heron-spec");
const MAPPING = readdirSync(join(__dirname, "mapping"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .reduce(
    (acc, f) => {
      const part = JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8"));
      Object.assign(acc.ourSection, part.ourSection);
      Object.assign(acc.heronPageKey ?? (acc.heronPageKey = {}), part.heronPageKey);
      Object.assign(acc.scaleFactor ?? (acc.scaleFactor = {}), part.scaleFactor);
      acc.explicit.push(...(part.explicit ?? []));
      acc.noCounterpart.push(...(part.noCounterpart ?? []));
      return acc;
    },
    { ourSection: {}, heronPageKey: {}, scaleFactor: {}, explicit: [], noCounterpart: [] },
  );
const EXCEPTIONS = JSON.parse(readFileSync(join(__dirname, "exceptions.json"), "utf8"));
const SECTIONS = Object.keys(MAPPING.ourSection);
const BPS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 844 },
];

// ── args ─────────────────────────────────────────────────────────────────────
const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const SECTIONS_WANTED = arg("sections", null)?.split(",").map((s) => s.trim()) ?? SECTIONS;
const BPS_WANTED = arg("bps", null)?.split(",").map((b) => b.trim()) ?? BPS.map((b) => b.name);
const GATE = process.argv.includes("--gate");
const RATCHET_UPDATE = process.argv.includes("--ratchet");
const RATCHET_FILE = join(__dirname, "ratchet.json");
const OUT = arg("out", join(__dirname, "results.json"));
const URL = arg("url", "http://localhost:5173/");
const unknown = SECTIONS_WANTED.filter((s) => !MAPPING.ourSection[s]);
if (unknown.length) {
  console.error(`unknown section key(s): ${unknown.join(", ")} — known: ${SECTIONS.join(", ")}`);
  process.exit(2);
}
// The noCounterpart reasons are per spec-path suffix; pre-compile.
const NO_COUNTERPART = MAPPING.noCounterpart; // [{section, heron, reason}]

// ── the in-page measurement walk (SAME shape as scripts/spec/extract-heron.mjs) ──
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
  function pathOf(el, wrapEl, wrapKey) {
    const segs = [];
    let n = el;
    const stop = wrapEl.parentElement;
    while (n && n !== stop && segs.length < 6) {
      let idx = 1, sib = n;
      while ((sib = sib.previousElementSibling)) idx++;
      segs.unshift(n.tagName.toLowerCase() + "[" + idx + "]");
      n = n.parentElement;
    }
    if (segs.length) segs[0] = segs[0].replace(/\[\d+\]$/, "[1]");
    return wrapKey + " > " + segs.join(" > ");
  }
  function makeWalk(wrapEl, wrapKey, out) {
    const walk = (el) => {
      if (out.length > 2200 || el.nodeType !== 1) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && el.children.length === 0) return;
      out.push({
        p: pathOf(el, wrapEl, wrapKey),
        tag: el.tagName.toLowerCase(),
        tc: textClass(el),
        leaf: el.children.length === 0,
        ds: el.getAttribute("data-spec") || null,
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
        interactive: el.tagName === "A" || el.tagName === "BUTTON" || cs.cursor === "pointer" || el.getAttribute("role") === "button",
        transition: cs.transitionProperty !== "all" || cs.transitionDuration !== "0s"
          ? { p: cs.transitionProperty, d: cs.transitionDuration, e: cs.transitionTimingFunction } : null,
        anim: cs.animationName !== "none" ? { name: cs.animationName, d: cs.animationDuration, iter: cs.animationIterationCount } : null,
      });
      for (const c of el.children) walk(c);
    };
    const wr = wrapEl.getBoundingClientRect();
    return walk;
  }
  return { makeWalk, pathOf };
}
`;

async function SCROLL_WALK_JS(sectionSelectors) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seat = (y) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  await sleep(200);
  const els = sectionSelectors.map((s) => ({ sel: s, el: document.querySelector(s) }));
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const vh = window.innerHeight;
  const steps = 60;
  const rows = [];
  for (let i = 0; i <= steps; i++) {
    seat(Math.round((max * i) / steps));
    await sleep(110);
    const y = window.scrollY;
    const tops = [], hs = [];
    for (const { sel, el } of els) {
      if (!el) { tops.push(null); hs.push(null); continue; }
      const r = el.getBoundingClientRect();
      tops.push(Math.round((r.top / vh) * 1000) / 1000);
      hs.push(Math.round((r.height / vh) * 1000) / 1000);
    }
    rows.push([y, tops, hs]);
  }
  seat(0);
  await sleep(400);
  return { vh, scrollHeight: document.documentElement.scrollHeight, keys: sectionSelectors, rows };
}

// ── matching v2 ───────────────────────────────────────────────────────────────
// specRole: the role key of a spec path within a section —
// "home-why-wrap > div[1] > section[1] > div[2] > h2[1]" → "div.section.div.h2"
// (tag chain, drop indices, drop the wrap key). data-spec values carry the
// same grammar: "why.title", "why.stage.1" … the mapping's "spec" field
// binds a spec path (exact or suffix) to a data-spec key.
function specPathMatches(specPath, pattern) {
  return specPath === pattern || specPath.endsWith(" > " + pattern) || pattern.endsWith(" > " + specPath);
}
function findNoCounterpartReason(section, specPath) {
  for (const nc of NO_COUNTERPART) {
    if (nc.section === section && specPathMatches(specPath, nc.heron)) return nc.reason;
  }
  return null;
}

function matchPairs(heronEls, ourEls, explicitIdx, section) {
  const pairs = [];
  const usedOurs = new Set();
  // (a) explicit (legacy selectors + data-spec resolved by the page walk)
  for (const h of heronEls) {
    const ex = explicitIdx[h.p];
    if (ex && ourEls[ex.idx] && !usedOurs.has(ex.idx)) {
      usedOurs.add(ex.idx);
      pairs.push({ h, o: ourEls[ex.idx], mode: ex.ds ? "data-spec" : "explicit", skip: new Set(ex.skip) });
    }
  }
  // (b) heuristic: same tag + same tc, ordinal within group — allowed only
  // as a fallback; every heuristic pair is reported so the debt is visible.
  const byKey = new Map();
  ourEls.forEach((o, i) => {
    if (usedOurs.has(i)) return;
    const k = o.tag + "|" + o.tc;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(i);
  });
  let heuristic = 0;
  for (const h of heronEls) {
    if (pairs.some((p) => p.h === h)) continue;
    const q = byKey.get(h.tag + "|" + h.tc);
    if (q && q.length) {
      const i = q.shift();
      usedOurs.add(i);
      pairs.push({ h, o: ourEls[i], mode: "heuristic", skip: new Set() });
      heuristic++;
    }
  }
  const unmatched = [];
  for (const h of heronEls) {
    if (pairs.some((p) => p.h === h)) continue;
    unmatched.push({ h, reason: findNoCounterpartReason(section, h.p) });
  }
  return { pairs, heuristic, explicit: pairs.length - heuristic, unmatched };
}

// ── runner ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const results = { generatedAt: new Date().toISOString(), url: URL, specDir: SPEC_DIR, summary: {}, sections: {}, failures: [], unmatchedReport: [] };
let totalPass = 0, totalFail = 0, exceptionUses = 0;
const exRules = {};
const matrix = {}; // section -> bp -> cell

try {
  for (const bp of BPS.filter((b) => BPS_WANTED.includes(b.name))) {
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    process.stdout.write(`▸ bp ${bp.name} … `);
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);

    // 1) seat-scroll walk → our columnar marks
    const ourSels = SECTIONS_WANTED.map((s) => MAPPING.ourSection[s]);
    const ourGeo = await page.evaluate(SCROLL_WALK_JS, ourSels);

    // 2) heron frozen marks
    let heronPage = null;
    try { heronPage = JSON.parse(readFileSync(join(SPEC_DIR, `_page.${bp.name}.json`), "utf8")); } catch { /* optional */ }
    const vh = heronPage?.vh || bp.height;
    const yToVhHeron = (y) => Math.round((y / vh) * 1000) / 1000;

    // 3) per-section DOM walk (now records data-spec)
    const ours = {};
    for (const key of SECTIONS_WANTED) {
      const sel = MAPPING.ourSection[key];
      const explicit = MAPPING.explicit.filter((m) => m.section === key);
      const data = await page.evaluate(({ key, sel, explicit, WALK }) => {
        const { makeWalk, pathOf } = new Function("return (" + WALK + ")")()();
        const el = document.querySelector(sel);
        if (!el) return { missing: sel };
        const out = [];
        makeWalk(el, key, out)(el);
        const explicitIdx = {};
        // legacy selector mappings
        for (const m of explicit) {
          if (m.spec) continue; // data-spec bindings handled below
          const t = m.scope === "page" ? document.querySelector(m.ours) : el.querySelector(m.ours) || (el.matches(m.ours) ? el : null);
          if (!t) continue;
          const p = t === el ? key + " > " + t.tagName.toLowerCase() + "[1]" : pathOf(t, el, key);
          const i = out.findIndex((e) => e.p === p);
          if (i >= 0) explicitIdx[m.heron] = { idx: i, skip: m.skip || [] };
        }
        // data-spec bindings: mapping "spec" = spec path (exact/suffix),
        // "ours" = the data-spec key ("why.title")
        for (const m of explicit) {
          if (!m.spec) continue;
          const i = out.findIndex((e) => e.ds === m.ours || (e.ds && e.ds === key + "." + m.ours));
          if (i >= 0) explicitIdx[m.heron] = { idx: i, skip: m.skip || [], ds: true };
        }
        return { elements: out, rectVh: Math.round((el.getBoundingClientRect().height / window.innerHeight) * 1000) / 1000, explicitIdx };
      }, { key, sel, explicit, WALK: WALK_JS });
      ours[key] = data;
    }
    await page.close();

    // 4) compare
    for (const key of SECTIONS_WANTED) {
      const scaleFactor = MAPPING.scaleFactor?.[key] ?? 1.0;
      let spec;
      try { spec = JSON.parse(readFileSync(join(SPEC_DIR, `${key}.${bp.name}.json`), "utf8")); } catch { spec = null; }
      const o = ours[key];
      const cell = (matrix[key] ??= {})[bp.name] ??= { pass: 0, fail: 0, exceptions: 0, explicit: 0, dataSpec: 0, heuristic: 0, unmatched: 0, excused: 0, missing: null };

      if (!spec || spec.missing) { cell.missing = "no-heron-spec"; continue; }
      if (o.missing) { cell.missing = `no-our-container:${o.missing}`; continue; }

      const { pairs, heuristic, explicit, unmatched } = matchPairs(spec.elements, o.elements, o.explicitIdx, key);
      cell.heuristic = heuristic;
      cell.explicit = pairs.filter((p) => p.mode === "explicit").length;
      cell.dataSpec = pairs.filter((p) => p.mode === "data-spec").length;
      cell.unmatched = unmatched.filter((u) => !u.reason).length;
      cell.excused = unmatched.filter((u) => !!u.reason).length;

      const run = (h, oEl, skip, heronPath, oursSel) => {
        const checks = [];
        if (!skip.has("tag")) checks.push(T.aTag(h, oEl));
        if (!skip.has("tc")) checks.push(T.aTc(h, oEl));
        if (!skip.has("geometry")) {
          checks.push(T.aX(h, oEl, bp.width));
          checks.push(T.aY(h, oEl, bp.height));
          checks.push(T.aW(h, oEl, bp.width));
          checks.push(T.aH(h, oEl, bp.height));
        }
        if (!skip.has("type")) {
          checks.push(T.aFs(h, oEl, scaleFactor));
          checks.push(T.aLh(h, oEl, scaleFactor));
          checks.push(T.aFw(h, oEl));
          checks.push(T.aLs(h, oEl));
        }
        if (!skip.has("color")) {
          checks.push(T.aColor(h, oEl));
          checks.push(T.aBg(h, oEl));
        }
        checks.push(T.aRadius(h, oEl), T.aOpacity(h, oEl), T.aBorder(h, oEl), T.aInteractive(h, oEl), T.aTransition(h, oEl));
        for (const c of checks) {
          if (!c) continue;
          if (c.pass) cell.pass++;
          else {
            cell.fail++;
            results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath, oursSelector: oursSel, mode: oursSel.startsWith("#hm:") ? "heuristic" : (oursSel.startsWith("#ds:") ? "data-spec" : "explicit"), expected: c.expected, actual: c.actual, delta: Math.round(c.delta * 100) / 100 });
          }
          if (c.exception) { cell.exceptions++; exceptionUses++; if (c.rule) exRules[c.rule] = (exRules[c.rule] || 0) + 1; }
        }
      };
      for (const { h, o: oEl, mode, skip } of pairs) {
        run(h, oEl, skip, h.p, mode === "heuristic" ? `#hm:${h.tag}.${h.tc}` : mode === "data-spec" ? `#ds:${oEl.ds}` : (oEl.p || MAPPING.ourSection[key]));
      }

      // v2: every unmatched spec element is a FAILURE by default — either a
      // real gap (kind no-counterpart, fix by adding the element + mapping)
      // or excused with a written reason (counted, reported, never silent).
      for (const { h, reason } of unmatched) {
        if (reason) {
          results.unmatchedReport.push({ section: key, bp: bp.name, heronPath: h.p, excused: true, reason });
        } else {
          cell.fail++;
          results.failures.push({ section: key, bp: bp.name, kind: "no-counterpart", heronPath: h.p, oursSelector: "(none)", mode: "unmatched", expected: "an element conforming to the spec role", actual: "no counterpart element", delta: 0 });
        }
      }

      // page-level: section height vh + pin spans
      if (heronPage?.marks && MAPPING.heronPageKey[key]) {
        const hk = heronPage.marks.keys.indexOf(MAPPING.heronPageKey[key]);
        const ok = ourGeo.keys.indexOf(MAPPING.ourSection[key]);
        if (hk >= 0 && ok >= 0) {
          const row0h = heronPage.marks.rows.find((r) => r[0] === 0) || heronPage.marks.rows[0];
          const hVh0 = row0h[2][hk], oVh0 = ourGeo.rows[0][2][ok];
          if (hVh0 != null && oVh0 != null) {
            const c = T.aSectionVh(hVh0, oVh0);
            c.pass ? cell.pass++ : (cell.fail++, results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath: MAPPING.heronPageKey[key], oursSelector: MAPPING.ourSection[key], expected: c.expected, actual: c.actual, delta: Math.round(c.delta * 100) / 100 }));
          }
          const hSpans = T.pinSpans(heronPage.marks, hk, yToVhHeron);
          const oSpans = T.pinSpans({ rows: ourGeo.rows }, ok, (y) => Math.round((y / ourGeo.vh) * 1000) / 1000);
          const n = Math.max(hSpans.length, oSpans.length);
          for (let i = 0; i < n; i++) {
            const c = T.aPinSpan(hSpans[i] || null, oSpans[i] || null);
            if (!c) continue;
            c.pass ? cell.pass++ : (cell.fail++, results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath: `${MAPPING.heronPageKey[key]}#pin${i}`, oursSelector: MAPPING.ourSection[key], expected: JSON.stringify(c.expected), actual: JSON.stringify(c.actual), delta: Math.round(c.delta * 100) / 100 }));
          }
        }
      }
      totalPass += cell.pass; totalFail += cell.fail;
    }
    process.stdout.write(`${Date.now() - t0}ms\n`);
  }
} finally {
  await browser.close();
}

// ── summary + report ─────────────────────────────────────────────────────────
const total = totalPass + totalFail;
const rate = total ? Math.round((totalPass / total) * 1000) / 10 : 0;
const exRate = total ? Math.round((exceptionUses / total) * 1000) / 10 : 0;

// ratchet (gate mode): the committed floor; --ratchet raises it to the
// current rate (monotonic — write only if higher).
let ratchetValue = null;
if ((GATE || RATCHET_UPDATE) && existsSync(RATCHET_FILE)) {
  try { ratchetValue = JSON.parse(readFileSync(RATCHET_FILE, "utf8")).rate ?? null; } catch { ratchetValue = null; }
}
let gateVerdict = "report-only";
if (GATE) {
  gateVerdict = ratchetValue == null ? `PASS(no-ratchet-yet,${rate}%)` : (rate >= ratchetValue ? "PASS" : "FAIL");
}
if (RATCHET_UPDATE && (ratchetValue == null || rate > ratchetValue)) {
  writeFileSync(RATCHET_FILE, JSON.stringify({ rate, total, pass: totalPass, fail: totalFail, updatedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`ratchet ${ratchetValue == null ? "created" : `${ratchetValue}→${rate}`}`);
}

results.summary = {
  total, pass: totalPass, fail: totalFail, passRate: rate,
  exceptionUses, exceptionRate: exRate, exceptionCap: "<5%", exceptionRules: exRules,
  unmatchedFailures: results.failures.filter((f) => f.kind === "no-counterpart").length,
  gate: gateVerdict, ...(ratchetValue != null ? { ratchet: ratchetValue } : {}),
};
for (const key of SECTIONS_WANTED) {
  results.sections[key] = {};
  for (const bpName of BPS_WANTED) {
    const c = matrix[key]?.[bpName];
    if (!c) continue;
    const n = c.pass + c.fail;
    results.sections[key][bpName] = { passRate: n ? Math.round((c.pass / n) * 1000) / 10 : 0, n, ...c };
  }
}
results.failures.sort((a, b) => b.delta - a.delta).splice(800);

// console matrix
const col = (s) => String(s).padEnd(9);
console.log("\nR336 conformance v2 — OUR page vs frozen Heron spec (" + URL + ")");
console.log(col("section") + BPS_WANTED.map(col).join("") + " mapping(e/d/h/u/x)");
for (const key of SECTIONS_WANTED) {
  let line = col(key.slice(0, 8)), counts = "";
  for (const bpName of BPS_WANTED) {
    const c = matrix[key]?.[bpName];
    if (!c) { line += col("—"); counts += col(""); continue; }
    if (c.missing) { line += col("missing"); counts += col(c.missing.slice(0, 9)); continue; }
    const n = c.pass + c.fail;
    line += col(n ? Math.round((c.pass / n) * 100) + "%" : "0%");
    counts += col(`${c.pass}/${n}`);
  }
  const c0 = Object.values(matrix[key] || {})[0] || {};
  console.log(line + col("") + ` e=${c0.explicit ?? 0} d=${c0.dataSpec ?? 0} h=${c0.heuristic ?? 0} u=${c0.unmatched ?? 0} x=${c0.excused ?? 0}`);
}
console.log("-".repeat(70));
console.log(`TOTAL ${totalPass}/${total} = ${rate}%  ·  exceptions ${exceptionUses} (${exRate}%, cap 5%)  ·  no-counterpart FAILs ${results.summary.unmatchedFailures}  ·  failures listed: ${results.failures.length}`);
const topKinds = {};
for (const f of results.failures) topKinds[f.kind] = (topKinds[f.kind] || 0) + 1;
console.log("top failure kinds:", Object.entries(topKinds).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${v}`).join("  "));
console.log("exception rules used (true waivers only):", Object.entries(exRules).map(([k, v]) => `${k}:${v}`).join("  ") || "none");
if (ratchetValue != null) console.log(`ratchet floor: ${ratchetValue}%  ·  gate: ${gateVerdict}`);

writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log("results → " + OUT);
process.exit(GATE && gateVerdict === "FAIL" ? 1 : 0);
