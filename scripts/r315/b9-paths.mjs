#!/usr/bin/env node
/**
 * R315 B9 — wordmark path audit (footer defect §0-F).
 *
 * Proves the drafted «مدارك» wordmark SVG (LandingPage.tsx) carries NO
 * self-intersecting contours — the exact class of artefact the retired
 * CSS text-stroke produced at «ك»/«د»: every path is flattened to
 * polylines (lines / quadratics sampled / circular arcs sampled) and
 * every non-adjacent segment pair is tested for crossings; joins that
 * share an endpoint (the drafting T-junctions, e.g. the meem head
 * tangent to its exit stroke) are allowed. Letters of the same variant
 * must clear one another by more than the stroke width.
 *
 * Usage: node scripts/r315/b9-paths.mjs
 */
import { readFileSync } from 'node:fs';

const tsx = readFileSync('frontend/src/pages/LandingPage.tsx', 'utf8');

/* the two wordmark svg blocks — extract their d="…" data in DOM order */
const blocks = [...tsx.matchAll(/className="fo-wordmark-svg[^"]*"[\s\S]*?viewBox="([^"]+)"[\s\S]*?<g className="fo-wordmark-ink">([\s\S]*?)<\/g>/g)];
if (blocks.length !== 2) {
  console.error(`FAIL — expected 2 wordmark svg blocks (wide + compact), found ${blocks.length}`);
  process.exit(1);
}

/* ── path parsing + flattening ─────────────────────────────────────── */
function parse(d) {
  /* command + its coordinate list */
  const out = [];
  const re = /([MLHVQAZ])|(-?\d+(?:\.\d+)?)/g;
  let m;
  let cur = null;
  while ((m = re.exec(d))) {
    if (m[1]) {
      cur = { cmd: m[1], args: [] };
      out.push(cur);
    } else if (cur) {
      cur.args.push(Number(m[2]));
    }
  }
  return out;
}

function flatten(d) {
  const pts = [];
  let cx = 0, cy = 0; /* current point */
  let sx = 0, sy = 0; /* subpath start */
  const push = (x, y) => pts.push([x, y]);
  for (const { cmd, args } of parse(d)) {
    if (cmd === 'M') {
      for (let i = 0; i + 1 < args.length; i += 2) {
        cx = args[i]; cy = args[i + 1];
        if (i === 0) { sx = cx; sy = cy; }
        push(cx, cy);
      }
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < args.length; i += 2) {
        cx = args[i]; cy = args[i + 1]; push(cx, cy);
      }
    } else if (cmd === 'H') {
      for (const x of args) { cx = x; push(cx, cy); }
    } else if (cmd === 'V') {
      for (const y of args) { cy = y; push(cx, cy); }
    } else if (cmd === 'Q') {
      for (let i = 0; i + 3 < args.length; i += 4) {
        const [qx, qy, x, y] = [args[i], args[i + 1], args[i + 2], args[i + 3]];
        const x0 = cx, y0 = cy;
        for (let k = 1; k <= 16; k++) {
          const u = k / 16, v = 1 - u;
          push(v * v * x0 + 2 * v * u * qx + u * u * x, v * v * y0 + 2 * v * u * qy + u * u * y);
        }
        cx = x; cy = y;
      }
    } else if (cmd === 'A') {
      for (let i = 0; i + 6 < args.length; i += 7) {
        /* circular arcs only (rx === ry, zero rotation — the drafted
         * wordmark's arcs). Endpoint-to-centre conversion (SVG F.6.5). */
        const rx = args[i], ry = args[i + 1];
        const large = args[i + 3], sweep = args[i + 4];
        const x = args[i + 5], y = args[i + 6];
        if (Math.abs(rx - ry) > 0.01) throw new Error('non-circular arc unsupported');
        const x1 = cx, y1 = cy, x2 = x, y2 = y;
        const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
        const lam = (rx * rx * ry * ry) / (rx * rx * dy * dy + ry * ry * dx * dx);
        const k = Math.sqrt(Math.max(0, lam - 1));
        const sgn = large === sweep ? -1 : 1;
        const ccx = sgn * k * (rx * dy) / ry + (x1 + x2) / 2;
        const ccy = sgn * k * (-ry * dx) / rx + (y1 + y2) / 2;
        const a1 = Math.atan2((y1 - ccy) / ry, (x1 - ccx) / rx);
        const a2 = Math.atan2((y2 - ccy) / ry, (x2 - ccx) / rx);
        let range = a2 - a1;
        if (sweep === 1 && range < 0) range += 2 * Math.PI;
        if (sweep === 0 && range > 0) range -= 2 * Math.PI;
        const steps = Math.max(12, Math.ceil((Math.abs(range) / (Math.PI / 2)) * 16));
        for (let j = 1; j <= steps; j++) {
          const a = a1 + (range * j) / steps;
          push(ccx + rx * Math.cos(a), ccy + ry * Math.sin(a));
        }
        cx = x; cy = y;
      }
    } else if (cmd === 'Z') {
      push(sx, sy); cx = sx; cy = sy;
    } else {
      throw new Error(`unhandled command ${cmd}`);
    }
  }
  return pts;
}

const segs = (pts) => {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]]);
  return out;
};

/* ── geometry ──────────────────────────────────────────────────────── */
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function segIntersect(p1, p2, p3, p4) {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    const t = d3 / (d3 - d4);
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  }
  return null;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function segSegDist(p1, p2, q1, q2) {
  const ptSeg = (p, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1)));
    return dist(p, [a[0] + t * abx, a[1] + t * aby]);
  };
  return Math.min(ptSeg(p1, q1, q2), ptSeg(p2, q1, q2), ptSeg(q1, p1, p2), ptSeg(q2, p1, p2));
}

/* ── audit ─────────────────────────────────────────────────────────── */
const LETTERS = ['ك', 'ر', 'ا', 'د', 'م'];
let failures = 0;
const report = [];

for (const [, viewBox, body] of blocks) {
  const paths = [...body.matchAll(/<path d="([^"]+)"\s*\/>/g)].map((m) => m[1]);
  if (paths.length !== 5) {
    console.error(`FAIL — viewBox ${viewBox}: expected 5 letter paths, found ${paths.length}`);
    process.exit(1);
  }
  const flat = paths.map(flatten);
  const strokeW = viewBox.includes('640') ? 8 : 6;

  for (let li = 0; li < 5; li++) {
    const S = segs(flat[li]);
    const ends = [flat[li][0], flat[li][flat[li].length - 1]];
    for (let i = 0; i < S.length; i++) {
      for (let j = i + 2; j < S.length; j++) {
        const hit = segIntersect(S[i][0], S[i][1], S[j][0], S[j][1]);
        if (!hit) continue;
        const nearEnd = ends.some((e) => dist(hit, e) < 0.75);
        if (nearEnd) continue; /* a drafting join at the contour's mouth */
        failures++;
        report.push(`viewBox ${viewBox} «${LETTERS[li]}»: segments ${i}×${j} cross at ${hit.map((n) => n.toFixed(1))}`);
      }
    }
  }

  /* inter-letter clearance: letters must clear one another by more
   * than the ink width (no touching glyphs, no merged contours) */
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 5; b++) {
      let min = Infinity;
      const A = segs(flat[a]);
      const B = segs(flat[b]);
      for (const s1 of A) for (const s2 of B) min = Math.min(min, segSegDist(s1[0], s1[1], s2[0], s2[1]));
      if (min <= strokeW) {
        failures++;
        report.push(`viewBox ${viewBox}: «${LETTERS[a]}» and «${LETTERS[b]}» clear by only ${min.toFixed(1)}u (≤ stroke ${strokeW}u)`);
      }
    }
  }
}

console.log(report.length ? report.join('\n') : 'PASS — 10 letter paths (2 variants × 5 letters): zero self-intersections, zero contour crossings, inter-letter clearance > stroke width.');
process.exit(failures ? 1 : 0);
