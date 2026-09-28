import { useEffect, useRef, useState } from 'react';

/**
 * OrbitScene — «مدارات المعرفة» canvas engine.
 *
 * The living centerpiece of the immersive landing: a deep-night sky where
 * knowledge nodes travel along elliptical orbits, connect into
 * constellations, and a bright "traveller" (the learner) journeys between
 * orbits leaving a fading golden trail.
 *
 * ── Craft contract (docs/immersive-redesign-plan.md §5) ──────────────
 * · Zero dependencies — Canvas 2D + one rAF loop.
 * · DPR capped at 2 (1.5 under 768px — ~44% less paint area on mobile);
 *   density scales with viewport area.
 * · Fully paused when offscreen (IntersectionObserver) or tab hidden.
 * · prefers-reduced-motion → one high-quality static frame, no loop.
 * · navigator.saveData / low deviceMemory → reduced density.
 * · Any canvas failure → component unmounts itself; the hero's CSS
 *   gradient + SVG star fallback carries the scene (page stays complete).
 * · Every listener + rAF + observer is cleaned up on unmount.
 *
 * ── Render-budget contract (perf audit, task 4-d) ────────────────────
 * · Zero per-frame string allocations: stars, links, orbit rings, the
 *   trail and node cores all draw through style strings precomputed once
 *   at module scope (quantized buckets).
 * · Stars batch into 9 fill buckets (ink/gold/azure × 3 alpha tiers) —
 *   one beginPath + one fill per bucket per frame instead of one
 *   beginPath/arc/fill + fresh rgba() string per star.
 * · Scroll progress derives from a cached document-space offsetTop plus
 *   window.scrollY: the scroll listener never reads layout, early-returns
 *   while the scene is offscreen, and coalesces to one update per rAF.
 * · Resize work coalesces into one rAF; the star field rebuilds
 *   deterministically from a per-mount seed (mobile URL-bar jitter never
 *   re-randomizes the sky) and the nebula repaints only when the size
 *   actually moved by >2px.
 * · Internal scroll-velocity smoothing (no new props, no external
 *   events): traveller speed and star-twinkle cadence subtly react to
 *   how fast the user scrolls.
 */

type Density = 'full' | 'low';

export type OrbitSceneProps = {
  className?: string;
  /** Force a density tier (used by tests / embeds). Default: auto. */
  density?: Density;
  /**
   * Horizontal bias of the orbital system, −1 … 1 (0 = centered).
   * The hero passes a negative value so the visual mass sits opposite
   * the RTL text column, keeping the composition asymmetric.
   */
  biasX?: number;
  /** Ambient rotation speed multiplier. 1 = default. */
  speed?: number;
};

type Star = { x: number; y: number; r: number; phase: number; bucket: number };
type Node = {
  orbit: number;
  angle: number;
  omega: number;
  r: number;
  color: 'gold' | 'azure' | 'mist';
};
type TrailPoint = { x: number; y: number };
type NodePoint = { x: number; y: number; r: number; color: Node['color'] };

const NODE_COLORS = {
  gold: [233, 180, 76],
  azure: [111, 168, 255],
  mist: [168, 178, 210],
} as const;

const GOLD = NODE_COLORS.gold;
const INK_RGB = [242, 239, 230] as const; // warm white — matches --ln-ink

const ORBITS = [
  { rx: 0.3, ry: 0.115, rot: -0.38, omega: 0.00016, mist: 0.16 },
  { rx: 0.44, ry: 0.185, rot: -0.32, omega: 0.00011, mist: 0.12 },
  { rx: 0.58, ry: 0.26, rot: -0.27, omega: 0.00008, mist: 0.09 },
  { rx: 0.72, ry: 0.335, rot: -0.22, omega: 0.00006, mist: 0.07 },
];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function rgbaStr(rgb: readonly number[], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/** Deterministic PRNG — the star field rebuilds identically across resizes. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── precomputed paint styles (built once at module scope, never per frame)
//
// Star buckets: ink/gold/azure × 3 alpha tiers → 9 fill styles. The
// twinkle is expressed as a subtle radius modulation (perceived
// brightness tracks r², matching the old 0.6–1.0 alpha swing) so the
// per-bucket fillStyle can stay constant with zero per-frame string
// builds.
const STAR_TINTS = [INK_RGB, GOLD, NODE_COLORS.azure] as const;
const STAR_TIERS = [0.13, 0.29, 0.46] as const;
const STAR_FILL_BUCKETS: string[] = [];
for (let t = 0; t < STAR_TINTS.length; t++) {
  for (let a = 0; a < STAR_TIERS.length; a++) {
    STAR_FILL_BUCKETS.push(rgbaStr(STAR_TINTS[t]!, STAR_TIERS[a]!));
  }
}

// Constellation links: 3 quantized opacity tiers of the gold link color.
const LINK_MAX = 175;
const LINK_STROKES = [0.1, 0.2, 0.3].map((a) => rgbaStr(GOLD, a));

// Orbit rings: one precomputed stroke per orbit.
const RING_STROKES = ORBITS.map((o) => rgbaStr([142, 151, 184], o.mist));

// Traveller trail: 4 quantized alpha/width tiers (oldest → newest).
const TRAIL_STROKES = [0.069, 0.206, 0.344, 0.481].map((a) => rgbaStr(GOLD, a));
const TRAIL_WIDTHS = [1.28, 1.83, 2.38, 2.93];

// Node cores + traveller head: constant fills.
const NODE_CORE_FILL: Record<Node['color'], string> = {
  gold: rgbaStr(GOLD, 0.95),
  azure: rgbaStr(NODE_COLORS.azure, 0.95),
  mist: rgbaStr(NODE_COLORS.mist, 0.95),
};
const TRAVELLER_HEAD_FILL = 'rgba(255, 236, 190, 0.98)';

/** Pre-rendered radial-glow sprites — shadowBlur is too slow per-frame. */
function makeGlowSprite(size: number, rgb: readonly number[], coreAlpha: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreAlpha})`);
  grad.addColorStop(0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreAlpha * 0.55})`);
  grad.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreAlpha * 0.14})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function OrbitScene({ className, density, biasX = 0, speed = 1 }: OrbitSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const context = canvasNode.getContext('2d', { alpha: true });
    if (!context) {
      setFailed(true);
      return;
    }
    // Non-nullable aliases — narrowing doesn't survive into the hoisted
    // engine functions below, so hand them values that are never null.
    const canvas: HTMLCanvasElement = canvasNode;
    const ctx: CanvasRenderingContext2D = context;

    // ── environment tiers ─────────────────────────────────────────────
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    const saveData = Boolean(conn?.saveData);
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    const lowMemory = typeof mem === 'number' && mem <= 2;

    const tier: Density = density ?? (saveData || lowMemory ? 'low' : 'full');

    // ── sizing ────────────────────────────────────────────────────────
    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    const starBuckets: Star[][] = Array.from({ length: STAR_FILL_BUCKETS.length }, () => []);
    let nodes: Node[] = [];
    let pts: NodePoint[] = [];
    let nebula: HTMLCanvasElement | null = null;
    let nebulaW = -1; // size the nebula canvas was last painted at
    let nebulaH = -1;
    let glowGold: HTMLCanvasElement;
    let glowAzure: HTMLCanvasElement;
    let glowInk: HTMLCanvasElement;

    // Per-mount seeds: every rebuild of the star field / node ring is
    // deterministic, so a mobile URL-bar resize never re-randomizes the sky.
    const starSeed = (Math.random() * 0xffffffff) >>> 0;
    const nodeSeed = (Math.random() * 0xffffffff) >>> 0;

    // ── cached geometry for the scroll path (no layout reads) ─────────
    let canvasTop = 0; // document-space top of the canvas

    const mouse = { x: 0.5, y: 0.5, active: false, sx: 0.5, sy: 0.5 };
    let scrollP = 0; // 0 … 1 as the hero scrolls away
    let introT = 0; // 0 … 1 scene bloom on mount
    let twinkleT = 0; // accumulated ms; velocity speeds up its cadence
    let velS = 0; // smoothed scroll velocity, −40 … 40
    let lastScrollY = 0;

    function buildNodes() {
      const nodeCount = tier === 'low' ? 10 : 16;
      const palette: Array<'gold' | 'azure' | 'mist'> = ['gold', 'gold', 'azure', 'mist', 'gold', 'azure'];
      const rnd = mulberry32(nodeSeed);
      nodes = Array.from({ length: nodeCount }, (_, i) => {
        const orbit = i % ORBITS.length;
        return {
          orbit,
          angle: rnd() * Math.PI * 2,
          omega: ORBITS[orbit]!.omega * (0.75 + rnd() * 0.5) * (rnd() < 0.5 ? 1 : -1),
          r: 1.8 + rnd() * 2.2,
          color: palette[i % palette.length]!,
        };
      });
      // Reused per-frame node point records — mutated in place so the
      // draw loop stays allocation-free.
      pts = nodes.map((n) => ({ x: 0, y: 0, r: n.r, color: n.color }));
    }

    function buildStars() {
      const area = w * h;
      const starCount = tier === 'low'
        ? Math.max(40, Math.round(area / 24000))
        : Math.max(110, Math.round(area / 8200));
      const count = Math.min(starCount, 260);
      // Same seed + same count ⇒ byte-identical field — skip the rebuild
      // entirely (positions are normalized, so they never depend on w/h).
      if (count === stars.length) return;
      const rnd = mulberry32(starSeed);
      stars = Array.from({ length: count }, () => {
        const x = rnd();
        const y = rnd();
        const r = 0.4 + rnd() * 1.3;
        const base = 0.12 + rnd() * 0.4;
        const phase = rnd() * Math.PI * 2;
        const tint = rnd();
        const tintIdx = tint < 0.78 ? 0 : tint < 0.92 ? 1 : 2;
        const tierIdx = base < 0.21 ? 0 : base < 0.375 ? 1 : 2;
        return { x, y, r, phase, bucket: tintIdx * 3 + tierIdx };
      });
      for (const b of starBuckets) b.length = 0;
      for (const s of stars) starBuckets[s.bucket]!.push(s);
    }

    // Nebula — painted into an offscreen canvas only when the size really
    // moved (>2px); the 5 radial gradients are far too costly to repaint
    // on every URL-bar jitter tick.
    function paintNebula() {
      nebula = document.createElement('canvas');
      nebula.width = Math.max(1, Math.round(w));
      nebula.height = Math.max(1, Math.round(h));
      const ng = nebula.getContext('2d');
      if (ng) {
        const cx = w * (0.5 + biasX * 0.5);
        const paint = (x: number, y: number, rr: number, rgb: readonly number[], a: number) => {
          const grad = ng.createRadialGradient(x, y, 0, x, y, rr);
          grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ng.fillStyle = grad;
          ng.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        };
        paint(cx, h * 0.42, Math.max(w, h) * 0.52, [26, 34, 74], 0.55); // deep indigo bloom
        paint(cx, h * 0.46, Math.max(w, h) * 0.2, [58, 44, 22], 0.34); // focal glow at the orbital heart
        paint(cx + w * 0.18, h * 0.3, Math.max(w, h) * 0.3, [46, 38, 20], 0.5); // faint warm dust
        paint(w * 0.12, h * 0.75, Math.max(w, h) * 0.24, [18, 26, 58], 0.4);
        paint(w * 0.9, h * 0.18, Math.max(w, h) * 0.2, [30, 24, 60], 0.35);
      }
      nebulaW = w;
      nebulaH = h;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      // Mobile (<768px): cap DPR at 1.5 — ~44% less paint area with no
      // perceptible loss on small physical pixels.
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      if (!nebula || Math.abs(w - nebulaW) > 2 || Math.abs(h - nebulaH) > 2) {
        paintNebula();
      }
      // Re-cache the document-space position used by the scroll listener.
      canvasTop = rect.top + window.scrollY;
    }

    // scrollP from cached geometry — callers never touch the layout.
    function updateScrollP() {
      const vh = window.innerHeight || 1;
      scrollP = clamp01((window.scrollY - canvasTop) / (vh * 0.9));
    }

    // ── helpers ───────────────────────────────────────────────────────
    function orbitPoint(orbit: number, angle: number, scale: number) {
      const o = ORBITS[orbit]!;
      const cx = w * (0.5 + biasX * 0.42);
      const cy = h * 0.46;
      const rx = w * o.rx * scale;
      const ry = h * o.ry * scale;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = cos * rx;
      const y = sin * ry;
      const rxr = Math.cos(o.rot);
      const ryr = Math.sin(o.rot);
      return {
        x: cx + x * rxr - y * ryr,
        y: cy + x * ryr + y * rxr,
      };
    }

    const traveller = {
      orbit: 1,
      angle: -Math.PI / 3,
      jumpFrom: null as null | { orbit: number; angle: number; t: number; dur: number; toOrbit: number; toAngle: number },
      trail: [] as TrailPoint[],
    };

    function systemScale() {
      // orbits bloom in on mount, then expand slightly as the hero scrolls away
      const bloom = 0.94 + 0.06 * introT;
      return bloom * (1 + scrollP * 0.14);
    }

    function pushTrail(pt: TrailPoint) {
      traveller.trail.push(pt);
      if (traveller.trail.length > 34) traveller.trail.shift();
    }

    function updateTraveller(dt: number) {
      if (traveller.jumpFrom) {
        const j = traveller.jumpFrom;
        j.t += dt;
        const p = Math.min(1, j.t / j.dur);
        const ease = p * p * (3 - 2 * p); // smoothstep
        const a = orbitPoint(j.orbit, j.angle, systemScale());
        const b = orbitPoint(j.toOrbit, j.toAngle, systemScale());
        const lift = Math.sin(p * Math.PI) * 26;
        pushTrail({ x: a.x + (b.x - a.x) * ease, y: a.y + (b.y - a.y) * ease - lift });
        if (p >= 1) {
          traveller.orbit = j.toOrbit;
          traveller.angle = j.toAngle;
          traveller.jumpFrom = null;
          scheduleJump();
        }
        return;
      }
      traveller.angle += ORBITS[traveller.orbit]!.omega * 1.9 * speed * dt;
      pushTrail(orbitPoint(traveller.orbit, traveller.angle, systemScale()));
    }

    let jumpTimer = 0;
    function scheduleJump() {
      // after a random dwell, leap to a neighbouring orbit
      jumpTimer = window.setTimeout(() => {
        const dir = traveller.orbit === 0 ? 1 : traveller.orbit === ORBITS.length - 1 ? -1 : Math.random() < 0.5 ? 1 : -1;
        traveller.jumpFrom = {
          orbit: traveller.orbit,
          angle: traveller.angle,
          toOrbit: traveller.orbit + dir,
          toAngle: traveller.angle + (Math.random() - 0.5) * 2.2,
          t: 0,
          dur: 1500,
        };
      }, 2600 + Math.random() * 4200);
    }

    // ── link scratch buffers — preallocated once, reused every frame ──
    const MAX_PAIRS = 140; // 16 nodes ⇒ 120 pairs; small headroom
    const linkBuf = new Float32Array(LINK_STROKES.length * MAX_PAIRS * 4);
    const linkCount = new Int32Array(LINK_STROKES.length);

    // ── draw ──────────────────────────────────────────────────────────
    function draw(dt: number) {
      ctx.clearRect(0, 0, w, h);

      const fade = 1 - scrollP * 0.55;
      // Layers originally baked `fade` into their style strings *and* ran
      // under globalAlpha=fade (effective fade²). globalAlpha juggling
      // reproduces that exact curve with zero per-frame string builds.
      const fade2 = fade * fade;
      ctx.globalAlpha = fade;

      if (nebula) ctx.drawImage(nebula, 0, 0, w, h);

      // stars — parallax layer (deep), batched: 9 buckets × 1 fill
      const starParX = (mouse.sx - 0.5) * 10;
      const starParY = (mouse.sy - 0.5) * 8;
      for (let b = 0; b < starBuckets.length; b++) {
        const list = starBuckets[b]!;
        if (list.length === 0) continue;
        ctx.fillStyle = STAR_FILL_BUCKETS[b]!;
        ctx.beginPath();
        for (let i = 0; i < list.length; i++) {
          const s = list[i]!;
          const px = s.x * w + starParX;
          const py = s.y * h + starParY;
          const rr = reducedMotion
            ? s.r
            : s.r * (0.775 + 0.225 * Math.sin(twinkleT * 0.0012 + s.phase));
          ctx.moveTo(px + rr, py);
          ctx.arc(px, py, rr, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // orbit rings — parallax layer (mid), precomputed strokes
      const orbitParX = (mouse.sx - 0.5) * 22;
      const orbitParY = (mouse.sy - 0.5) * 16;
      const scale = systemScale();
      ctx.lineWidth = 1;
      ctx.globalAlpha = fade2;
      for (let oi = 0; oi < ORBITS.length; oi++) {
        const o = ORBITS[oi]!;
        ctx.strokeStyle = RING_STROKES[oi]!;
        ctx.beginPath();
        ctx.ellipse(
          w * (0.5 + biasX * 0.42) + orbitParX,
          h * 0.46 + orbitParY,
          w * o.rx * scale,
          h * o.ry * scale,
          o.rot,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }

      // nodes — advance angles, write into the reused point records
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const p = pts[i]!;
        n.angle += n.omega * speed * (reducedMotion ? 0 : 1) * dt;
        const op = orbitPoint(n.orbit, n.angle, scale);
        let px = op.x;
        let py = op.y;
        if (canHover && mouse.active) {
          const mx = mouse.sx * w;
          const my = mouse.sy * h;
          const dx = mx - op.x;
          const dy = my - op.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 170 && dist > 0.001) {
            const pull = (1 - dist / 170) * 14;
            px += (dx / dist) * pull;
            py += (dy / dist) * pull;
          }
        }
        p.x = px;
        p.y = py;
      }

      // constellation links between near nodes — the O(n²) distance pass
      // remains, but strokes quantize into 3 opacity buckets (3 stroke
      // calls/frame) and the whole pass is skipped once the hero has
      // mostly scrolled away.
      if (scrollP <= 0.6) {
        for (let c = 0; c < linkCount.length; c++) linkCount[c] = 0;
        const maxD2 = LINK_MAX * LINK_MAX;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i]!;
          for (let k = i + 1; k < pts.length; k++) {
            const bpt = pts[k]!;
            const dx = a.x - bpt.x;
            const dy = a.y - bpt.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= maxD2) continue;
            const strength = (1 - Math.sqrt(d2) / LINK_MAX) * 0.3;
            const bucket = strength < 0.15 ? 0 : strength < 0.25 ? 1 : 2;
            const n = linkCount[bucket]!;
            if (n >= MAX_PAIRS) continue;
            linkCount[bucket] = n + 1;
            const o = (bucket * MAX_PAIRS + n) * 4;
            linkBuf[o] = a.x;
            linkBuf[o + 1] = a.y;
            linkBuf[o + 2] = bpt.x;
            linkBuf[o + 3] = bpt.y;
          }
        }
        for (let bucket = 0; bucket < LINK_STROKES.length; bucket++) {
          const n = linkCount[bucket]!;
          if (n === 0) continue;
          ctx.strokeStyle = LINK_STROKES[bucket]!;
          ctx.beginPath();
          const base = bucket * MAX_PAIRS * 4;
          for (let j = 0; j < n; j++) {
            const o = base + j * 4;
            ctx.moveTo(linkBuf[o]!, linkBuf[o + 1]!);
            ctx.lineTo(linkBuf[o + 2]!, linkBuf[o + 3]!);
          }
          ctx.stroke();
        }
      }

      // node glows + cores (cores batched per color ⇒ 3 fills/frame)
      ctx.globalAlpha = fade;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!;
        const sprite = p.color === 'gold' ? glowGold : p.color === 'azure' ? glowAzure : glowInk;
        const gs = p.r * 11;
        ctx.drawImage(sprite, p.x - gs / 2, p.y - gs / 2, gs, gs);
      }
      for (const color of ['gold', 'azure', 'mist'] as const) {
        ctx.fillStyle = NODE_CORE_FILL[color];
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]!;
          if (p.color !== color) continue;
          ctx.moveTo(p.x + p.r, p.y);
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // traveller + trail — parallax layer (front), 4 quantized tiers
      // (scroll velocity gives the traveller a subtle speed boost)
      if (!reducedMotion) updateTraveller(dt * (1 + Math.abs(velS) / 80));
      const tr = traveller.trail;
      const len = tr.length;
      if (len > 1) {
        ctx.globalAlpha = fade2;
        const tiers = TRAIL_STROKES.length;
        for (let q = 0; q < tiers; q++) {
          // trail position t rises monotonically ⇒ each tier covers a
          // contiguous run of segments — one polyline stroke per tier.
          const i0 = Math.max(1, Math.ceil((q * len) / tiers));
          const i1 = Math.min(len - 1, Math.ceil(((q + 1) * len) / tiers) - 1);
          if (i0 > i1) continue;
          ctx.strokeStyle = TRAIL_STROKES[q]!;
          ctx.lineWidth = TRAIL_WIDTHS[q]!;
          ctx.beginPath();
          const first = tr[i0 - 1]!;
          ctx.moveTo(first.x + orbitParX, first.y + orbitParY);
          for (let i = i0; i <= i1; i++) {
            const p = tr[i]!;
            ctx.lineTo(p.x + orbitParX, p.y + orbitParY);
          }
          ctx.stroke();
        }
      }
      if (len > 0) {
        ctx.globalAlpha = fade;
        const head = tr[len - 1]!;
        const hx = head.x + orbitParX;
        const hy = head.y + orbitParY;
        ctx.drawImage(glowGold, hx - 33, hy - 33, 66, 66);
        ctx.fillStyle = TRAVELLER_HEAD_FILL;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    // ── static frame (reduced-motion path) ────────────────────────────
    function drawStatic() {
      introT = 1;
      // seed a trail along the current orbit for a composed still
      traveller.trail = [];
      for (let i = 0; i < 34; i++) {
        traveller.angle -= ORBITS[traveller.orbit]!.omega * 26;
        traveller.trail.unshift(orbitPoint(traveller.orbit, traveller.angle, systemScale()));
      }
      draw(0);
    }

    // ── loop control ──────────────────────────────────────────────────
    let raf = 0;
    let last = 0;
    let dtGlobal = 16;
    let running = false;
    let inView = true;
    let visible = !document.hidden;

    function frame(now: number) {
      raf = 0;
      if (!running) return;
      dtGlobal = Math.min(48, now - last || 16);
      last = now;
      if (introT < 1) introT = Math.min(1, introT + dtGlobal / 1400);

      // Scroll progress + velocity from cached geometry (zero layout
      // reads). Velocity is clamped to ±40, smoothed with a 0.08 lerp and
      // feeds the traveller speed and star-twinkle cadence.
      updateScrollP();
      const rawVel = Math.max(-40, Math.min(40, window.scrollY - lastScrollY));
      lastScrollY = window.scrollY;
      velS += (rawVel - velS) * 0.08;
      twinkleT += dtGlobal * (1 + Math.abs(velS) / 60);

      draw(dtGlobal);
      if (running) raf = requestAnimationFrame(frame);
    }

    function setRunning(next: boolean) {
      if (reducedMotion) return; // static path never loops
      const target = next && inView && visible;
      if (target === running) return;
      running = target;
      if (running) {
        last = performance.now();
        lastScrollY = window.scrollY; // no velocity spike after a pause
        velS = 0;
        raf = requestAnimationFrame(frame);
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    // ── listeners ─────────────────────────────────────────────────────
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inView = e.isIntersecting;
          if (inView) updateScrollP(); // refresh after a pause (cached math)
          setRunning(inView);
        }
      },
      { rootMargin: '80px 0px' },
    );
    io.observe(canvas);

    const onVisibility = () => {
      visible = !document.hidden;
      setRunning(visible);
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Resize work coalesces into a single rAF — mobile URL-bar show/hide
    // fires ResizeObserver in bursts, not once.
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
        if (reducedMotion) drawStatic();
      });
    });
    ro.observe(canvas);

    // Scroll: early-out while the scene is offscreen/paused, coalesce to
    // one update per frame, and derive progress from the cached offset —
    // no getBoundingClientRect on the scroll path at all.
    let scrollRaf = 0;
    const onScroll = () => {
      if (!inView) return;
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        updateScrollP();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let mouseRaf = 0;
    const onMouse = (e: MouseEvent) => {
      if (mouseRaf) return;
      mouseRaf = requestAnimationFrame(() => {
        mouseRaf = 0;
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) / Math.max(1, rect.width);
        mouse.y = (e.clientY - rect.top) / Math.max(1, rect.height);
        mouse.active = mouse.x >= 0 && mouse.x <= 1 && mouse.y >= 0 && mouse.y <= 1;
        mouse.sx += (mouse.x - mouse.sx) * 0.12;
        mouse.sy += (mouse.y - mouse.sy) * 0.12;
      });
    };
    if (canHover) window.addEventListener('mousemove', onMouse, { passive: true });

    // ── boot / teardown ───────────────────────────────────────────────
    const teardown = () => {
      running = false;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
      if (raf) cancelAnimationFrame(raf);
      if (mouseRaf) cancelAnimationFrame(mouseRaf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.clearTimeout(jumpTimer);
    };

    try {
      glowGold = makeGlowSprite(96, GOLD, 0.9);
      glowAzure = makeGlowSprite(96, NODE_COLORS.azure, 0.85);
      glowInk = makeGlowSprite(96, NODE_COLORS.mist, 0.8);
      buildNodes();
      resize();
      updateScrollP();
      lastScrollY = window.scrollY;
      if (reducedMotion) {
        drawStatic();
      } else {
        scheduleJump();
        setRunning(true);
      }
    } catch {
      setFailed(true);
      teardown();
      return;
    }

    return teardown;
  }, [density, biasX, speed]);

  if (failed) return null;
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
