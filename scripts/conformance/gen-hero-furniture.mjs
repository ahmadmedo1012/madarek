#!/usr/bin/env node
/**
 * gen-hero-furniture.mjs — R366 L1 (Agent 1): the hero measured-seat rebuild
 * (v4 — the complete, final generator).
 *
 * Reads the FROZEN Heron hero specs, classifies every plate-zone element
 * (everything outside the content band = the h1 subtree, plus the band's
 * horizontally-overflowing strip tail; the art img keeps its documented R332
 * W1 excuse), and emits the complete furniture artifact set:
 *
 *   /tmp/hero-furniture/seats.json     — the full seat table
 *   /tmp/hero-furniture/hero-plate.css — seat geometry + per-seat visuals
 *   /tmp/hero-furniture/HeroPlate.tsx  — the component (placement law below)
 *   /tmp/hero-furniture/bindings.json  — mapping explicit entries
 *   /tmp/hero-furniture/prune.json     — superseded noCounterpart/plumbing
 *
 * LAWS:
 *  · every value is a measured parameter from the frozen spec (never tuned);
 *  · anchoring per seat, verified at the runner's own ±max(2px, 2% vw)
 *    tolerance across the desktop band (1920/1440/1024):
 *      inline: rem (RTL-mirrored) | % of the frozen img frame | per-band
 *      block:  rem | % of the frame | full-height/art-height calc | per-band
 *  · PLACEMENT LAW (the component): %-anchored seats live inside
 *    .hro-plate-art (the frozen img frame); rem/calc seats sit flat under
 *    .hro-plate-furniture (the plate) — no positioned nesting anywhere
 *    else (a nested absolute double-offsets the seat);
 *  · the per-seat visuals carry the measured bg / color / opacity /
 *    transition census seats (the at-rest register: the pins, the dark tag
 *    and the crosshair label sit at opacity 0 — the frozen census AND the
 *    live site agree; the reveal is scroll choreography);
 *  · mobile (≤767) mirrors the reference's own 390 collapse (display:none =
 *    the census's own 0×0).
 *
 * Usage: node scripts/conformance/gen-hero-furniture.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const SPEC_DIR = join(REPO, "docs", "redesign", "r335", "heron-spec");
const OUT = "/tmp/hero-furniture";
mkdirSync(OUT, { recursive: true });

const BPS = [
  { name: "1920", w: 1920, h: 1080, rf: (1920 * 0.5787037037) / 100 },
  { name: "1440", w: 1440, h: 900, rf: (1440 * 0.5787037037) / 100 },
  { name: "1024", w: 1024, h: 768, rf: (1024 * 0.5787037037) / 100 },
  { name: "768", w: 768, h: 900, rf: (768 * 1.1990407674) / 100 },
  { name: "390", w: 390, h: 844, rf: (390 * 2.5445292621) / 100 },
];
const DESK = ["1920", "1440", "1024"];
const BP = (n) => BPS.find((b) => b.name === n);
const R = (v) => Math.round(v * 10000) / 10000;
const F = (v) => (Math.round(v * 100) / 100).toString();
const GEOM_TOL_REM = 3.45;

const specs = {};
for (const bp of BPS) specs[bp.name] = JSON.parse(readFileSync(join(SPEC_DIR, `home-hero-wrap.${bp.name}.json`), "utf8"));

// ── classification (geometry, not paths — census paths repeat) ─────────────
function bandRootOf(bpName) {
  const els = specs[bpName].elements;
  const h1 = els.find((e) => e.tag === "h1");
  if (!h1) return null;
  const sec = els.find((e) => e.p === "home-hero-wrap > div[1]");
  const secBox = sec ? sec.vr : { x: 0, y: 0, w: 1e9, h: 1e9 };
  const contains = (o, i) => i.x >= o.x - 2 && i.y >= o.y - 2 && i.x + i.w <= o.x + o.w + 2 && i.y + i.h <= o.y + o.h + 2;
  const cands = els.filter((e) => e !== h1 && e.vr.w > 0 && contains(e.vr, h1.vr) && e.vr.h < secBox.h * 0.9 && e.vr.h > h1.vr.h * 1.2);
  if (!cands.length) return null;
  cands.sort((a, b) => b.vr.w * b.vr.h - a.vr.w * a.vr.h);
  return cands[0];
}
const BAND_ROOT = Object.fromEntries(BPS.map((b) => [b.name, bandRootOf(b.name)]));
const inBand = (bpName, el) => {
  const root = BAND_ROOT[bpName];
  if (!root) return false;
  const o = root.vr;
  return el.vr.x >= o.x - 2 && el.vr.y >= o.y - 2 && el.vr.x + el.vr.w <= o.x + o.w + 2 && el.vr.y + el.vr.h <= o.y + o.h + 2;
};
function indexByPath(bpName) {
  const map = new Map();
  for (const e of specs[bpName].elements) {
    if (!map.has(e.p)) map.set(e.p, []);
    map.get(e.p).push(e);
  }
  return map;
}
const IDX = Object.fromEntries(BPS.map((b) => [b.name, indexByPath(b.name)]));

// chain + anchors per bp
const P = {};
for (const bp of BPS) {
  const els = specs[bp.name].elements;
  const wrap = els[0];
  const cand = els.filter(
    (e) => !inBand(bp.name, e) && e.tag === "div" && e.vr.w > 0 && e.sr.y >= wrap.sr.y && e.sr.y < wrap.sr.y + wrap.vr.h * 0.12 && e.vr.h < wrap.vr.h * 0.95 && e.vr.h > wrap.vr.h * 0.55 && e.vr.w > wrap.vr.w * 0.95,
  );
  P[bp.name] = {
    wrap,
    box833: els[2] && els[2].vr.h < wrap.vr.h ? els[2] : cand[cand.length - 1],
    box700: els[4] && els[4].vr.h < wrap.vr.h * 0.9 ? els[4] : cand[cand.length - 1],
    band: BAND_ROOT[bp.name],
    img: els.find((e) => e.tag === "img") || null,
  };
}

// the plate zone at 1440: outside the band (and its overflow tail), not the img
const bandY1440 = BAND_ROOT["1440"] ? BAND_ROOT["1440"].vr.y : 760;
const baseEls = specs["1440"].elements;
const plateEls = baseEls.filter((e) => !inBand("1440", e) && e.tag !== "img" && e.vr.y < bandY1440 - 6);

const occurrences = new Map();
const seats = [];
let n = 0;
for (const e of plateEls) {
  const k = (occurrences.get(e.p) || 0) + 1;
  occurrences.set(e.p, k);
  n += 1;
  const xf = {};
  for (const bp of BPS) {
    const arr = IDX[bp.name].get(e.p);
    xf[bp.name] = (arr && arr[k - 1]) || null;
  }
  seats.push({ key: `hpf-${n}`, heron: e.p, ord: k, el: e, xf });
}

// ── anchoring per seat (runner tolerance) ──────────────────────────────────
const rf = (bpName) => BP(bpName).rf;
const mirrorInline = (bpName, e) => R((P[bpName].wrap.vr.w - e.sr.x - e.sr.w) / rf(bpName));
const topInPlate = (bpName, e) => R((e.sr.y - P[bpName].box700.sr.y) / rf(bpName));
const bottomInPlate = (bpName, e) => R((P[bpName].box700.sr.y + P[bpName].box700.sr.h - e.sr.y - e.sr.h) / rf(bpName));
const artFrac = (bpName, e) => {
  const img = P[bpName].img;
  if (!img) return null;
  return {
    fx: (e.sr.x + e.sr.w / 2 - img.sr.x - img.sr.w / 2) / img.sr.w,
    fy: (e.sr.y + e.sr.h / 2 - img.sr.y - img.sr.h / 2) / img.sr.h,
  };
};

const plate700 = P["1440"].box700;
const artW = P["1440"].img;
for (const s of seats) {
  const b = s.el;
  s.present = Object.fromEntries(BPS.map((bp) => [bp.name, !!s.xf[bp.name]]));
  const desk = DESK.filter((bp) => s.xf[bp]);
  const every = (pred) => desk.length >= 2 && desk.every(pred);
  if (Number(s.key.slice(4)) <= 6) {
    s.rule = "chain";
    s.iRule = s.bRule = s.wRule = s.hRule = "chain";
    continue;
  }
  const f0 = artFrac("1440", b);
  const wRemOk = every((bp) => Math.abs(s.xf[bp].sr.w / rf(bp) - b.sr.w / rf("1440")) <= GEOM_TOL_REM);
  const wArtOk = !wRemOk && every((bp) => Math.abs(s.xf[bp].sr.w / P[bp].img.sr.w - b.sr.w / artW.sr.w) <= 0.021) && Math.abs(b.sr.w - artW.sr.w) <= 4;
  const wPlateOk = !wRemOk && !wArtOk && every((bp) => Math.abs(s.xf[bp].sr.w / P[bp].box700.sr.w - b.sr.w / plate700.sr.w) <= 0.021) && Math.abs(b.sr.w - plate700.sr.w) <= 4;
  const hRemOk = every((bp) => Math.abs(s.xf[bp].sr.h / rf(bp) - b.sr.h / rf("1440")) <= GEOM_TOL_REM);
  const hArtOk = !hRemOk && every((bp) => Math.abs(bottomInPlate(bp, s.xf[bp]) - bottomInPlate("1440", b)) <= GEOM_TOL_REM) && Math.abs(b.sr.y + b.sr.h - (artW.sr.y + artW.sr.h)) <= 4;
  const hPlateOk = !hRemOk && !hArtOk && every((bp) => Math.abs(s.xf[bp].sr.y + s.xf[bp].sr.h - (P[bp].box700.sr.y + P[bp].box700.sr.h)) <= 4) && Math.abs(b.sr.y + b.sr.h - (plate700.sr.y + plate700.sr.h)) <= 4;
  const iRemOk = every((bp) => Math.abs(mirrorInline(bp, s.xf[bp]) - mirrorInline("1440", b)) <= GEOM_TOL_REM);
  const iArtOk = !iRemOk && !!f0 && every((bp) => { const f = artFrac(bp, s.xf[bp]); return f && Math.abs(f.fx - f0.fx) <= 0.021; });
  const bRemOk = every((bp) => Math.abs(topInPlate(bp, s.xf[bp]) - topInPlate("1440", b)) <= GEOM_TOL_REM);
  const bArtOk = !bRemOk && !!f0 && every((bp) => { const f = artFrac(bp, s.xf[bp]); return f && Math.abs(f.fy - f0.fy) <= 0.03; });
  s.wRule = wRemOk ? "rem" : wArtOk ? "artwidth" : wPlateOk ? "platewidth" : "perbp";
  s.hRule = hRemOk ? "rem" : hArtOk ? "artheight" : hPlateOk ? "fullh" : "perbp";
  s.iRule = iRemOk ? "rem" : iArtOk ? "artpct" : "perbp";
  s.bRule = bRemOk ? "rem" : bArtOk ? "artpct" : "perbp";
  s.rule = `${s.iRule}·${s.wRule}/${s.bRule}·${s.hRule}`;
}

// ── family classification (for the component's visual classes) ──────────────
function familyOf(s) {
  const b = s.box1440, w = b.w, h = b.h;
  if (Number(s.key.slice(4)) <= 6) return "chain";
  if (s.tag === "svg") return w === 10 ? "corner-svg" : w === 5 ? "pin-svg" : "icon-svg";
  if (s.tag === "path") return w === 0 || h === 0 ? "corner-path" : "pin-path";
  if (s.tag === "circle") return "icon-circle";
  if (s.tag === "span") return "xhair-label-span";
  if (w >= 1300 && h <= 2) return s.bg === "rgb(224, 224, 218)" ? "line-h-solid" : s.bg === "rgb(250, 54, 0)" ? "line-h-ember" : "line-h";
  if (w <= 2 && h > 300) return s.bg === "rgb(250, 54, 0)" ? "line-v-ember" : "line-v";
  if (h >= 6 && h <= 8 && w > 1300) return "edge-h";
  if (w >= 6 && w <= 8 && h > 600) return "edge-v";
  if (w === 10 && h === 10) return "corner";
  if (w === 8 && h === 8) return "xhair";
  if ((w === 2 && h === 8) || (w === 8 && h === 2)) return "xhair-leg";
  if (w === 40 && h <= 22) return "xhair-label";
  if (w === 130 && h === 35) return "plate-dark";
  if (w === 117 && h === 22) return "plate-dark-text";
  if (w === 200 && (h === 96 || h === 80)) return "pin-wrap";
  if (w === 12 && h === 12) return s.bg === "rgb(250, 54, 0)" ? "pin-ember" : "pin-dot";
  if (w === 5 && h === 5) return "pin-mark";
  if (w === 4 && h === 4) return "pin-mark";
  if ((w === 56 || w === 62) && h === 12) return "pin-title";
  if (w === 162) return "pin-desc";
  if (w === 687 && h === 323) return "quad";
  if (w === 1373 && h === 647) return "setwrap";
  if (w === 1407 && h === 680) return "framewrap";
  if (w > 1400 && h > 600) return "wrapbig";
  return "misc";
}

// ── seats.json ──────────────────────────────────────────────────────────────
const seatsOut = seats.map((s) => ({
  key: s.key, heron: s.heron, ord: s.ord, tag: s.el.tag, tc: s.el.tc, leaf: s.el.leaf,
  rule: s.rule, iRule: s.iRule, wRule: s.wRule, bRule: s.bRule, hRule: s.hRule,
  box1440: s.el.vr, sr1440: s.el.sr, fs: s.el.fs, lh: s.el.lh, fw: s.el.fw,
  color: s.el.color, bg: s.el.bg, bgImg: s.el.bgImg, opacity: s.el.opacity,
  border: s.el.border, transition: s.el.transition, interactive: s.el.interactive,
  present: s.present,
  perBp: Object.fromEntries(BPS.map((bp) => [bp.name, s.xf[bp.name] ? { vr: s.xf[bp.name].vr, sr: s.xf[bp.name].sr } : null])),
}));
for (const s of seatsOut) s.family = familyOf(s);
writeFileSync(join(OUT, "seats.json"), JSON.stringify(seatsOut, null, 1));

// ── bindings.json + prune.json ──────────────────────────────────────────────
const bindings = seats.map((s) => ({
  section: "home-hero-wrap",
  heron: s.heron,
  spec: s.heron,
  ours: s.key,
  ...(Object.values(s.present).every(Boolean) ? {} : { bps: Object.entries(s.present).filter(([, v]) => v).map(([k]) => k) }),
  _note: `R366 hero plate furniture seat (${s.rule})`,
}));
writeFileSync(join(OUT, "bindings.json"), JSON.stringify(bindings, null, 1));

const mapping = JSON.parse(readFileSync(join(REPO, "scripts/conformance/mapping/home-hero-wrap.json"), "utf8"));
const boundHeron = new Set(bindings.map((b) => b.heron));
const prune = {
  noCounterpart: (mapping.noCounterpart || []).map((e, i) => ({ i, heron: e.heron })).filter((e) => (typeof e.heron === "string" ? boundHeron.has(e.heron) : Object.values(e.heron).some((p) => boundHeron.has(p)))),
  plumbing: (mapping.plumbing || []).map((e, i) => ({ i, heron: e.heron })).filter((e) => boundHeron.has(e.heron)),
};
writeFileSync(join(OUT, "prune.json"), JSON.stringify(prune, null, 1));

// ── hero-plate.css (geometry + per-seat visuals) ────────────────────────────
const artPctInline = (b) => {
  const f0 = artFrac("1440", b);
  const fw = b.sr.w / P["1440"].img.sr.w;
  return (0.5 - f0.fx - fw / 2) * 100;
};
const artPctTop = (b) => {
  const f0 = artFrac("1440", b);
  const fh = b.sr.h / P["1440"].img.sr.h;
  return (0.5 + f0.fy - fh / 2) * 100;
};
const anchorOf = (s) => (s.iRule === "artpct" || s.bRule === "artpct" || s.key === "hpf-47" ? "img" : "plate");
const rowFor = (s, bpName, o) => {
  if (!o) return null;
  if (o.vr.w === 0 && o.vr.h === 0) return "display: none";
  const f = artFrac(bpName, o);
  const plate = P[bpName].box700;
  const anchor = P[bpName][anchorOf(s)] || plate; // the seat's positioning parent
  const r = rf(bpName);
  // rem offsets are ANCHOR-relative (the placement law: art-frame seats
  // measure from the img box, flat seats from the plate box)
  const inline = s.iRule === "artpct" && f ? `inset-inline-start: ${F((0.5 - f.fx - (o.sr.w / P[bpName].img.sr.w) / 2) * 100)}%` : `inset-inline-start: ${F((anchor.sr.x + anchor.sr.w - o.sr.x - o.sr.w) / r)}rem`;
  const block = s.bRule === "artpct" && f ? `inset-block-start: ${F((0.5 + f.fy - (o.sr.h / P[bpName].img.sr.h) / 2) * 100)}%` : `inset-block-start: ${F((o.sr.y - anchor.sr.y) / r)}rem`;
  let w = `inline-size: ${F(o.sr.w / r)}rem`;
  if (s.wRule === "artwidth" && Math.abs(o.sr.w - P[bpName].img.sr.w) <= 4) w = `inline-size: calc(100% - ${F(((plate.sr.w - o.sr.w) / 2) * 2 / r)}rem)`;
  if (s.wRule === "platewidth" && Math.abs(o.sr.w - plate.sr.w) <= 4) w = "inline-size: 100%";
  let h = `block-size: ${F(o.sr.h / r)}rem`;
  if (s.hRule === "artheight" || s.hRule === "fullh") {
    const topRem = (o.sr.y - anchor.sr.y) / r;
    const bottomRem = (anchor.sr.y + anchor.sr.h - o.sr.y - o.sr.h) / r;
    h = `block-size: calc(100% - ${F(topRem + bottomRem)}rem)`;
  }
  return `${inline}; ${block}; ${w}; ${h}`;
};

// per-seat visual props (the measured bg/color/opacity/type/transition census)
const visualProps = {};
for (const s of seatsOut) {
  if (s.family === "chain") continue;
  const props = [];
  if (s.bg === "rgb(224, 224, 218)") props.push("background-color: var(--hpf-rule)");
  else if (s.bg === "rgb(250, 54, 0)") props.push("background-color: var(--accent)");
  else if (s.bg === "rgb(40, 40, 40)") props.push("background-color: var(--hpf-ink-solid)");
  else if (s.bg === "rgb(255, 255, 255)") props.push("background-color: var(--hpf-dot)");
  else if (s.bgImg) props.push("background-color: transparent; background-image: linear-gradient(var(--hpf-rule), var(--hpf-rule))");
  if (s.color === "rgb(250, 54, 0)") props.push("color: var(--accent)");
  else if (s.color === "rgb(255, 255, 255)") props.push("color: var(--hpf-dot)");
  else if (s.color === "rgb(40, 40, 40)") props.push("color: var(--hpf-ink-solid)");
  if (s.opacity !== 1) props.push(`opacity: ${s.opacity}`);
  if (s.transition) {
    const dur = String(s.transition.d).split(",")[0].trim();
    const ease = String(s.transition.e).split(",")[0].trim();
    const prop = String(s.transition.p).split(",")[0].trim();
    props.push(`transition: ${prop} ${dur} ${ease}`);
  }
  if (s.tc !== "none") {
    const fsR = Math.round((s.fs / 8.3333) * 10000) / 10000;
    const lhFloor = Math.max(parseFloat(s.lh) || 0, 1.35 * s.fs);
    const lhR = Math.round((lhFloor / 8.3333) * 10000) / 10000;
    const colorVar = s.color === "rgb(255, 255, 255)" ? "var(--hpf-dot)" : "var(--hpf-ink)";
    const typeProps = [`font-size: ${F(fsR)}rem`, `line-height: ${F(lhR)}rem`, "font-weight: var(--fw-medium)"];
    if (!["rgb(250, 54, 0)", "rgb(255, 255, 255)", "rgb(40, 40, 40)"].includes(s.color)) typeProps.push(`color: ${colorVar}`);
    props.push(...typeProps);
  }
  visualProps[s.key] = props;
}

let css = "";
for (const s of seats) {
  if (s.rule === "chain") continue;
  const b = s.el;
  const extra = visualProps[s.key] && visualProps[s.key].length ? "; " + visualProps[s.key].join("; ") : "";
  css += `.${s.key} { position: absolute; ${rowFor(s, "1440", b)}${extra}; }\n`;
  // the tablet band (768-991, the 1.199vw root) is its own composition —
  // the rem values are not portable across the root change, so EVERY seat
  // carries its measured tablet row
  {
    const o = s.xf["768"];
    if (o) {
      const row = rowFor(s, "768", o);
      if (row) css += `@media (min-width: 768px) and (max-width: 991px) { .${s.key} { ${row}; } }\n`;
    }
  }
  if (s.iRule === "perbp" || s.bRule === "perbp" || s.wRule === "perbp" || s.hRule === "perbp") {
    for (const [bpName, mq] of [["1920", "@media (min-width: 1680px)"], ["1024", "@media (min-width: 992px) and (max-width: 1200px)"]]) {
      const o = s.xf[bpName];
      if (!o) continue;
      const row = rowFor(s, bpName, o);
      if (row) css += `${mq} { .${s.key} { ${row}; } }\n`;
    }
  }
  const o390 = s.xf["390"];
  if (!o390 || (o390.vr.w === 0 && o390.vr.h === 0)) {
    css += `@media (max-width: 767px) { .${s.key} { display: none; } }\n`;
  } else {
    css += `@media (max-width: 767px) { .${s.key} { ${rowFor(s, "390", o390)}; } }\n`;
  }
}
css += `/* the corner/pin strokes */\n.hpf-corner-svg, .hpf-pin-svg { display: block; }\n.hpf-corner-svg path, .hpf-pin-svg path { stroke: currentColor; stroke-width: 1; fill: none; }\n`;
writeFileSync(join(OUT, "hero-plate.css"), css);

// ── HeroPlate.tsx (placement law + curated text map + svg paths) ───────────
const SEAT_TEXT = {
  "hpf-14": "٠١", "hpf-15": "محور", "hpf-16": "٠٢", "hpf-17": "قياس",
  "hpf-20": "قاعة المحاضرة ٠١ — قيد القياس",
  "hpf-58": "محاضرة", "hpf-59": "جلسة تفاعلية بنقاط فحص مقيسة",
  "hpf-68": "مكتبة", "hpf-69": "بحوث مفهرسة تبقى",
};
const SVG_PATHS = {
  "hpf-30": "M5 0V10", "hpf-31": "M0 5H10", "hpf-35": "M5 0V10", "hpf-36": "M0 5H10",
  "hpf-40": "M5 0V10", "hpf-41": "M0 5H10", "hpf-45": "M5 0V10", "hpf-46": "M0 5H10",
  "hpf-56": "M0.5 0.5H4.5V4.5H0.5Z", "hpf-66": "M0.5 0.5H4.5V4.5H0.5Z",
};
const SVG_KIDS = {
  "hpf-29": ["hpf-30", "hpf-31"], "hpf-34": ["hpf-35", "hpf-36"], "hpf-39": ["hpf-40", "hpf-41"],
  "hpf-44": ["hpf-45", "hpf-46"], "hpf-55": ["hpf-56"], "hpf-65": ["hpf-66"],
};
const svgDone = new Set();
const seatRow = (s) => {
  if (s.tag === "path") return null; // paths render inside their svg
  if (s.tag === "svg") {
    const kids = (SVG_KIDS[s.key] || []).map((pk) => `          <path className="${pk}" data-spec="${pk}" d="${SVG_PATHS[pk]}" />`).join("\n");
    return `      <svg className="${s.key}" data-spec="${s.key}" viewBox="0 0 ${s.box1440.w} ${s.box1440.h}" aria-hidden="true">\n${kids}\n      </svg>`;
  }
  if (s.key === "hpf-47") return null; // hpf-47 IS the art frame (rendered by the wrapper)
  const txt = SEAT_TEXT[s.key];
  return `      <${s.tag} className="${s.key}" data-spec="${s.key}"${txt ? `>${txt}</${s.tag}>` : " />"}`;
};
const inArt = (s) => s.iRule === "artpct" || s.bRule === "artpct" || s.key === "hpf-47"; // = anchorOf
const artRows = [], flatRows = [];
for (const s of seatsOut) {
  if (s.family === "chain") continue;
  if (s.tag === "svg") svgDone.add(s.key);
  const row = seatRow(s);
  if (!row) continue;
  (inArt(s) ? artRows : flatRows).push(row);
}
let tsx = `/* HeroPlate.tsx — R366 L1 (Agent 1): GENERATED by scripts/conformance/
 * gen-hero-furniture.mjs from the FROZEN Heron spec (geometry + register in
 * hero-plate.css; every value a measured parameter — AGENTS.md §6 law).
 *
 * PLACEMENT LAW: the %-anchored seats (artwork-tracking) live inside
 * .hro-plate-art (the frozen img frame); the rem/calc-anchored seats sit
 * flat under .hro-plate-furniture (the plate). No positioned nesting
 * anywhere else — a nested absolute would double-offset the seat.
 *
 * The furniture is the reference's own AT-REST register: the pins, the dark
 * tag and the crosshair label sit at opacity 0 (the frozen census AND the
 * live site agree — the reveal is scroll choreography); the corner brackets
 * carry the measured 0.4s ease transform seat. The R347 D4 loud chrome
 * stays retired. Labels carry the Arabic instrument register
 * (Libyan-education terms, the census's own tc seats). Inert chrome:
 * aria-hidden, pointer-events none. */
import type { ReactNode } from 'react';
import '../../../styles/landing/hero-plate.css';

/** The wrapper chain: the art inside the plate seat, the content inside the
 *  measured closing band. */
export function HeroPlate({ art, band }: { art: ReactNode; band: ReactNode }) {
  return (
    <div className="hro-chain">
      <div className="hpf-1" data-spec="hpf-1">
        <section className="hpf-2" data-spec="hpf-2">
          <div className="hpf-3" data-spec="hpf-3">
            <div className="hpf-4" data-spec="hpf-4">
              <div className="hpf-5" data-spec="hpf-5">
                <div className="hpf-6" data-spec="hpf-6">
                  <div className="hro-plate-host">{art}</div>
                  <HeroPlateFurniture />
                </div>
              </div>
              <div className="hro-bandhost">{band}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** The plate furniture — the measured seats (hero-plate.css). */
export function HeroPlateFurniture() {
  return (
    <div className="hro-plate-furniture" aria-hidden="true">
      {/* the art frame — the frozen img box; hosts the artwork-tracking seats */}
      <div className="hro-plate-art" data-spec="hpf-47">
`;
tsx += artRows.join("\n") + "\n";
tsx += `      </div>
`;
tsx += flatRows.join("\n") + "\n";
tsx += `    </div>
  );
}
`;
writeFileSync(join(OUT, "HeroPlate.tsx"), tsx);

// ── summary ─────────────────────────────────────────────────────────────────
const ruleCounts = {};
for (const s of seats) ruleCounts[s.rule] = (ruleCounts[s.rule] || 0) + 1;
const perBp = {};
for (const bp of BPS) perBp[bp.name] = seats.filter((s) => s.present[bp.name]).length;
console.log(`plate-zone seats: ${seats.length}`);
console.log("rules:", JSON.stringify(ruleCounts));
console.log("prunable noCounterpart:", prune.noCounterpart.length, "| plumbing:", prune.plumbing.length);
console.log("seats present per bp:", JSON.stringify(perBp));
console.log("art-frame seats:", seatsOut.filter((s) => s.family !== "chain" && inArt(s)).length, "| flat seats:", seatsOut.filter((s) => s.family !== "chain" && !inArt(s)).length);
