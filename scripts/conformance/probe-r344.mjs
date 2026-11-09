#!/usr/bin/env node
/**
 * probe-r344.mjs — R344 item-0 analysis probe (READ-ONLY — writes nothing
 * into the repo; report goes to /tmp).
 *
 * Question: how many NEW passing checks can honest explicit bindings add?
 * Method (the r343 wave method, mechanised):
 *   1. Walk our DOM per section×bp with the runner's own WALK_JS (extracted
 *      verbatim from run.mjs) plus a full-depth nth-child selector chain.
 *   2. Replicate matchPairs exactly: explicit pairs, heuristic tag+tc
 *      ordinal pairs, unmatched spec elements, leftover our elements.
 *   3. For every (unmatched spec element × leftover our element) pair,
 *      predict pass with the REAL tolerance functions (tolerances.mjs):
 *      tag equal, geometry (x-mirror/y/w/h), type (fs/lh/fw/ls), color,
 *      bg, radius, opacity, border, interactive, transition — every
 *      applicable check must pass. Margin = max(delta/tol). The honesty
 *      filter IS the runner's own assertion set: only real mirrored seats
 *      (visual twins) survive; anything our DOM does not render cannot
 *      pass all checks.
 *   4. Pairing-neutrality law: only unmatched spec elements may pair with
 *      leftover our elements (neither side was a heuristic consumer), so
 *      the new bindings cannot shuffle any existing pairing.
 *   5. Extra guards: walk-path uniqueness (census collision protection),
 *      margin cap for CI stability, ambiguity rejection (2nd-best margin
 *      < 2x best margin ⇒ ambiguous ⇒ rejected).
 *
 * Output: /tmp/r344/probe-report.json + console summary.
 *   node scripts/conformance/probe-r344.mjs [--sections a,b] [--bps 1440] [--margin 0.5]
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as T from "./tolerances.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
const { chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright");

const SPEC_DIR = join(WORKTREE, "docs", "redesign", "r335", "heron-spec");
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const URL = arg("url", "http://localhost:5173/");
const MARGIN_CAP = Number(arg("margin", "0.5"));
const OUT = arg("out", "/tmp/r344/probe-report.json");

// ── mapping (merged exactly like run.mjs) ───────────────────────────────────
const MAPPING = readdirSync(join(__dirname, "mapping"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .reduce((acc, f) => {
    const part = JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8"));
    Object.assign(acc.ourSection, part.ourSection);
    Object.assign(acc.scaleFactor ?? (acc.scaleFactor = {}), part.scaleFactor);
    acc.explicit.push(...(part.explicit ?? []));
    acc.charSplit.push(...(part.charSplit ?? []));
    return acc;
  }, { ourSection: {}, explicit: [], charSplit: [], scaleFactor: {} });
const SECTIONS = Object.keys(MAPPING.ourSection);

const bpPath = (v, bpName) => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    if (bpName && v[bpName] != null) return v[bpName];
    if (v.default != null) return v.default;
    const nums = Object.keys(v).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
    if (!nums.length || !bpName) return null;
    const w = Number(bpName);
    const near = nums.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
    return v[String(near)] ?? null;
  }
  return v;
};
const bpSel = (rec, bpName) => !(Array.isArray(rec?.bps) && rec.bps.length && !rec.bps.includes(bpName));
const expandBp = (rec, bpName) => {
  if (!bpSel(rec, bpName)) return null;
  const r = { ...rec };
  for (const k of ["heron", "spec", "container"]) r[k] = bpPath(r[k], bpName);
  return r;
};

// ── WALK_JS extracted verbatim from run.mjs + selector chain extension ──────
const runSrc = readFileSync(join(__dirname, "run.mjs"), "utf8");
const mWalk = runSrc.match(/const WALK_JS = String\.raw`([\s\S]*?)`;\n/);
if (!mWalk) throw new Error("WALK_JS extraction failed");
const WALK_BODY = mWalk[1];
// selector-chain probe: same walk, plus full-depth nth-child chain per element
const PROBE_WALK = WALK_BODY.replace(
  "return { makeWalk, pathOf };",
  `function selOf(el, wrapEl) {
    const segs = [];
    let n = el;
    const stop = wrapEl;
    while (n && n !== stop && segs.length < 24) {
      let idx = 1, sib = n;
      while ((sib = sib.previousElementSibling)) idx++;
      segs.unshift(n.tagName.toLowerCase() + ":nth-child(" + idx + ")");
      n = n.parentElement;
    }
    return segs.join(" > ");
  }
  return { makeWalk, pathOf, selOf };`
).replace(
  "        ds: el.getAttribute(\"data-spec\") || null,",
  "        ds: el.getAttribute(\"data-spec\") || null,\n        sel: selOf(el, wrapEl),"
);

const BPS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 844 },
];
const BPS_WANTED = (arg("bps", null)?.split(",").map((b) => b.trim()) ?? BPS.map((b) => b.name)).filter((b) => BPS.some((x) => x.name === b));
const SECTIONS_WANTED = (arg("sections", null)?.split(",").map((s) => s.trim()) ?? SECTIONS).filter((s) => SECTIONS.includes(s));

// ── prediction: does our element pass every applicable check vs the spec? ──
function predict(h, o, bp) {
  const vw = bp.width, vh = bp.height;
  const checks = [];
  const push = (name, r, tol) => {
    if (r == null) return; // not applicable
    const pass = !!r.pass;
    const ratio = Number.isFinite(r.delta) && tol > 0 ? r.delta / tol : pass ? 0 : 1;
    checks.push({ name, pass, exc: !!r.exception, ratio: Math.min(ratio, pass ? ratio : 1), expected: r.expected, actual: r.actual });
  };
  // group: tag 1, tc 1, geometry 4, type 4, color 2
  push("tag", T.aTag(h, o), 0);
  push("tc", T.aTc(h, o), 0);
  push("x-mirror", T.aX(h, o, vw), Math.max(2, 0.02 * vw));
  push("y", T.aY(h, o, vh), Math.max(2, 0.02 * vh));
  push("w", T.aW(h, o, vw), Math.max(2, 0.02 * vw));
  push("h", T.aH(h, o, vh), Math.max(2, 0.02 * vh));
  push("fontSize", T.aFs(h, o), 0.5);
  push("lineHeight", T.aLh(h, o), 0.5);
  push("fontWeight", T.aFw(h, o), 100);
  push("letterSpacing", T.aLs(h, o), 0.05 * (parseFloat(o?.fs) || 16));
  push("color", T.aColor(h, o), 0);
  push("bg", T.aBg(h, o), 8);
  // unskippables
  push("borderRadius", T.aRadius(h, o), 2);
  push("opacity", T.aOpacity(h, o), 0.05);
  push("border", T.aBorder(h, o), 2);
  push("interactive", T.aInteractive(h, o), 0);
  push("transition", T.aTransition(h, o), 0.10 * parseFloat(String(h?.transition?.d || "0s")) || 0.01);
  if (!checks.length) return null;
  const fails = checks.filter((c) => !c.pass);
  const margin = Math.max(0, ...checks.filter((c) => c.pass).map((c) => c.ratio));
  const exc = checks.filter((c) => c.exc).length;
  const nChecks = checks.length;
  return { pass: fails.length === 0, nChecks, margin, exc, fails: fails.map((f) => f.name), checks };
}

// ── run ─────────────────────────────────────────────────────────────────────
const report = { generatedAt: new Date().toISOString(), marginCap: MARGIN_CAP, sections: {}, summary: {} };
const browser = await chromium.launch({ headless: true });
let grandCandidates = 0, grandChecks = 0, grandSkipWin = 0, grandRebinds = 0, grandRebindChecks = 0, grandDrift = 0, grandDriftChecks = 0;
try {
  for (const bp of BPS.filter((b) => BPS_WANTED.includes(b.name))) {
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    process.stdout.write(`▸ bp ${bp.name} … `);
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    for (const key of SECTIONS_WANTED) {
      const sel = MAPPING.ourSection[key];
      const explicit = MAPPING.explicit.filter((m) => m.section === key).map((m) => expandBp(m, bp.name)).filter(Boolean);
      const data = await page.evaluate(({ key, sel, explicit, WALK }) => {
        const { makeWalk, pathOf } = new Function("return (" + WALK + ")")()();
        const el = document.querySelector(sel);
        if (!el) return { missing: sel };
        const out = [];
        makeWalk(el, key, out)(el);
        const explicitIdx = {};
        for (const m of explicit) {
          if (m.spec) continue;
          const t = m.scope === "page" ? document.querySelector(m.ours) : el.querySelector(m.ours) || (el.matches(m.ours) ? el : null);
          if (!t) continue;
          const p = t === el ? key + " > " + t.tagName.toLowerCase() + "[1]" : pathOf(t, el, key);
          const i = out.findIndex((e) => e.p === p);
          if (i >= 0) explicitIdx[m.heron] = { idx: i, skip: m.skip || [] };
        }
        for (const m of explicit) {
          if (!m.spec) continue;
          const i = out.findIndex((e) => e.ds === m.ours || (e.ds && e.ds === key + "." + m.ours));
          if (i >= 0) explicitIdx[m.heron] = { idx: i, skip: m.skip || [], ds: true };
        }
        return { elements: out, explicitIdx };
      }, { key, sel, explicit, WALK: PROBE_WALK });
      if (!data || data.missing) { (report.sections[key] ??= {})[bp.name] = { missing: sel }; continue; }

      const spec = JSON.parse(readFileSync(join(SPEC_DIR, `${key}.${bp.name}.json`), "utf8"));
      const heronEls = spec.elements;
      const ourEls = data.elements;
      const charSplitRules = MAPPING.charSplit.filter((c) => c.section === key);
      const scaleFactor = MAPPING.scaleFactor?.[key] ?? 1;

      // wordset detection (run.mjs verbatim — spec-side sibling sets)
      const wordsetMode = charSplitRules.some((c) => c.container === "wordset");
      const wordSet = new Set();
      if (wordsetMode) {
        const byParent = new Map();
        for (const h of heronEls) {
          const par = h.p.split(" > ").slice(0, -1).join(" > ");
          if (!byParent.has(par)) byParent.set(par, []);
          byParent.get(par).push(h);
        }
        for (const sibs of byParent.values()) {
          if (sibs.length < 3) continue;
          const sig = (e) => `${e.fs}|${e.fw}|${e.color}|${e.tc}`;
          const counts = new Map();
          for (const sb of sibs) counts.set(sig(sb), (counts.get(sig(sb)) || 0) + 1);
          for (const sb of sibs) if (sb.tc !== "none" && sb.fs != null && counts.get(sig(sb)) >= 3) wordSet.add(sb);
        }
      }
      const isLineContainerPath = (p) => p.split(" > ").slice(-2)[0] === "h2[1]";
      const charSkip = (h) => charSplitRules.some((c) => h.p.includes(c.container) && !isLineContainerPath(h.p));

      // path uniqueness map (census collision protection)
      const pathOwners = new Map();
      ourEls.forEach((e, i) => { const a = pathOwners.get(e.p) ?? []; a.push(i); pathOwners.set(e.p, a); });

      // authoritative pairing replay (exactly matchPairs' order):
      // explicit first, then heuristic tag+tc ordinal
      const usedA = new Set(); const pairedH = new Set();
      const explicitH = new Set();
      for (const h of heronEls) {
        if (wordsetMode && wordSet.has(h)) continue; // scaffold never pairs
        const ex = data.explicitIdx[h.p];
        if (ex && ourEls[ex.idx] && !usedA.has(ex.idx)) { usedA.add(ex.idx); pairedH.add(h); explicitH.add(h); continue; }
      }
      const byKey = new Map();
      ourEls.forEach((o, i) => {
        if (usedA.has(i)) return;
        const k = o.tag + "|" + o.tc;
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k).push(i);
      });
      const consumedByH = new Map();
      for (const h of heronEls) {
        if (explicitH.has(h)) continue;
        if (wordsetMode && wordSet.has(h)) continue;
        if (charSkip(h)) continue;
        const q = byKey.get(h.tag + "|" + h.tc);
        if (q && q.length) { const i = q.shift(); usedA.add(i); pairedH.add(h); consumedByH.set(h, i); }
      }
      const trueUnmatched = heronEls.filter((h) => !pairedH.has(h) && !(wordsetMode && wordSet.has(h)));
      const trueLeftovers = ourEls.map((_, i) => i).filter((i) => !usedA.has(i));

      // scaffold-dormancy exclusion (run.mjs verbatim): charEls under a
      // PAIRED line container with scaffold-like fs get excused + spliced
      // post-pairing — bindings on them stay dormant; exclude from harvest.
      const scaffoldKey2 = (p) => p.split(" > ").slice(-2).join(" > ");
      const scaffoldExcluded = new Set();
      for (const csr of charSplitRules) {
        const containers = [...pairedH].filter((pp) => pp.p.includes(csr.container));
        for (const lineH of containers) {
          const key2 = scaffoldKey2(lineH.p);
          const charEls = heronEls.filter((e) => {
            if (e.p === lineH.p) return false;
            const s = e.p.split(" > ");
            const viaTrunc = s.slice(1, 3).join(" > ") === key2;
            const viaFull = e.p.startsWith(lineH.p + " > ");
            return (viaTrunc || viaFull);
          });
          if (!charEls.length) continue;
          const containerFs = Number(lineH.fs);
          const scaffoldLike = charEls.every((e) => Math.abs(Number(e.fs) - containerFs) <= 0.5 * scaleFactor);
          if (scaffoldLike) for (const e of charEls) scaffoldExcluded.add(e);
        }
      }

      const cell = (report.sections[key] ??= {})[bp.name] ??= { candidates: [] };
      cell.spec = heronEls.length; cell.ours = ourEls.length;
      cell.explicitPaired = explicitH.size; cell.heuristicPaired = pairedH.size - explicitH.size;
      cell.unmatched = trueUnmatched.length; cell.leftovers = trueLeftovers.length;

      // ── pool A: skip-group re-enablement (existing pairs) ─────────────
      // for every explicit pair carrying skip groups, predict pass of the
      // skipped groups' checks with the runner's own tolerances.
      let skipWins = 0, skipTotal = 0, skipPairs = 0;
      const groupChecks = { tag: 1, tc: 1, geometry: 4, type: 4, color: 2 };
      cell.skipWinners = [];
      for (const h of heronEls) {
        if (!pairedH.has(h) || explicitH.has(h)) continue;
        // explicit pairs only (heuristic pairs carry no skip set)
        const ex = data.explicitIdx[h.p];
        if (!ex || !ex.skip || !ex.skip.length) continue;
        const o = ourEls[ex.idx];
        if (!o) continue;
        skipPairs++;
        const pr = predict(h, o, bp);
        if (!pr) continue;
        // which of the skipped groups' checks now pass? predict() returns
        // per-check rows in a fixed order; map back to groups.
        const names = pr.allNames; // set by predict below
        let won = 0, tot = 0;
        for (const g of ex.skip) {
          const gnames = g === "geometry" ? ["x-mirror", "y", "w", "h"]
            : g === "type" ? ["fontSize", "lineHeight", "fontWeight", "letterSpacing"]
            : g === "color" ? ["color", "bg"] : [g];
          for (const nm of gnames) {
            const row = pr.checks?.find((c) => c.name === nm);
            if (!row) continue; // N/A for this element (e.g. no border)
            tot++;
            if (row.pass) won++;
          }
        }
        skipTotal += tot; skipWins += won;
        if (won > 0 && cell.skipWinners.length < 400) {
          cell.skipWinners.push({ heronPath: h.p, skip: ex.skip, won, tot, oursPath: o.p });
        }
      }
      cell.skipPool = { pairs: skipPairs, wonChecks: skipWins, totalSkippedChecks: skipTotal };
      grandSkipWin += skipWins;

      // ── pool B: failing-pair rebind to leftover twins ─────────────────
      // for every PAIR that would FAIL (heuristic junk glue), find a
      // leftover our-element that passes ALL checks with margin — a real
      // mirrored seat the ordinal queue missed.
      let rebinds = 0, rebindChecks = 0;
      cell.rebindWinners = [];
      for (const h of heronEls) {
        if (!pairedH.has(h) || explicitH.has(h)) continue;
        const ex = data.explicitIdx[h.p];
        if (ex) continue; // explicit pairs handled in pool A
        // find its heuristic partner (first unused candidate in replay order)
        const oJunkIdx = consumedByH.get(h);
        if (oJunkIdx == null) continue;
        const oJunk = ourEls[oJunkIdx];
        const prJunk = predict(h, oJunk, bp);
        if (!prJunk || prJunk.pass) continue; // only failing pairs
        const scored = [];
        for (const i of trueLeftovers) {
          const o = ourEls[i];
          if (!o.sel) continue;
          const pr = predict(h, o, bp);
          if (!pr || !pr.pass) continue;
          if (pr.margin > MARGIN_CAP) continue;
          const owners = pathOwners.get(o.p) ?? [];
          if (owners.length !== 1 || owners[0] !== i) continue;
          scored.push({ i, ...pr });
        }
        if (!scored.length) continue;
        scored.sort((a, b) => a.margin - b.margin);
        const best = scored[0];
        const second = scored[1];
        if (second && second.margin < Math.max(best.margin * 2, best.margin + 0.02)) continue;
        cell.rebindWinners.push({ heronPath: h.p, junkOurs: oJunk.p, oursSel: ourEls[best.i].sel, oursPath: ourEls[best.i].p, nChecks: best.nChecks, margin: Math.round(best.margin * 1000) / 1000, exceptions: best.exc, junkFails: prJunk.fails });
        rebinds++; rebindChecks += best.nChecks;
      }
      grandRebinds += rebinds; grandRebindChecks += rebindChecks;
      cell.rebindPool = { pairs: rebinds, checks: rebindChecks };
      cell.rebindWinners = cell.rebindWinners.slice(0, 400);

      // ── pool C: real-pair drift work-list (bound seats failing small) ─
      // every explicitly-bound pair (data-spec or legacy selector) whose
      // checks fail with SMALL deltas — genuine conformance drift fixable
      // by moving our layout to the spec numbers. Emit exact numbers.
      let driftCount = 0, driftChecks = 0;
      cell.driftList = [];
      for (const h of heronEls) {
        if (!pairedH.has(h)) continue;
        const ex = data.explicitIdx[h.p];
        if (!ex) continue; // heuristics excluded (junk glue, not fixable drift)
        const o = ourEls[ex.idx];
        if (!o) continue;
        const pr = predict(h, o, bp);
        if (!pr || pr.pass) continue;
        const bad = pr.checks.filter((c) => !c.pass);
        // small-drift gate: geometry deltas < 60px, fontSize < 2px, bg dist < 20
        const fixable = bad.every((c) => {
          if (["x-mirror", "y", "w", "h"].includes(c.name)) return c.ratio < 15; // delta < 15x tolerance is still meaningful; the real gate below
          if (c.name === "fontSize" || c.name === "lineHeight") return true;
          if (c.name === "bg") return true;
          if (c.name === "tag" || c.name === "tc" || c.name === "color" || c.name === "fontWeight" || c.name === "interactive") return false;
          return true; // radius/opacity/border/transition — css-fixable families
        });
        const maxGeo = Math.max(0, ...bad.filter((c) => ["x-mirror","y","w","h"].includes(c.name)).map((c) => c.ratio));
        if (!fixable || maxGeo > 30) continue; // >30x tolerance = mispair, not drift
        cell.driftList.push({
          heronPath: h.p, oursSel: o.sel, oursPath: o.p, ds: o.ds, hvr: h.vr, ovr: o.vr,
          hfs: h.fs, ofs: o.fs, hcolor: h.color, ocolor: o.color, hbg: h.bg, obg: o.bg,
          nChecks: pr.nChecks, fails: bad.map((c) => ({ name: c.name, expected: c.expected, actual: c.actual, ratio: Math.round((c.ratio || 0) * 100) / 100 })),
          maxGeoRatio: Math.round(maxGeo * 100) / 100,
        });
        driftCount++; driftChecks += pr.nChecks;
      }
      cell.driftPool = { seats: driftCount };
      cell.driftList = cell.driftList.slice(0, 400);
      grandDrift += driftCount;
      grandDriftChecks += driftChecks;

      // twin harvest
      let cands = 0, candChecks = 0;
      for (const h of trueUnmatched) {
        if (scaffoldExcluded.has(h)) continue; // dormant in the real runner
        const scored = [];
        for (const i of trueLeftovers) {
          const o = ourEls[i];
          if (!o.sel) continue; // section root — skip
          const pr = predict(h, o, bp);
          if (!pr) continue;
          if (!pr.pass) continue;
          if (pr.margin > MARGIN_CAP) continue;
          // our-side walk path uniqueness (findIndex resolution safety)
          const owners = pathOwners.get(o.p) ?? [];
          if (owners.length !== 1 || owners[0] !== i) continue;
          scored.push({ i, ...pr });
        }
        if (!scored.length) continue;
        scored.sort((a, b) => a.margin - b.margin);
        const best = scored[0];
        const second = scored[1];
        if (second && second.margin < Math.max(best.margin * 2, best.margin + 0.02)) continue; // ambiguous
        cell.candidates.push({
          heronPath: h.p, heronTag: h.tag, heronTc: h.tc, hvr: h.vr,
          oursSel: ourEls[best.i].sel, oursPath: ourEls[best.i].p, oursTag: ourEls[best.i].tag,
          nChecks: best.nChecks, margin: Math.round(best.margin * 1000) / 1000, exceptions: best.exc,
        });
        cands++; candChecks += best.nChecks;
      }
      grandCandidates += cands; grandChecks += candChecks;
      cell.candidateChecks = candChecks;
      cell.candidates = cell.candidates.slice(0, 400);
    }
    await page.close();
    process.stdout.write("done\n");
  }
} finally {
  await browser.close();
}
report.summary = { candidates: grandCandidates, predictedChecks: grandChecks, skipWinChecks: grandSkipWin, rebinds: grandRebinds, rebindChecks: grandRebindChecks, driftSeats: grandDrift, driftChecks: grandDriftChecks, marginCap: MARGIN_CAP };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report));
console.log(`probe: ${grandCandidates} candidates · ~${grandChecks} predicted passing checks · → ${OUT}`);
for (const [sec, bps] of Object.entries(report.sections)) {
  for (const [bp, cell] of Object.entries(bps)) {
    if (cell.candidates?.length) console.log(`  ${sec} @${bp}: ${cell.candidates.length} candidates (${cell.candidateChecks} checks) [spec ${cell.spec} ours ${cell.ours} unmatched ${cell.unmatched} leftovers ${cell.leftovers}]`);
    if (cell.skipPool?.wonChecks) console.log(`  ${sec} @${bp}: SKIP-REENABLE won ${cell.skipPool.wonChecks}/${cell.skipPool.totalSkippedChecks} checks on ${cell.skipPool.pairs} pairs`);
    if (cell.rebindPool?.checks) console.log(`  ${sec} @${bp}: REBIND ${cell.rebindPool.pairs} junk pairs -> twins (${cell.rebindPool.checks} checks)`);
    if (cell.driftPool?.seats) console.log(`  ${sec} @${bp}: DRIFT ${cell.driftPool.seats} bound seats with small drift`);
  }
}
