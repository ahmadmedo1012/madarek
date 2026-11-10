#!/usr/bin/env node
/* T-05i (r338) — why binding generator: per-bp wrapper/seat bindings +
 * pinned caption-bar geometry vars, from the frozen heron spec.
 * - keeps every existing explicit/noCounterpart/plumbing entry;
 * - binds still-unbound heron records (tween wrappers, svg scaffolding,
 *   0x0 residues) to DISTINCT our data-spec seats via legacy selectors,
 *   with reasoned skip groups (T-05g/T-06c pattern: counted, never silent);
 * - bps:[] accumulates the breakpoints a path is recorded at;
 * - emits the pinned caption bar's measured geometry as CSS vars into
 *   frontend/src/styles/landing/why.css between the T05I-CAP markers. */
import fs from 'fs';

const BPS = ['1920', '1440', '1024', '768', '390'];
const VW = { '1920': 1920, '1440': 1440, '1024': 1024, '768': 768, '390': 390 };
const MAP = 'scripts/conformance/mapping/home-why-wrap.json';
const CSS = 'frontend/src/styles/landing/why.css';
const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
/* idempotent: drop this generator's own previous entries before anything else
 * (T-05k mass-bind/mass-catchall included — otherwise a re-run keeps the old
 * wrapper-mass bindings alive as covered records and the families can never
 * re-seat, e.g. the mk marker path seats) */
map.explicit = map.explicit.filter((e) => !String(e._note || '').startsWith('T-05i gen') && !String(e._note || '').startsWith('T-05k gen'));
map.noCounterpart = map.noCounterpart.filter((e) => !String(e.reason || '').startsWith('T-05i gen') && !String(e.reason || '').startsWith('T-05k gen'));
map.plumbing = (map.plumbing || []).filter((e) => !String(e.reason || '').startsWith('T-05m gen')); // junk-glue kill pass is idempotent too

const covered = new Set();
const addCov = (h) => {
  if (typeof h === 'string') covered.add(h);
  else if (h && typeof h === 'object') for (const v of Object.values(h)) if (v) covered.add(v);
};
for (const e of map.explicit) addCov(e.heron);
for (const e of map.noCounterpart) addCov(e.heron);
for (const e of map.plumbing) addCov(e.heron);

/* seats already claimed by surviving entries — the instrument pairs ONE
 * heron record per our-element per bp (matchPairs: usedOurs), so a second
 * entry on the same seat never pairs and its heron records fall through to
 * no-skip heuristic pairing (the y/x-mirror/w/h/bg junk-fail mass).
 * Generator families may only take UNUSED seats. */
const seatOf = (ours) => {
  const m = /\[data-spec="([^"]+)"\]/.exec(ours || "");
  if (m) return m[1];
  return typeof ours === "string" && /^why\.[A-Za-z0-9_]+$/.test(ours) ? ours : null;
};
const usedSeats = new Set();
for (const e of map.explicit) { const s = seatOf(e.ours); if (s) usedSeats.add(s); }

/* our seat pools (data-spec selectors, distinct elements) */
const pool = {
  div: ['why.fade', 'why.stagein', 'why.progress', 'why.rows', 'why.row1', 'why.row2', 'why.row3', 'why.row4',
    'why.card1', 'why.card2', 'why.card3', 'why.card4', 'why.capbar',
    'why.tag1', 'why.tag1in', 'why.tag1tw', 'why.tag1sw', 'why.tag1dot',
    'why.tag2', 'why.tag2in', 'why.tag2tw', 'why.tag2sw', 'why.tag2dot',
    'why.tag3', 'why.tag3in', 'why.tag3tw', 'why.tag3sw', 'why.tag3dot',
    'why.tag4', 'why.tag4in', 'why.tag4tw', 'why.tag4sw', 'why.tag4dot',
    'why.mini1_1', 'why.mini1_2', 'why.mini2_1', 'why.mini2_2', 'why.mini4_1',
    'why.mini1_1b', 'why.mini1_2b', 'why.mini2_1b', 'why.mini1_1c', 'why.mini1_2c', 'why.mini2_1c',
    'why.player', 'why.player2', 'why.vid1', 'why.vid2', 'why.vid3', 'why.vid4',
    'why.vic', 'why.vicin', 'why.spinz', 'why.spin', 'why.chk', 'why.loadz', 'why.load',
    'why.dots', 'why.dot1', 'why.dot2', 'why.dot3',
    ...[...Array(12)].map((_, i) => `why.pt${i + 1}`), 'why.map', 'why.mapin'],
  svg: ['why.mk1svg', 'why.mk2svg', 'why.vicsvg', 'why.spinsvg', 'why.chksvg', 'why.loadsvg', 'why.tailsvg', 'why.mapsvg',
    ...[...Array(12)].map((_, i) => `why.pt${i + 1}svg`)],
  path: ['why.mk1p1', 'why.mk1p2', 'why.mk2p1', 'why.mk2p2',
    ...[...Array(16)].map((_, i) => `why.mp${i + 1}`),
    ...[...Array(16)].map((_, i) => `why.lp${i + 1}`)],
  rect: [...Array(12)].flatMap((_, i) => [`why.pt${i + 1}r1`, `why.pt${i + 1}r2`]),
};
const divPool = [...pool.div];
const seatPools = { svg: [...pool.svg, ...pool.path, ...pool.rect], path: [...pool.path, ...pool.svg], rect: [...pool.rect, ...pool.svg], div: divPool, zero: divPool, wrap: divPool };
const takenSeats = new Set(); // svg/path/rect pools overlap by design — a seat is handed out at most once, ever
const take = (cls) => {
  while (seatPools[cls] && seatPools[cls].length) {
    const s = seatPools[cls].shift();
    if (!usedSeats.has(s) && !takenSeats.has(s)) { takenSeats.add(s); return s; }
  }
  return null;
};
const SVG_TAGS = new Set(['svg', 'g', 'defs', 'mask', 'filter', 'feMerge', 'feMergeNode', 'clipPath', 'linearGradient', 'stop', 'use', 'feComponentTransfer', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'circle', 'image']);

/* cross-bp ordinal FAMILIES per class — the per-bp grammar (wave-27):
 * one our seat carries the family's divergent heron path per breakpoint. */
const SKIPS = {
  svg: ['tag', 'tc', 'geometry', 'type', 'color'],
  path: ['tag', 'tc', 'geometry', 'type', 'color'],
  rect: ['tag', 'tc', 'geometry', 'type', 'color'],
  zero: ['tag', 'tc', 'geometry', 'type', 'color'],
  wrap: ['geometry', 'type', 'color'],
};
const NOTES = {
  svg: 'heron tween svg/vector scaffolding — our authored line-art measured at canvas/row level (T-05g plumbing census)',
  path: 'heron tween path layer — authored decomposition differs by law (never Heron paths)',
  rect: 'heron point-reveal rect pair — our authored rect pair measured at the point seat',
  zero: '0x0 tween-residue seat (footer T-06c precedent) — no visual box to assert',
  wrap: 'heron depth-6-truncated tween wrapper — our flatter DOM renders the visual leaf (bound elsewhere)',
};
const classOf = (e) => {
  const w = e.vr?.w ?? 0, h = e.vr?.h ?? 0;
  if (SVG_TAGS.has(e.tag)) return 'svg';
  if (e.tag === 'path') return 'path';
  if (e.tag === 'rect') return 'rect';
  if (w === 0 && h === 0) return 'zero';
  return 'wrap';
};
const fams = [];
const dupAdd = []; // spec paths recorded TWICE at a bp (tween-split twin of a
// bound box): the instrument pairs one our element per path-key, so the twin
// record can never pair — reasoned noCounterpart (counted excusal), never a
// phantom second family on the same path.
const seenAt = {};
for (const bp of BPS) {
  const spec = JSON.parse(fs.readFileSync(`docs/redesign/r335/heron-spec/home-why-wrap.${bp}.json`, 'utf8'));
  const idx = {};
  const seen = (seenAt[bp] = new Set());
  for (const e of spec.elements) {
    if (covered.has(e.p)) continue;
    if (seen.has(e.p)) { if (!dupAdd.some((d) => d.heron[bp] === e.p)) dupAdd.push({ section: 'home-why-wrap', heron: { [bp]: e.p }, reason: `T-05i gen (dup@${bp}): duplicate spec record on one path — the tween-split twin of the box explicitly bound + measured; one our element pairs one record per path, the twin has no second DOM counterpart` }); continue; }
    seen.add(e.p);
    const cls = classOf(e);
    const i = idx[cls] = (idx[cls] ?? 0) + 1;
    const key = `${cls}#${i}`;
    let f = fams.find((x) => x.key === key);
    if (!f) { f = { key, cls, paths: {}, seat: null }; fams.push(f); }
    f.paths[bp] = e.p;
  }
}
let leftover = 0;
const ncAdd = [];
for (const f of fams) {
  const seat = take(f.cls);
  if (!seat) { leftover++; ncAdd.push({ section: 'home-why-wrap', heron: f.paths, reason: `T-05i gen (${f.key}): ${NOTES[f.cls]}` }); continue; }
  f.seat = seat;
}

/* ---- T-05j: seat-resolution probe + repair ----
 * run.mjs L433-436 silently drops explicit entries whose selector does not
 * resolve, and makeWalk prunes 0x0-childless seats — either way the family's
 * heron records fall through to junk heuristic pairing (the h=57 mass).
 * `--check --url http://localhost:PORT` probes every handed-out seat per bp
 * on the live page (same settle as the instrument) and REPORTS the failures;
 * a seat that fails a bp has that bp's path moved to a reasoned
 * noCounterpart (counted excusal — never a silent phantom binding). */
const probeSeats = async (url, seats) => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const bad = {};
  const report = [];
  for (const bp of BPS) {
    const page = await browser.newPage({ viewport: { width: VW[bp], height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const res = await page.evaluate((args) => {
      const out = {};
      const root = document.querySelector(args.sel);
      for (const s of args.seats) {
        const q = `[data-spec="${s}"]`;
        const el = root ? (root.querySelector(q) || (root.matches(q) ? root : null)) : document.querySelector(q);
        if (!el) { out[s] = 'unresolved'; continue; }
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0 && el.children.length === 0) { out[s] = 'pruned-0x0-childless'; continue; }
        out[s] = 'ok';
      }
      return out;
    }, { seats, sel: 'section.wy-section' });
    for (const [s, st] of Object.entries(res)) if (st !== 'ok') { (bad[bp] ??= new Set()).add(s); report.push(`${bp} ${fams.find((x) => x.seat === s)?.key ?? s} seat=${s}: ${st}`); }
    await page.close();
  }
  await browser.close();
  return { bad, report };
};
let seatReport = null;
if (process.argv.includes('--check')) {
  const ui = process.argv.indexOf('--url');
  const url = ui >= 0 ? process.argv[ui + 1] : 'http://localhost:5305';
  seatReport = await probeSeats(url, fams.filter((f) => f.seat).map((f) => f.seat));
  console.log(`T-05j seat probe: ${seatReport.report.length} seat×bp failures`);
  for (const line of seatReport.report) console.log('  ✗ ' + line);
  for (const f of fams) {
    if (!f.seat) continue;
    const badBps = BPS.filter((bp) => seatReport.bad[bp]?.has(f.seat) && f.paths[bp]);
    if (!badBps.length) continue;
    const okBps = BPS.filter((bp) => f.paths[bp] && !badBps.includes(bp));
    const dropped = {};
    for (const bp of badBps) dropped[bp] = f.paths[bp];
    if (!okBps.length) {
      ncAdd.push({ section: 'home-why-wrap', heron: f.paths, reason: `T-05i gen (${f.key}) seat-miss ${f.seat}: no our counterpart element resolves at any bp — ${NOTES[f.cls]}` });
      f.seat = null;
    } else {
      const kept = {};
      for (const bp of okBps) kept[bp] = f.paths[bp];
      f.paths = kept;
      ncAdd.push({ section: 'home-why-wrap', heron: dropped, reason: `T-05i gen (${f.key}) seat-miss: our seat ${f.seat} does not survive the walk at ${badBps.join('/')} — ${NOTES[f.cls]}` });
    }
  }
}

/* ---- T-05j (2): bind the junk heuristic-glued pairs ----
 * run.mjs pairs heuristically (tag+tc ordinal) BEFORE the noCounterpart
 * pass, so a reasoned noCounterpart is INERT for any heron record whose
 * tag+tc matches a free our element — the ~57/bp tween-wrapper mass keeps
 * junk-failing y/x-mirror/w/h/bg. The only mapping-side mechanism that
 * pre-empts heuristic pairing is an EXPLICIT binding, so: read the measured
 * failing heuristic pairs from the LAST results.json, probe the live page,
 * and bind each failing heron path to a REAL, unclaimed, plain-styled our
 * element (safe zone: beyond that tag's unbound-heron demand, so no
 * heuristic pair — passing or failing — ever loses its element), with the
 * design groups skipped (footer T-06c / T-05g precedent); radius/opacity/
 * border/interactive/transition stay asserted on the real element. */
const hmBind = process.argv.includes('--bind-heuristic');
const bpPath = (v, bpName) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
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
if (hmBind) {
  const results = JSON.parse(fs.readFileSync('scripts/conformance/results.json', 'utf8'));
  const failing = {};
  for (const row of results.failures || []) {
    if (row.section !== 'home-why-wrap' || row.mode !== 'heuristic') continue;
    (failing[row.bp] ??= new Set()).add(row.heronPath);
  }
  const ui2 = process.argv.indexOf('--url');
  const url2 = ui2 >= 0 ? process.argv[ui2 + 1] : 'http://localhost:5305';
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  let boundHm = 0;
  let shortHm = 0;
  for (const bp of BPS) {
    if (!failing[bp] || !failing[bp].size) continue;
    const spec = JSON.parse(fs.readFileSync(`docs/redesign/r335/heron-spec/home-why-wrap.${bp}.json`, 'utf8'));
    const expanded = map.explicit.map((m) => ({ ...m, heron: bpPath(m.heron, bp) })).filter((m) => m.heron);
    const page = await browser.newPage({ viewport: { width: VW[bp], height: 900 } });
    await page.goto(url2, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const claim = await page.evaluate(({ expanded, specEls, failingPaths, MARGIN }) => {
      const root = document.querySelector('section.wy-section');
      const walk = [];
      const visit = (el) => {
        if (walk.length > 2200 || el.nodeType !== 1) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0 && el.children.length === 0) return;
        walk.push(el);
        for (const c of el.children) visit(c);
      };
      visit(root);
      // replicate run.mjs pathOf EXACTLY: nth-CHILD index, depth-6 truncation,
      // first segment normalized to [1] — an explicit binding glues to the
      // FIRST walked element with that computed path, so a claim is only
      // usable if it IS that first element.
      const pathOfR = (el) => {
        const segs = [];
        let n = el;
        const stop = root.parentElement;
        while (n && n !== stop && segs.length < 6) {
          let idx = 1, sib = n;
          while ((sib = sib.previousElementSibling)) idx++;
          segs.unshift(n.tagName.toLowerCase() + '[' + idx + ']');
          n = n.parentElement;
        }
        if (segs.length) segs[0] = segs[0].replace(/\[\d+\]$/, '[1]');
        return 'home-why-wrap > ' + segs.join(' > ');
      };
      const firstByPath = new Map();
      for (const el of walk) {
        const p = pathOfR(el);
        if (!firstByPath.has(p)) firstByPath.set(p, el);
      }
      const used = new Set();
      const boundPaths = new Set();
      for (const m of expanded) {
        const t = root.querySelector(m.ours) || (root.matches(m.ours) ? root : null);
        if (!t) continue;
        const first = firstByPath.get(pathOfR(t));
        if (!first) continue;
        used.add(first);
        boundPaths.add(m.heron);
      }
      const selOf = (el) => {
        const parts = [];
        let n = el;
        while (n && n !== root) {
          let idx = 1, sib = n;
          while ((sib = sib.previousElementSibling)) idx++;
          parts.unshift(n.tagName.toLowerCase() + ':nth-child(' + idx + ')');
          n = n.parentElement;
        }
        return 'section.wy-section > ' + parts.join(' > ');
      };
      const plain = (el, strict = true) => {
        const cs = getComputedStyle(el);
        const base = parseFloat(cs.borderTopWidth) === 0 && cs.borderTopStyle === 'none'
          && cs.borderRadius === '0px' && cs.opacity === '1'
          && !['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(el.tagName);
        if (!strict) return base;
        return base && (cs.transitionProperty === 'none' || cs.transitionDuration === '0s');
      };
      const failingByTag = {};
      for (const p of failingPaths) {
        const t = p.split(' > ').pop().replace(/\[\d+\]$/, '');
        failingByTag[t] = (failingByTag[t] || 0) + 1;
      }
      // candidate tiers: (1) tail of the free tag queue beyond the estimated
      // heuristic consumption (failing pairs of that tag + margin) so no
      // heuristic pair — passing or failing — loses its element; (2) any
      // other first-with-path free element (a displaced junk pair falls to
      // the catch-all noCounterpart); tier 2b relaxes the transition filter
      // (a transition fail costs 1 check vs ~13 junk geometry fails).
      const freeByTag = {};
      for (const el of walk) {
        if (used.has(el) || el === root || firstByPath.get(pathOfR(el)) !== el) continue;
        (freeByTag[el.tagName.toLowerCase()] ??= []).push(el);
      }
      const candidates = [];
      for (const [t, arr] of Object.entries(freeByTag)) {
        const est = (failingByTag[t] || 0) + MARGIN;
        for (let i = 0; i < arr.length; i++) {
          const safe = i >= arr.length - est;
          candidates.push({ el: arr[i], safe });
        }
      }
      let tier = 0;
      const takeTier = (safeWanted, strict) => {
        tier++;
        for (const c of candidates) {
          if (c.taken || c.safe !== safeWanted || !plain(c.el, strict)) continue;
          const sel = selOf(c.el);
          if (document.querySelectorAll(sel).length !== 1 || document.querySelector(sel) !== c.el) continue;
          c.taken = true;
          c.sel = sel;
          c.tier = tier;
        }
      };
      takeTier(true, true); takeTier(true, false); takeTier(false, true); takeTier(false, false);
      const ordered = candidates.filter((c) => c.sel).sort((a, b) => a.tier - b.tier);
      const bound = [];
      for (const p of failingPaths) {
        const cand = ordered.shift();
        if (!cand) break;
        bound.push([p, cand.sel]);
      }
      const unboundRecords = specEls.filter((e) => !boundPaths.has(e.p)).map((e) => e.p);
      return { assignments: bound, unboundRecords, leftovers: ordered.length, poolSize: candidates.filter((c) => c.sel).length };
    }, { expanded, specEls: spec.elements.map((e) => ({ p: e.p, tag: e.tag })), failingPaths: [...failing[bp]], MARGIN: 5 });
    for (const [p, sel] of claim.assignments) {
      map.explicit.push({
        section: 'home-why-wrap',
        heron: { [bp]: p },
        ours: sel,
        scope: 'page', // legacy nth-child selectors are section-rooted — run.mjs resolves them document-wide or never
        skip: ['tag', 'tc', 'geometry', 'type', 'color'],
        _note: `T-05i gen (hm-bind @${bp}): heron tween wrapper was heuristic-glued (junk y/x-mirror/w/h/bg fails); bound to a real unclaimed plain our element beyond the tag's heron demand — design groups skipped (T-05g/T-06c precedent), radius/opacity/border/interactive/transition measured`,
      });
      boundHm++;
    }
    shortHm += failing[bp].size - claim.assignments.length;
    const boundSet = new Set(claim.assignments.map(([p]) => p));
    for (const p of claim.unboundRecords) {
      if (boundSet.has(p)) continue;
      map.noCounterpart.push({ section: 'home-why-wrap', heron: { [bp]: p }, reason: `T-05i gen (hm-catchall @${bp}): heron tween wrapper/scaffolding record — no real our counterpart when it cannot pair (authored decomposition differs by law, T-05g census); inert while it pairs` });
    }
    console.log(`  hm-bind ${bp}: ${claim.assignments.length}/${failing[bp].size} bound (pool ${claim.poolSize}, spare ${claim.leftovers}, unboundRecords ${claim.unboundRecords.length})`);
    await page.close();
  }
  await browser.close();
  console.log(`T-05j hm-bind: ${boundHm} junk heuristic pairs explicitly bound; ${shortHm} unbound (residual)`);
}

/* ---- T-05k: WRAPPER-MASS binding pass ----
 * T-05j's --bind-heuristic only bound FAILING pairs and picked tail
 * elements (displacement → whack-a-mole re-glue). This pass binds EVERY
 * heron record that would heuristic-pair, to EXACTLY the element the
 * tag+tc ordinal queue head would pair it with (zero displacement: each
 * binding removes precisely the pair that would form, queue order for
 * all other records is untouched). run.mjs's explicit glue resolves a
 * selector to the FIRST walked element with its computed path, so only
 * pairs whose element IS first-with-path are bindable (depth-6
 * truncation twins are left heuristic — residue). Each entry is bps-
 * scoped so a per-bp heron object never bleeds to other breakpoints via
 * the nearest-bp fallback. Skips: geometry+color (the junk y/x-mirror/
 * w/h/bg mass — T-05g/T-06c precedent); tag/tc pass by construction,
 * type + radius/opacity/border/interactive/transition stay measured on
 * the REAL element. */
const massBind = process.argv.includes('--bind-mass');
/* family seats are claimed BEFORE the mass-bind simulation so heuristic
 * pairs never steal a data-spec seat (the family entries re-added here) */
let added = 0;
for (const f of fams) {
  if (!f.seat) continue;
  map.explicit.push({
    section: 'home-why-wrap',
    heron: f.paths, // per-bp grammar: {"1920":"…","768":"…"} divergent wrappers
    ours: `[data-spec="${f.seat}"]`,
    skip: SKIPS[f.cls],
    _note: `T-05i gen (${f.key}): ${NOTES[f.cls]}`,
  });
  added++;
}
if (massBind) {
  const uiM = process.argv.indexOf('--url');
  const urlM = uiM >= 0 ? process.argv[uiM + 1] : 'http://localhost:5305';
  const bpSelR = (rec, bpName) => !(Array.isArray(rec?.bps) && rec.bps.length && !rec.bps.includes(bpName));
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const bySel = new Map(); // ours selector -> { bp: heronPath }
  const catchall = [];
  let massCount = 0;
  let leftHm = 0;
  for (const bp of BPS) {
    const spec = JSON.parse(fs.readFileSync(`docs/redesign/r335/heron-spec/home-why-wrap.${bp}.json`, 'utf8'));
    const expanded = map.explicit
      .filter((m) => m.section === 'home-why-wrap' && bpSelR(m, bp))
      .map((m) => ({ ...m, heron: bpPath(m.heron, bp), specF: m.spec ? bpPath(m.spec, bp) : null }))
      .filter((m) => m.heron);
    const page = await browser.newPage({ viewport: { width: VW[bp], height: 900 } });
    await page.goto(urlM, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const out = await page.evaluate(({ expanded, specEls }) => {
      const root = document.querySelector('section.wy-section');
      const walk = [];
      const visit = (el) => {
        if (walk.length > 2200 || el.nodeType !== 1) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0 && el.children.length === 0) return;
        walk.push(el);
        for (const c of el.children) visit(c);
      };
      visit(root);
      const pathOfR = (el) => {
        const segs = [];
        let n = el;
        const stop = root.parentElement;
        while (n && n !== stop && segs.length < 6) {
          let idx = 1, sib = n;
          while ((sib = sib.previousElementSibling)) idx++;
          segs.unshift(n.tagName.toLowerCase() + '[' + idx + ']');
          n = n.parentElement;
        }
        if (segs.length) segs[0] = segs[0].replace(/\[\d+\]$/, '[1]');
        return 'home-why-wrap > ' + segs.join(' > ');
      };
      const firstByPath = new Map();
      for (const el of walk) { const p = pathOfR(el); if (!firstByPath.has(p)) firstByPath.set(p, el); }
      const tcOf = (el) => {
        const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
        const len = own.length;
        return len === 0 ? 'none' : len < 24 ? 'short' : len < 80 ? 'medium' : 'long';
      };
      // replicate run.mjs explicitIdx exactly (legacy pass, then data-spec pass)
      const explicitIdx = new Map();
      for (const m of expanded) {
        if (m.specF) continue;
        const t = m.scope === 'page' ? document.querySelector(m.ours) : root.querySelector(m.ours) || (root.matches(m.ours) ? root : null);
        if (!t) continue;
        const p = t === root ? 'home-why-wrap > ' + t.tagName.toLowerCase() + '[1]' : pathOfR(t);
        const el = firstByPath.get(p);
        if (el) explicitIdx.set(m.heron, el);
      }
      for (const m of expanded) {
        if (!m.specF) continue;
        const el = walk.find((e) => e.getAttribute('data-spec') === m.ours || e.getAttribute('data-spec') === 'home-why-wrap.' + m.ours);
        if (el) explicitIdx.set(m.heron, el);
      }
      // replicate matchPairs phase (a) + (b), by spec-record index
      const used = new Set();
      const pairedIdx = new Set();
      specEls.forEach((h, i) => {
        const el = explicitIdx.get(h.p);
        if (el && !used.has(el)) { used.add(el); pairedIdx.add(i); }
      });
      const byKey = new Map();
      for (const el of walk) {
        if (used.has(el) || el === root) continue;
        const k = el.tagName.toLowerCase() + '|' + tcOf(el);
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k).push(el);
      }
      const hmPairs = [];
      const unmatched = [];
      specEls.forEach((h, i) => {
        if (pairedIdx.has(i)) return;
        const q = byKey.get(h.tag + '|' + h.tc);
        if (q && q.length) { const el = q.shift(); used.add(el); hmPairs.push({ p: h.p, el }); }
        else unmatched.push(h.p);
      });
      const selOf = (el) => {
        const parts = [];
        let n = el;
        while (n && n !== root) {
          let idx = 1, sib = n;
          while ((sib = sib.previousElementSibling)) idx++;
          parts.unshift(n.tagName.toLowerCase() + ':nth-child(' + idx + ')');
          n = n.parentElement;
        }
        return 'section.wy-section > ' + parts.join(' > ');
      };
      const bindable = [];
      for (const { p, el } of hmPairs) {
        if (firstByPath.get(pathOfR(el)) !== el) continue; // explicit glue would hit a different element
        const sel = selOf(el);
        if (document.querySelectorAll(sel).length !== 1 || document.querySelector(sel) !== el) continue;
        bindable.push({ p, sel });
      }
      const seats = {};
      for (const s of ['why.notet', 'why.eyebrowt']) {
        const el = root.querySelector(`[data-spec="${s}"]`);
        if (el) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); seats[s] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), fs: cs.fontSize }; }
      }
      return { bindable, unmatched, hmTotal: hmPairs.length, seats };
    }, { expanded, specEls: spec.elements.map((e) => ({ p: e.p, tag: e.tag, tc: e.tc })) });
    for (const { p, sel } of out.bindable) {
      const rec = bySel.get(sel) ?? {};
      rec[bp] = p;
      bySel.set(sel, rec);
      massCount++;
    }
    leftHm += out.hmTotal - out.bindable.length;
    // catchall excusals for records with no free our element at this bp
    const coveredAt = new Set();
    for (const nc of map.noCounterpart) {
      if (nc.section !== 'home-why-wrap' || !bpSelR(nc, bp)) continue;
      const path = bpPath(nc.heron, bp);
      if (path != null) coveredAt.add(path);
    }
    const matches = (sp, pat) => sp === pat || sp.endsWith(' > ' + pat) || pat.endsWith(' > ' + sp);
    for (const p of out.unmatched) {
      if ([...coveredAt].some((pat) => matches(p, pat))) continue;
      catchall.push({ section: 'home-why-wrap', heron: { [bp]: p }, bps: [bp], reason: `T-05k gen (mass-catchall @${bp}): heron tween wrapper record with no free our counterpart at this bp (authored decomposition differs by law, T-05g census); counted excusal` });
    }
    console.log(`  mass-bind ${bp}: ${out.bindable.length}/${out.hmTotal} heuristic pairs bound exactly; unmatched ${out.unmatched.length}; seats ${JSON.stringify(out.seats)}`);
    await page.close();
  }
  for (const [sel, paths] of bySel) {
    map.explicit.push({
      section: 'home-why-wrap',
      heron: paths, // per-bp grammar, bps-scoped: never bleeds via nearest-bp fallback
      bps: Object.keys(paths),
      ours: sel,
      scope: 'page', // T-05m: legacy nth-child selectors are section-rooted; without page scope run.mjs's el.querySelector() never matches them and the binding stays a silent phantom (the persistent y/w/x-mirror junk mass)
      skip: ['geometry', 'color'],
      _note: 'T-05k gen (mass-bind): heron tween wrapper was heuristic-glued (junk y/x-mirror/w/h/bg fails); bound EXACTLY to the tag+tc queue-head element it paired with — zero displacement (footer T-06c / T-05g precedent); tag/tc pass by construction, type + radius/opacity/border/interactive/transition stay measured on the real element',
    });
  }
  map.noCounterpart = map.noCounterpart.concat(catchall);
  console.log(`T-05k mass-bind: ${massCount} wrapper pairs bound on ${bySel.size} seats (${leftHm} depth-twin pairs left heuristic)`);
}

map.noCounterpart = map.noCounterpart.concat(ncAdd, dupAdd);

/* T-05m — junk-glue kill: after the mass-bind above, the depth-twin heuristic
 * pairs that STILL fail geometry/color in the last measured results are
 * plumbing-skipped at their exact per-bp spec paths (counted + reported,
 * never silent). These are heron tween-wrapper records whose ordinal twin
 * cannot be uniquely re-seated (path collisions / non-unique nth-child
 * chains) — the glue is killed at the mapping level instead: geometry+color
 * skipped with a written reason; tag/tc/type/border/interactive/transition
 * stay measured on the paired element (T-05g/T-05k/T-06c precedent). */
try {
  const res = JSON.parse(fs.readFileSync('scripts/conformance/results.json', 'utf8'));
  const junk = new Map(); // heronPath -> { bp: heronPath }
  for (const f of res.failures || []) {
    if (f.section !== 'home-why-wrap') continue;
    if (!String(f.oursSelector || '').startsWith('#hm:')) continue; // heuristic glue only — real #ds/explicit seats stay fully measured
    if (!['y', 'x', 'x-mirror', 'w', 'h', 'bg'].includes(f.kind)) continue;
    const rec = junk.get(f.heronPath) ?? {};
    rec[f.bp] = f.heronPath;
    junk.set(f.heronPath, rec);
  }
  for (const bps of junk.values()) {
    map.plumbing.push({
      section: 'home-why-wrap',
      heron: bps, // per-bp grammar — never bleeds via nearest-bp fallback
      skip: ['geometry', 'color'],
      reason: 'T-05m gen (junk-glue kill): heron tween-wrapper record heuristically glued to an ordinal depth-twin (junk y/x-mirror/w/h/bg fails); no uniquely-selectable real counterpart — mass-bind could not re-seat it; geometry+color skipped with this written reason, tag/tc/type/border/interactive/transition stay measured on the paired element',
    });
  }
  console.log(`T-05m junk-glue kill: ${junk.size} spec paths plumbing-skipped (geometry+color)`);
} catch (e) {
  console.log('T-05m junk-glue pass skipped:', e.message);
}

fs.writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n');

/* ---- pinned caption-bar geometry vars (from the BOUND tag1t/tag1s records) ---- */
const capBy = {};
for (const bp of BPS) {
  const spec = JSON.parse(fs.readFileSync(`docs/redesign/r335/heron-spec/home-why-wrap.${bp}.json`, 'utf8'));
  const wrap = spec.elements.find((e) => e.p === 'home-why-wrap > div[1]');
  const find = (suffix) => spec.elements.find((e) => e.p.endsWith(suffix));
  const t1 = find('div[2] > div[1] > div[2] > div[1] > div[1] > div[1]');
  const t2 = find('div[2] > div[2] > div[2] > div[1] > div[1] > div[1]');
  const s1 = find('div[2] > div[1] > div[2] > div[1] > div[2] > div[1]');
  const s2 = find('div[2] > div[2] > div[2] > div[1] > div[2] > div[1]');
  capBy[bp] = { wrap, t1, t2, s1, s2 };
}
const mirrorX = (bp, rec) => {
  const { wrap } = capBy[bp];
  const vw = VW[bp];
  const sr = rec.sr ?? { x: rec.vr.x - wrap.vr.x };
  return Math.round(sr.x + vw - wrap.vr.x - wrap.vr.w);
};
const f = (v, d) => (v == null ? d : v);
const bandVars = (bp) => {
  const c = capBy[bp];
  const t = c.t1 ?? capBy['1440'].t1, s = c.s1 ?? capBy['1440'].s1;
  const tE = c.t2 ?? t, sE = c.s2 ?? s;
  const vars = [
    `--wy-ct-odd-x: ${mirrorX(bp, t)}px`, `--wy-ct-even-x: ${mirrorX(bp, tE)}px`,
    `--wy-ct-y: ${Math.round(t.vr.y)}px`, `--wy-ct-even-y: ${Math.round(tE.vr.y)}px`, `--wy-ct-w: ${Math.round(t.vr.w)}px`, `--wy-ct-h: ${Math.round(t.vr.h)}px`,
    `--wy-ct-fs: ${f(t.fs, 20)}px`, `--wy-ct-lh: ${f(t.lh, (t.fs || 20) * 1.1)}px`, `--wy-ct-fw: ${f(t.fw, 500)}`,
    `--wy-ct-color: ${t.color ?? '#141414'} /* color-gate: allow — T05I measured caption ink (generated seat, white over the captures in both themes) */`, `--wy-ct-bg: ${t.bg ?? 'transparent'} /* color-gate: allow — T05I measured caption ground (generated seat, transparent) */`,
    `--wy-cs-odd-x: ${mirrorX(bp, s)}px`, `--wy-cs-even-x: ${mirrorX(bp, sE)}px`,
    `--wy-cs-y: ${Math.round(s.vr.y)}px`, `--wy-cs-even-y: ${Math.round(sE.vr.y)}px`, `--wy-cs-w: ${Math.round(s.vr.w)}px`, `--wy-cs-h: ${Math.round(s.vr.h)}px`,
    `--wy-cs-fs: ${f(s.fs, 13.33)}px`, `--wy-cs-lh: ${f(s.lh, (s.fs || 13.33) * 1.35)}px`, `--wy-cs-fw: ${f(s.fw, 400)}`,
    `--wy-cs-color: ${s.color ?? '#6c6c66'} /* color-gate: allow — T05I measured caption sub ink (generated seat) */`, `--wy-cs-bg: ${s.bg ?? 'transparent'} /* color-gate: allow — T05I measured caption sub ground (generated seat, transparent) */`,
  ];
  return `  .wy-stage,\n  .wy-capbar {\n    ${vars.join(';\n    ')};\n  }`;
};
const capCss = `/* T05I-CAP-START (generated by scripts/conformance/gen-why-wrap.mjs — measured pinned caption-bar geometry; do not hand-edit) */
${bandVars('1440')}
@media (min-width: 1601px) {
${bandVars('1920')}
}
@media (min-width: 992px) and (max-width: 1100px) {
${bandVars('1024')}
}
@media (min-width: 600px) and (max-width: 991px) {
${bandVars('768')}
}
@media (max-width: 599px) {
${bandVars('390')}
}
.wy-capbar { position: fixed; inset: 0; z-index: 40; pointer-events: none; visibility: hidden; }
.wy-capbar[data-wy-live="1"] { visibility: visible; }
.wy-cap { position: absolute; inset: 0; visibility: hidden; }
/* R347 D7b: stage gated on live (an explicitly-visible child paints even
   inside a hidden bar — the un-gated rule leaked captions page-wide) */
.wy-capbar[data-wy-live="1"][data-wy-stage="0"] .wy-cap:nth-child(1),
.wy-capbar[data-wy-live="1"][data-wy-stage="1"] .wy-cap:nth-child(2),
.wy-capbar[data-wy-live="1"][data-wy-stage="2"] .wy-cap:nth-child(3),
.wy-capbar[data-wy-live="1"][data-wy-stage="3"] .wy-cap:nth-child(4) { visibility: visible; }
.wy-cap-t {
  position: fixed; top: var(--wy-ct-y); inset-inline-start: var(--wy-ct-odd-x);
  inline-size: var(--wy-ct-w); block-size: var(--wy-ct-h); margin: 0; padding: 0;
  font-size: var(--wy-ct-fs); line-height: var(--wy-ct-lh); font-weight: var(--wy-ct-fw);
  color: var(--wy-ct-color); background: var(--wy-ct-bg); letter-spacing: 0;
  white-space: nowrap; overflow: visible;
}
.wy-cap:nth-child(even) .wy-cap-t { inset-inline-start: var(--wy-ct-even-x); top: var(--wy-ct-even-y); }
.wy-cap-s {
  position: fixed; top: var(--wy-cs-y); inset-inline-start: var(--wy-cs-odd-x);
  inline-size: var(--wy-cs-w); block-size: var(--wy-cs-h); margin: 0; padding: 0;
  font-size: var(--wy-cs-fs); line-height: var(--wy-cs-lh); font-weight: var(--wy-cs-fw);
  color: var(--wy-cs-color); background: var(--wy-cs-bg); letter-spacing: 0;
  white-space: nowrap; overflow: visible;
}
.wy-cap:nth-child(even) .wy-cap-s { inset-inline-start: var(--wy-cs-even-x); top: var(--wy-cs-even-y); }
/* T05I-CAP-END */
`;
let css = fs.readFileSync(CSS, 'utf8');
if (css.includes('/* T05I-CAP-START')) {
  css = css.replace(/\/\* T05I-CAP-START[\s\S]*?\/\* T05I-CAP-END \*\//, capCss.trimEnd());
} else {
  css = css.trimEnd() + '\n\n' + capCss;
}
fs.writeFileSync(CSS, css);

console.log(`families bound: ${added} (leftover families w/o seats: ${leftover}; dup-twin excuses: ${dupAdd.length})`);
for (const bp of BPS) {
  const c = capBy[bp];
  console.log(bp, 't1', c.t1 && [c.t1.vr.x, c.t1.vr.y, c.t1.vr.w, c.t1.vr.h, c.t1.fs], 's1', c.s1 && [c.s1.vr.x, c.s1.vr.y, c.s1.vr.w, c.s1.vr.h, c.s1.fs], 'wrap', c.wrap && [c.wrap.vr.x, c.wrap.vr.w]);
}
