/**
 * tolerances.mjs — R336 conformance comparison functions (v2 —
 * TRANSFORMED EXPECTATIONS, not waivers).
 *
 * The R335 lesson (exceptionRate 20.4% against a <5% cap): the three
 * Arabic adaptations were encoded as *exceptions* — assertions that
 * pass by waving a flag. A pass-rate built on waivers is a self-graded
 * metric (the R329 fidelity-score failure mode). v2 encodes them as
 * expectations that are TRANSFORMED before comparison, so they assert
 * exactly as strongly as the raw fields did:
 *
 *   x-geometry   MIRRORED by construction: the expected value IS the
 *                distance-from-viewport-center (our page is RTL,
 *                Heron LTR — the axis is flipped by design). Compared
 *                like any other number, same ±2px/±2% tolerance.
 *   letterSpacing  Arabic joins forbid tracking → the EXPECTED value
 *                is 0 by definition of the adaptation; ours must be
 *                |ls| ≤ 0.05em. Not an exception — the transformed
 *                spec itself.
 *   lineHeight   Arabic ascenders/descenders need ≥1.35 metric box:
 *                expected = max(heronLh, 1.35 × fs); ours must be
 *                within ±0.5px of that (or ≥ the floor when Heron's
 *                own box is already taller — then normal comparison).
 *
 * What REMAINS a real exception (exceptions.json, capped <5%): only
 * true waivers — today just ar-text-length-class (Arabic copy is more
 * compact; ±1 length class) — each with a reason, counted and
 * reported so the rate stays visible.
 *
 * All other tolerances unchanged from R335:
 *   geometry ±2px or ±2% of viewport (whichever larger)
 *   fontSize/lh ±0.5px × mapping.scaleFactor · fontWeight ±1 step (100)
 *   colors text exact rgb; bg distance ≤ 8 · radius ±2px · opacity ±0.05
 *   durations ±10% · easings cubic-bezier sample distance <0.05
 *   triggers/pins ±5% vh · section height ±2% vh
 */

// ── gsap ease → cubic-bezier lookup (~12 common eases) ──────────────────────
export const EASE_TABLE = {
  "none": "linear",
  "linear": "linear",
  "power1.out": [0.25, 1, 0.5, 1],
  "power2.out": [0.33, 1, 0.68, 1],
  "power3.out": [0.22, 1, 0.36, 1],
  "power4.out": [0.165, 1, 0.3, 1],
  "expo.out": [0.16, 1, 0.3, 1],
  "sine.out": [0.39, 0.575, 0.565, 1],
  "circ.out": [0, 0.55, 0.45, 1],
  "back.out": [0.34, 1.56, 0.64, 1],
  "power1.in": [0.5, 0, 0.75, 0],
  "power2.in": [0.55, 0.055, 0.675, 0.19],
  "power3.in": [0.55, 0, 1, 0.45],
  "power1.inout": [0.45, 0, 0.55, 1],
  "power2.inout": [0.45, 0, 0.55, 1],
  "power3.inout": [0.65, 0, 0.35, 1],
  "sine.inout": [0.445, 0.05, 0.55, 0.95],
  "expo.inout": [0.87, 0, 0.13, 1],
  "circ.inout": [0.785, 0.135, 0.15, 0.86],
  "back.in": [0.6, -0.28, 0.735, 0.045],
  "back.inout": [0.68, -0.55, 0.265, 1.55],
};

/** Resolve any easing spec (gsap name | CSS keyword | cubic-bezier string) →
 *  "linear" | [x1,y1,x2,y2] | null. */
export function parseEase(spec) {
  if (spec == null) return null;
  const s = String(spec).trim().toLowerCase().replace(/\s+/g, "");
  const cb = s.match(/cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/);
  if (cb) return [Number(cb[1]), Number(cb[2]), Number(cb[3]), Number(cb[4])];
  if (s === "linear") return "linear";
  const kw = { ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1] };
  if (kw[s]) return kw[s];
  if (EASE_TABLE[s]) return EASE_TABLE[s];
  if (EASE_TABLE[s + ".out"]) return EASE_TABLE[s + ".out"];
  return null;
}

/** Sample an easing curve at 12 points → y values (x uniformly 0..1). */
export function sampleCurve(curve, n = 12) {
  if (curve === "linear") return Array.from({ length: n }, (_, i) => i / (n - 1));
  const [x1, y1, x2, y2] = curve;
  const bx = (t) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3;
  const by = (t) => 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
  const solve = (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2;
      if (bx(t) < x) lo = t; else hi = t;
    }
    return by(t);
  };
  return Array.from({ length: n }, (_, i) => solve(i / (n - 1)));
}

export function curveDistance(a, b) {
  const sa = sampleCurve(a), sb = sampleCurve(b);
  let max = 0;
  for (let i = 0; i < sa.length; i++) max = Math.max(max, Math.abs(sa[i] - sb[i]));
  return max;
}

// ── value parsing ────────────────────────────────────────────────────────────
export const num = (v) => (typeof v === "number" ? v : v == null ? NaN : parseFloat(String(v).replace("px", "")) || (String(v).trim().startsWith("-") ? -0 : 0));
export const pxNum = (v) => (v == null || v === "normal" ? 0 : typeof v === "number" ? v : parseFloat(v) || 0);

export function parseColor(c) {
  if (!c || c === "transparent") return [0, 0, 0, 0];
  const m = String(c).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts.length > 3 ? parts[3] : 1];
}
export const colorDist = (a, b) => {
  const A = parseColor(a), B = parseColor(b);
  if (!A || !B) return Infinity;
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};
export const sameRgb = (a, b) => {
  const A = parseColor(a), B = parseColor(b);
  if (!A || !B) return false;
  return A[0] === B[0] && A[1] === B[1] && A[2] === B[2] && Math.abs(A[3] - B[3]) <= 0.02;
};

// ── assertions: each returns {pass, exception?, kind, expected, actual}
//    or null when not applicable (skipped, uncounted). ────────────────────────
//    v2: `exception: true` marks ONLY true waivers (exceptions.json);
//    transformed expectations pass/fail like any raw field. ──────────────────
const R = (kind, pass, expected, actual, exception = false) => ({
  pass, exception, kind,
  expected, actual,
  delta: pass ? 0 : Math.abs(Number(expected) - Number(actual)) || (pass ? 0 : 1),
});

const geomTol = (v, view) => Math.max(2, 0.02 * view);

// x — TRANSFORMED EXPECTATION (RTL mirror): both sides are expressed as
// distance-from-viewport-center; same tolerance as any geometry number.
export function aX(h, o, vw) {
  const exp = Math.abs((h.sr.x + h.sr.w / 2) - vw / 2);
  const act = Math.abs((o.sr.x + o.sr.w / 2) - vw / 2);
  const d = Math.abs(exp - act);
  return { ...R("x-mirror", d <= geomTol(o.sr.w, vw), Math.round(exp), Math.round(act)), rule: "rtl-x-mirror(transformed)", delta: d };
}
export function aY(h, o, vh) {
  const d = Math.abs(h.sr.y - o.sr.y);
  return { ...R("y", d <= geomTol(h.sr.y, vh), h.sr.y, o.sr.y), delta: d };
}
export function aW(h, o, vw) {
  const d = Math.abs(h.sr.w - o.sr.w);
  return { ...R("w", d <= geomTol(h.sr.w, vw), h.sr.w, o.sr.w), delta: d };
}
export function aH(h, o, vh) {
  const d = Math.abs(h.sr.h - o.sr.h);
  return { ...R("h", d <= geomTol(h.sr.h, vh), h.sr.h, o.sr.h), delta: d };
}
export function aTag(h, o) {
  return R("tag", h.tag === o.tag, h.tag, o.tag);
}
const TC_ORDER = ["none", "short", "medium", "long"];
// tc — the ONE remaining true waiver (Arabic is more compact; ±1 class).
export function aTc(h, o) {
  const i = TC_ORDER.indexOf(h.tc), j = TC_ORDER.indexOf(o.tc);
  if (i === j) return R("tc", true, h.tc, o.tc);
  const ok = Math.abs(i - j) === 1;
  return { ...R("tc", ok, h.tc, o.tc, ok), rule: ok ? "ar-text-length-class" : null };
}
export function aFs(h, o, scale = 1) {
  const hv = num(h.fs), ov = num(o.fs);
  if (Number.isNaN(hv) || Number.isNaN(ov)) return null;
  const d = Math.abs(hv - ov);
  return { ...R("fontSize", d <= 0.5 * scale, hv, ov), delta: d };
}
// lh — TRANSFORMED EXPECTATION (Arabic metric floor): the expected value is
// max(heronLh, 1.35 × heronFs) — the taller box Arabic ascenders need — and
// ours must be within ±0.5px × scale of it. No waiver flag.
export function aLh(h, o, scale = 1) {
  const hv = num(h.lh), ov = num(o.lh);
  if (Number.isNaN(hv) || Number.isNaN(ov) || hv === 0 || ov === 0) return null;
  const hfs = num(h.fs) || 16;
  const exp = Math.max(hv, 1.35 * hfs);
  const d = Math.abs(exp - ov);
  return { ...R("lineHeight", d <= 0.5 * scale, Math.round(exp * 100) / 100, ov), rule: "ar-line-height-floor(transformed)", delta: d };
}
export function aFw(h, o) {
  const step = (w) => (String(w).toLowerCase() === "bold" ? 700 : String(w).toLowerCase() === "normal" ? 400 : num(w));
  const hv = step(h.fw), ov = step(o.fw);
  if (Number.isNaN(hv) || Number.isNaN(ov)) return null;
  return R("fontWeight", Math.abs(hv - ov) <= 100, hv, ov);
}
// ls — TRANSFORMED EXPECTATION (Arabic letter joins): the expected value is
// 0 by definition of the adaptation; ours must satisfy |ls| ≤ 0.05em.
export function aLs(h, o) {
  const of = num(o.fs) || 16;
  const ols = o.ls === "normal" ? 0 : pxNum(o.ls);
  const ok = Math.abs(ols) <= 0.05 * of;
  return { ...R("letterSpacing", ok, 0, ols), rule: "ar-letter-spacing-zero(transformed)", delta: Math.abs(ols) };
}
export function aColor(h, o) {
  return R("color", sameRgb(h.color, o.color), h.color, o.color);
}
export function aBg(h, o) {
  const d = colorDist(h.bg, o.bg);
  return { ...R("bg", d <= 8, h.bg, o.bg), delta: d };
}
export function aRadius(h, o) {
  const hv = num(h.radius), ov = num(o.radius);
  if (!hv && !ov) return null;
  const d = Math.abs(hv - ov);
  return { ...R("borderRadius", d <= 2, hv, ov), delta: d };
}
export function aOpacity(h, o) {
  const d = Math.abs(Number(h.opacity) - Number(o.opacity));
  return { ...R("opacity", d <= 0.05, h.opacity, o.opacity), delta: d };
}
export function aBorder(h, o) {
  if (!h.border) return null;
  const hw = num(h.border.w), ow = o.border ? num(o.border.w) : 0;
  const d = Math.abs(hw - ow);
  return { ...R("border", d <= 2 && (o.border ? o.border.style !== "none" : false), h.border.w, o.border ? o.border.w : "none"), delta: d };
}
export function aInteractive(h, o) {
  return R("interactive", !!h.interactive === !!o.interactive, h.interactive, o.interactive);
}
export function aTransition(h, o) {
  if (!h.transition) return null;
  const dur = (d) => parseFloat(String(d || "0s")) || 0;
  const hd = dur(h.transition.d), od = o.transition ? dur(o.transition.d) : 0;
  if (hd === 0) return null;
  const durOk = Math.abs(hd - od) <= Math.max(0.10 * hd, 0.01);
  const he = parseEase(h.transition.e), oe = o.transition ? parseEase(o.transition.e) : null;
  let easeOk = false, easeDist = null;
  if (he && oe) {
    if (he === "linear" || oe === "linear") easeOk = he === oe;
    else { easeDist = curveDistance(he, oe); easeOk = easeDist < 0.05; }
  } else if (!he && !oe) easeOk = String(h.transition.e) === String(o.transition.e);
  return {
    ...R("transition", durOk && easeOk, `${hd}s/${h.transition.e}`, `${od}s/${o.transition ? o.transition.e : "none"}`),
    delta: Math.abs(hd - od) * 100 + (easeDist ?? (easeOk ? 0 : 1)),
  };
}

// ── page-level (from _page marks + scroll walk) ─────────────────────────────
export function aSectionVh(heronHvh, ourHvh) {
  const d = Math.abs(heronHvh - ourHvh);
  return { ...R("sectionHeightVh", d <= 0.02, heronHvh, ourHvh), delta: d * 1000 };
}
export function aPinSpan(hSpan, oSpan) {
  if (!hSpan && !oSpan) return null;
  if (!hSpan || !oSpan) return R("pinRange", false, hSpan || "none", oSpan || "none");
  const d = Math.max(Math.abs(hSpan[0] - oSpan[0]), Math.abs(hSpan[1] - oSpan[1]));
  return { ...R("pinRange", d <= 0.05, hSpan, oSpan), delta: d * 1000 };
}

/** Pin spans from columnar marks: consecutive rows where topVh[key] stays
 * constant (|Δ| < 0.003) and non-null → [[startYvh, endYvh], …]. */
export function pinSpans(marks, keyIdx, yToVh) {
  const rows = marks.rows || [];
  const spans = [];
  let cur = null, prevTop = null;
  for (const [y, tops] of rows) {
    const t = tops[keyIdx];
    if (t == null) { if (cur) { spans.push(cur); cur = null; } prevTop = null; continue; }
    if (prevTop != null && Math.abs(t - prevTop) < 0.003) {
      cur[1] = yToVh(y);
    } else {
      if (cur) spans.push(cur);
      cur = [yToVh(y), yToVh(y)];
    }
    prevTop = t;
  }
  if (cur) spans.push(cur);
  return spans.filter(([a, b]) => b - a >= 0.02);
}
