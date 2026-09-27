import { useEffect, useRef, useState } from 'react';

/**
 * SkyAtlas v2 — «أطلس المعرفة» 3D-projected world engine (round 3).
 *
 * The living sky of the madarek landing, rebuilt from offset planes into a
 * true projected volume. One pinhole camera, one draw order, zero deps —
 * the frame should read as a place you move through, not a drawing.
 *
 *   A  nebula      two pre-rendered variants (warm dawn / cool deep) that
 *                  crossfade with global scroll — the sky answers every act.
 *   B  starfield   stars carry {x, y, z} in a world volume and stream toward
 *                  the viewer; size, alpha and parallax all derive from z.
 *                  Near stars render IN FRONT of the instrument.
 *   C  the core    «نواة المعرفة» — three brass rings + one counter-rotating
 *                  azure alidade-ring, each a 3D circle at its own gimbal
 *                  tilt; a breathing three-layer "knowledge sun"; orbital
 *                  nodes riding the rings; volumetric god rays. The limb
 *                  still speaks Arabic-Indic numerals.
 *   D  dust        near-plane motes, soft, fastest parallax — the air you
 *                  move through.  E  pointers — ambient nodes connecting to
 *                  the cursor (the traveller's constellation), hover tier
 *                  only.  +  meteors — rare; hotter in the final act.
 *
 * ── Camera model ─────────────────────────────────────────────────────
 * A pinhole camera sits at the screen plane. For a world point (x, y, z):
 *   scale = fov / (fov + z)              z ≥ 0, larger z = farther
 *   sx    = w/2 + (x − camX) · scale      sy = h/2 + (y − camY) · scale
 * Star size and alpha multiply by scale (depth fog). The pointer moves the
 * CAMERA, not the planes, so parallax disparity is physical: with
 * fov = 1.5·min(w,h) and zFar = 4.6·fov, scale runs 0.97 (near) → 0.18
 * (far) — near stars shift ~5.4× more than far ones under the same camX.
 * The dust motes and the pointer constellation answer that same camera
 * (each shifts against the pointer by its depth) — the volume never shears.
 *
 * ── Occlusion math ───────────────────────────────────────────────────
 * Each ring is a 3D circle: point(a) = core + (A·cos a + B·sin a)·Rw where
 * A/B are the ring's tilt basis (Euler rotX then rotZ). The z-offset of a
 * point from the core's depth is exactly Bz·sin(a)·Rw, so the front/back
 * halves are exact arcs: FRONT where Bz·sin(a) < 0. Back halves (α ≈ 0.28,
 * thinner stroke) are drawn BEFORE the core glow; front halves (α 0.55–0.70,
 * brightened toward the lower-left scene light) AFTER it — that split is
 * what makes the instrument read as a volume instead of an etching. Orbital
 * nodes pass the same test (α 0.35 behind / 0.9 front), and the star pool is
 * split at the core's depth: z ≥ coreZ renders behind the whole instrument,
 * z < coreZ streams past in front of it.
 *
 * ── Scene-evolution contract ─────────────────────────────────────────
 * heroProgress (self-measured sticky scrub, 0→1 across the 260vh pin):
 *   star drift ×3.4, FOV +7% (subtle lens change), core zoom ×1.06, and each
 *   ring gains its own scrollSpin (the alidade counter-rotates).
 * globalProgress G = scrollY / (scrollHeight − innerHeight), 0→1 page-wide:
 *   · the nebula crossfades warm dawn → cool deep through G 0.32–0.68;
 *   · the core descends +8% of h and recedes to ×0.86 — a calmer, more
 *     distant sky for the later acts;
 *   · G ≈ 0.5 = "meteor season" (twinkle ×2.5); G > 0.82 = denser meteors.
 *
 * ── Craft contract (unchanged, held to the letter) ───────────────────
 * · Zero dependencies — Canvas 2D + exactly one rAF loop. Every gradient
 *   and sprite — nebulae, core layers, node glows, god rays, even the
 *   meteor streak — is pre-rendered per resize: the frame loop creates
 *   zero gradient objects. DPR capped at 2; density tiers full/low
 *   (saveData, ≤2GB memory); low halves the star pool and drops the god
 *   rays. Paused offscreen (IO) and on hidden tabs.
 * · prefers-reduced-motion → ONE composed static frame (stars with depth,
 *   core with occlusion, rays at a fixed angle, dust) — no loop, no
 *   motion listeners; depth without motion. Canvas failure → render
 *   nothing (the CSS sky behind carries). Everything cleaned up on unmount.
 */

type Density = 'full' | 'low';

export type SkyAtlasProps = {
  className?: string;
  /** Force a density tier (tests / embeds). Default: auto. */
  density?: Density;
  /** Horizontal placement of the core mass, −1 (left) … 1 (right). */
  biasX?: number;
};

type Star = {
  x: number; y: number; z: number; // world position (z ≥ 0, larger = farther)
  r: number; base: number; amp: number; phase: number; speed: number;
  tint: 0 | 1 | 2; glint: boolean; // white / warm / azure; cross-glint flag
  dx: number; dy: number; // slow lateral drift, world px/s
};
type Mote = { x: number; y: number; r: number; a: number; phase: number; dx: number; dy: number };
type PointerNode = { x: number; y: number; r: number; hue: 'gold' | 'azure' | 'mist'; phase: number };

/** Static ring geometry (Euler tilts in radians; spin drives ticks/nodes). */
type RingDef = {
  f: number; // radius as a fraction of the outer ring's world radius
  tiltX: number; tiltZ: number; // gimbal tilt about x / base rotation about z
  precess: number; precessAmp: number; phase: number; // slow in-plane oscillation
  spin: number; // rad/s about the ring's own normal (limb graduations ride it)
  scrollSpin: number; // extra radians per unit of heroProgress
  lw: number; azure: boolean;
};

/** Per-frame ring basis: point(a) = core + (A·cos a + B·sin a)·rw. */
type RingBasis = {
  Ax: number; Ay: number; Bx: number; By: number; Bz: number;
  s: number; rw: number; scrollSpin: number; lw: number; azure: boolean;
};

type Orbiter = { ring: number; a0: number; speed: number; size: number };
type RayDef = { deg: number; a: number; sway: number; len: number };

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** palette — hot brass against deep void, azure as chromatic tension */
const RGB = {
  gold: [240, 205, 130], azure: [132, 186, 255], violet: [172, 152, 224],
  mist: [178, 188, 220], ink: [243, 240, 231], hot: [255, 238, 202],
  amber: [246, 180, 96], halo: [233, 180, 110], nodeG: [255, 226, 162],
  nodeA: [150, 210, 255],
} as const;

/** the scene is lit from below-left (the dawn nebula sits low-left) */
const LX = -0.55;
const LY = 0.835;
const Z_NEAR = 40;

/** the instrument — three brass gimbals + the azure alidade heir */
const RINGS: readonly RingDef[] = [
  { f: 1.0, tiltX: 65 * DEG, tiltZ: -8 * DEG, precess: 0.9, precessAmp: 3.5 * DEG, phase: 0.0, spin: 0.022, scrollSpin: 0.35, lw: 1.5, azure: false },
  { f: 0.86, tiltX: -40 * DEG, tiltZ: 22 * DEG, precess: 1.3, precessAmp: 3.0 * DEG, phase: 2.1, spin: -0.03, scrollSpin: -0.22, lw: 1.25, azure: false },
  { f: 0.72, tiltX: 15 * DEG, tiltZ: -30 * DEG, precess: 0.7, precessAmp: 4.0 * DEG, phase: 4.0, spin: 0.05, scrollSpin: 0.5, lw: 1.1, azure: false },
  { f: 0.93, tiltX: 52 * DEG, tiltZ: 64 * DEG, precess: 1.1, precessAmp: 2.5 * DEG, phase: 1.2, spin: -0.06, scrollSpin: -0.5, lw: 0.9, azure: true },
];

/** orbital nodes — bright travellers riding the 3D rings */
const ORBITERS: readonly Orbiter[] = [
  { ring: 0, a0: 0.3, speed: 0.055, size: 2.8 }, { ring: 0, a0: 1.7, speed: 0.055, size: 2.2 },
  { ring: 0, a0: 3.6, speed: 0.055, size: 3.0 }, { ring: 0, a0: 5.1, speed: 0.055, size: 2.3 },
  { ring: 1, a0: 0.9, speed: -0.07, size: 2.4 }, { ring: 1, a0: 2.8, speed: -0.07, size: 2.1 },
  { ring: 1, a0: 4.5, speed: -0.07, size: 2.7 }, { ring: 2, a0: 1.2, speed: 0.09, size: 2.3 },
  { ring: 2, a0: 4.0, speed: 0.09, size: 2.5 }, { ring: 3, a0: 2.2, speed: 0.11, size: 2.2 },
];

/** god rays — a fan of light volumes rising up-right from the core */
const RAYS: readonly RayDef[] = [
  { deg: 16, a: 0.16, sway: 1.3, len: 3.0 }, { deg: 36, a: 0.11, sway: 1.9, len: 3.3 },
  { deg: 56, a: 0.13, sway: 1.1, len: 2.8 }, { deg: 74, a: 0.08, sway: 2.0, len: 2.4 },
];
const RAY_W = 320;
const RAY_H = 480;
const METEOR_W = 168, METEOR_TH = 6;

/** Pre-rendered radial sprite (glows, dust) — shadowBlur per-frame is too slow. */
function sprite(size: number, rgb: readonly [number, number, number], a0: number, stops?: [number, number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, 0, half, half, half);
  const s = stops ?? [0, 0.25, 0.6, 1];
  grad.addColorStop(s[0] ?? 0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a0})`);
  grad.addColorStop(s[1] ?? 0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a0 * 0.55})`);
  grad.addColorStop(s[2] ?? 0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a0 * 0.14})`);
  grad.addColorStop(s[3] ?? 1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Pre-rendered god-ray wedge: apex at bottom-center, feathered on both axes. */
/** Anamorphic star bokeh — 4 diffraction streaks + chromatic split rims.
 *  Real bright sources scatter anisotropically: a long horizontal
 *  anamorphic flare, a shorter vertical, two cool diagonals, and a faint
 *  cyan fringe offset left / warm fringe right (lens dispersion). */
function buildStarSprite(): HTMLCanvasElement {
  const W = 512, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!g) return c;
  const cx = W / 2, cy = H / 2;
  const streak = (len: number, wid: number, rgb: string, a: number, rot: number) => {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    const grad = g.createLinearGradient(-len, 0, len, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, `rgba(${rgb},${a})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  streak(W * 0.48, 3.5, '255,236,200', 0.85, 0);        // anamorphic horizontal
  streak(W * 0.48, 2.2, '255,236,200', 0.5, Math.PI / 2); // vertical, shorter+dimmer
  streak(W * 0.3, 1.6, '168,214,255', 0.32, Math.PI / 4); // cool diagonals
  streak(W * 0.3, 1.6, '168,214,255', 0.32, -Math.PI / 4);
  // chromatic rims — cyan biased left, warm right, soft
  streak(30, 9, '140,210,255', 0.1, 0);
  g.save();
  g.translate(7, 0);
  streak(30, 9, '255,214,150', 0.1, 0);
  g.restore();
  return c;
}

function buildRaySprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = RAY_W;
  c.height = RAY_H;
  const g = c.getContext('2d');
  if (!g) return c;
  const apexX = RAY_W / 2;
  const spread = RAY_W * 0.46;
  g.beginPath();
  g.moveTo(apexX, RAY_H - 2);
  g.lineTo(apexX + spread, 0);
  g.lineTo(apexX - spread, 0);
  g.closePath();
  const v = g.createLinearGradient(0, RAY_H, 0, 0);
  v.addColorStop(0, 'rgba(255, 232, 190, 0.5)');
  v.addColorStop(0.45, 'rgba(250, 214, 150, 0.22)');
  v.addColorStop(1, 'rgba(250, 214, 150, 0)');
  g.fillStyle = v;
  g.fill();
  // feather the side edges so the beam reads as a volume, not a streak
  g.globalCompositeOperation = 'destination-in';
  const hGrad = g.createLinearGradient(apexX - spread, 0, apexX + spread, 0);
  hGrad.addColorStop(0, 'rgba(0,0,0,0)');
  hGrad.addColorStop(0.28, 'rgba(0,0,0,0.9)');
  hGrad.addColorStop(0.5, 'rgba(0,0,0,1)');
  hGrad.addColorStop(0.72, 'rgba(0,0,0,0.9)');
  hGrad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hGrad;
  g.fillRect(0, 0, RAY_W, RAY_H);
  return c;
}

/** Pre-rendered meteor streak — hot gold head, azure tail, feathered filament. */
function buildMeteorSprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = METEOR_W;
  c.height = METEOR_TH;
  const g = c.getContext('2d');
  if (!g) return c;
  const v = g.createLinearGradient(0, 0, METEOR_W, 0);
  v.addColorStop(0, 'rgba(255, 246, 222, 0.95)');
  v.addColorStop(0.36, 'rgba(255, 214, 148, 0.5)');
  v.addColorStop(1, 'rgba(150, 200, 255, 0)');
  g.fillStyle = v;
  g.fillRect(0, 0, METEOR_W, METEOR_TH);
  g.globalCompositeOperation = 'destination-in'; // feather across the filament
  const f = g.createLinearGradient(0, 0, 0, METEOR_TH);
  f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(0.5, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = f;
  g.fillRect(0, 0, METEOR_W, METEOR_TH);
  return c;
}

/** Arabic-Indic digits — the graduated limb speaks its mother tongue. */
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const arNum = (n: number): string => String(n).split('').map((d) => AR_DIGITS[Number(d)] ?? d).join('');

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, x: number): number => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

export function SkyAtlas({ className, density, biasX = -0.5 }: SkyAtlasProps) {
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
    const canvas: HTMLCanvasElement = canvasNode;
    const ctx: CanvasRenderingContext2D = context;

    // ── environment tiers ─────────────────────────────────────────────
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    const saveData = Boolean(conn?.saveData);
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    const lowMemory = typeof mem === 'number' && mem <= 2;
    const tier: Density = density ?? (saveData || lowMemory ? 'low' : 'full');
    const mobile = window.matchMedia('(max-width: 768px)').matches;

    // ── sizing + scene state ──────────────────────────────────────────
    let w = 0, h = 0, dpr = 1;
    let stars: Star[] = [], motes: Mote[] = [], pointerNodes: PointerNode[] = [];
    let nebulaWarm: HTMLCanvasElement | null = null, nebulaCool: HTMLCanvasElement | null = null;
    let coreHot: HTMLCanvasElement, coreMid: HTMLCanvasElement, coreHalo: HTMLCanvasElement;
    let nodeGold: HTMLCanvasElement, nodeAzure: HTMLCanvasElement, dustSprite: HTMLCanvasElement, raySprite: HTMLCanvasElement | null = null, starSprite: HTMLCanvasElement | null = null, meteorSprite: HTMLCanvasElement | null = null;

    // camera (recomputed each frame — see the header contract)
    let fovV = 600, zFarV = 3000, coreZV = 800, scaleCV = 0.5;
    let RsV = 300, RwV = 600; // outer-ring radius: screen px / world units
    let coreWxV = 0, coreWyV = 0, coreSxV = 0, coreSyV = 0;
    let camX = 0, camY = 0, leanX = 0, leanY = 0;
    let driftBase = 60; // star flight speed, world px/s

    // pointer (lerped — direct tracking carries no momentum)
    let px = 0.5, py = 0.5, pxTarget = 0.5, pyTarget = 0.5, pointerSeen = false;

    // progress (both self-measured)
    let heroProgress = 0, heroSpan = 1, G = 0, docH = 1, frameNo = 0;

    let meteor: { x: number; y: number; vx: number; vy: number; life: number; max: number } | null = null, nextMeteorAt = 0;

    const bases: RingBasis[] = RINGS.map((r) => ({
      Ax: 1, Ay: 0, Bx: 0, By: 0, Bz: 0, s: 0, rw: 0, scrollSpin: r.scrollSpin, lw: r.lw, azure: r.azure,
    }));

    let running = false, raf = 0, lastNow = 0, lastFrameAt = 0;
    const t0 = performance.now();

    // scratch channel for ring projection (avoids per-point allocations)
    let ptX = 0, ptY = 0, ptZ = 0, ptS = 0;

    // ── camera ────────────────────────────────────────────────────────
    function computeCamera(hp: number, g: number) {
      const M = Math.min(w, h) || 1;
      const fov = M * 1.5 * (1 + hp * 0.07 + g * 0.03);
      const zoom = (1 + hp * 0.06) * (1 - 0.14 * smoothstep(0.05, 0.95, g));
      const Rs = M * (mobile ? 0.78 : 0.62) * zoom;
      // keep every ring point (worst tilt ≈ 0.95·Rw of z-swing) in front of
      // the near plane: coreZ ≥ (zNear + 0.95·Rs)·fov/(fov − 0.95·Rs)
      const guard = 0.95;
      const denom = Math.max(1, fov - guard * Rs);
      const coreZ = (((Z_NEAR + guard * Rs) * fov) / denom) * 1.06;
      const scaleC = fov / (fov + coreZ);
      fovV = fov;
      zFarV = fov * 4.6;
      coreZV = coreZ;
      scaleCV = scaleC;
      RsV = Rs;
      RwV = Rs / scaleC;
      const anchorX = w * (0.5 + biasX * 0.42);
      const anchorY = h * (0.46 + g * 0.08); // the core descends as the page travels
      coreWxV = (anchorX - w / 2) / scaleC;
      coreWyV = (anchorY - h / 2) / scaleC;
      coreSxV = w / 2 + (coreWxV - camX) * scaleC;
      coreSyV = h / 2 + (coreWyV - camY) * scaleC;
    }

    /** How much a projected point faces the below-left scene light, 0…1. */
    const lightDot = (x: number, y: number): number => {
      const dx = x - coreSxV, dy = y - coreSyV, len = Math.hypot(dx, dy) || 1;
      return 0.5 * (1 + (dx / len) * LX + (dy / len) * LY);
    };

    /** Project a point on ring `b` at local angle `a`, radius factor `fr`. */
    function projectRingPoint(b: RingBasis, a: number, fr: number): void {
      const ca = Math.cos(a), sa = Math.sin(a), k = b.rw * fr;
      const ox = (b.Ax * ca + b.Bx * sa) * k, oy = (b.Ay * ca + b.By * sa) * k, oz = b.Bz * sa * k;
      let z = coreZV + oz;
      if (z < Z_NEAR) z = Z_NEAR; // belt & suspenders for the tilted extremes
      const sc = fovV / (fovV + z);
      ptX = w / 2 + (coreWxV + ox - camX) * sc;
      ptY = h / 2 + (coreWyV + oy - camY) * sc;
      ptZ = z;
      ptS = sc;
    }

    // ── scene construction ────────────────────────────────────────────
    function buildNebula(variant: 'warm' | 'cool'): HTMLCanvasElement | null {
      const c = document.createElement('canvas');
      c.width = Math.max(2, Math.ceil(w / 2));
      c.height = Math.max(2, Math.ceil(h / 2));
      const g = c.getContext('2d');
      if (!g) return null;
      const W = c.width, H = c.height;
      const base = g.createLinearGradient(0, 0, 0, H);
      if (variant === 'warm') {
        base.addColorStop(0, '#070A16'); base.addColorStop(0.55, '#0A1024'); base.addColorStop(1, '#0C1430');
      } else {
        base.addColorStop(0, '#05070F'); base.addColorStop(0.55, '#0A1024'); base.addColorStop(1, '#0E1836');
      }
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      const cloud = (cx: number, cy: number, r: number, rgb: readonly [number, number, number], a: number) => {
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
        grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.38})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
      };
      if (variant === 'warm') {
        // dawn: gold low on the horizon (the world is lit from below-left),
        // cold azure breath behind the instrument, faint mist at the zenith
        cloud(W * 0.3, H * 1.02, H * 0.85, RGB.gold, 0.12);
        cloud(W * 0.16, H * 0.3, H * 0.7, RGB.azure, 0.1);
        cloud(W * 0.85, H * 0.05, H * 0.6, RGB.mist, 0.05);
      } else {
        // deep sky for the later acts: azure/violet dominant, dimmer gold
        cloud(W * 0.74, H * 0.14, H * 0.88, RGB.azure, 0.13);
        cloud(W * 0.2, H * 0.55, H * 0.8, RGB.violet, 0.08);
        cloud(W * 0.3, H * 1.05, H * 0.7, RGB.gold, 0.05);
      }
      return c;
    }

    function respawnStar(st: Star, atFar: boolean): void {
      const z = atFar ? zFarV * (0.82 + Math.random() * 0.18) : Z_NEAR * 2 + Math.random() * Math.max(1, zFarV - Z_NEAR * 2);
      st.z = z;
      // anchor to a random screen position at this depth, in world units
      const sc = fovV / (fovV + z);
      st.x = (w * (-0.08 + Math.random() * 1.16) - w / 2) / sc + camX;
      st.y = (h * (-0.08 + Math.random() * 1.16) - h / 2) / sc + camY;
      st.phase = Math.random() * TAU;
    }

    function makeStars(count: number): Star[] {
      const arr: Star[] = [];
      for (let i = 0; i < count; i++) {
        const st: Star = {
          x: 0, y: 0, z: 0, r: 0.4 + Math.pow(Math.random(), 2) * 2.1, base: 0.25 + Math.random() * 0.55,
          amp: 0.1 + Math.random() * 0.3, phase: 0, speed: 0.4 + Math.random() * 1.2,
          tint: (Math.random() < 0.72 ? 0 : Math.random() < 0.6 ? 1 : 2) as 0 | 1 | 2,
          glint: Math.random() < 0.08, dx: (Math.random() - 0.5) * 9, dy: (Math.random() - 0.5) * 6,
        };
        respawnStar(st, false);
        arr.push(st);
      }
      return arr;
    }

    function build() {
      const isLow = tier === 'low';
      stars = makeStars(isLow ? (mobile ? 100 : 160) : mobile ? 190 : 320);
      motes = [];
      const moteCount = isLow ? 14 : mobile ? 22 : 36;
      for (let i = 0; i < moteCount; i++) {
        motes.push({
          x: Math.random(), y: Math.random(),
          r: 1.2 + Math.random() * 2.4, a: 0.05 + Math.random() * 0.1,
          phase: Math.random() * TAU,
          dx: (Math.random() - 0.5) * 0.012, dy: (Math.random() - 0.5) * 0.008,
        });
      }
      // ambient knowledge nodes — the traveller's constellation (hover tier)
      pointerNodes = [];
      const nodeCount = 7;
      for (let i = 0; i < nodeCount; i++) {
        const a = (i / nodeCount) * TAU + 0.4;
        pointerNodes.push({
          x: 0.62 + Math.cos(a) * (0.1 + (i % 3) * 0.045),
          y: 0.5 + Math.sin(a) * (0.12 + (i % 2) * 0.07),
          r: 1.6 + Math.random() * 1.4,
          hue: (i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'azure' : 'mist') as 'gold' | 'azure' | 'mist',
          phase: Math.random() * TAU,
        });
      }
      // the knowledge sun — three pre-rendered layers + the diffraction star
      coreHot = sprite(128, RGB.hot, 0.95, [0, 0.18, 0.5, 1]);
      coreMid = sprite(180, RGB.amber, 0.75, [0, 0.22, 0.55, 1]);
      coreHalo = sprite(240, RGB.halo, 0.5, [0, 0.3, 0.65, 1]);
      starSprite = tier === 'full' ? buildStarSprite() : null;
      nodeGold = sprite(48, RGB.nodeG, 0.9);
      nodeAzure = sprite(48, RGB.nodeA, 0.9);
      dustSprite = sprite(48, RGB.ink, 0.5);
      raySprite = tier === 'full' ? buildRaySprite() : null;
      meteorSprite = buildMeteorSprite();
      nextMeteorAt = performance.now() + 4000 + Math.random() * 6000;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      docH = document.documentElement.scrollHeight;
      computeCamera(0, 0);
      driftBase = zFarV / 85; // a star crosses the volume in ~85s at rest
      nebulaWarm = buildNebula('warm');
      nebulaCool = buildNebula('cool');
      build();
      if (reducedMotion) paintStatic();
    }

    // ── planes ────────────────────────────────────────────────────────
    function drawNebula(t: number, hp: number, g: number, still: boolean) {
      if (!nebulaWarm) return;
      const dx = (still ? 0 : Math.sin(t * 0.00004) * 14) - leanX * 6;
      const dy = (still ? 0 : Math.cos(t * 0.00005) * 10) + hp * 26 - leanY * 5;
      const warmW = 1 - smoothstep(0.32, 0.68, g);
      ctx.globalAlpha = 1;
      ctx.drawImage(nebulaWarm, -w * 0.04 + dx, -h * 0.04 + dy, w * 1.08, h * 1.08);
      if (nebulaCool && warmW < 0.999) {
        ctx.globalAlpha = 1 - warmW; // exact crossfade: warm·w + cool·(1−w)
        ctx.drawImage(nebulaCool, -w * 0.04 + dx, -h * 0.04 + dy, w * 1.08, h * 1.08);
        ctx.globalAlpha = 1;
      }
    }

    function drawStarsPass(back: boolean, t: number, g: number, still: boolean) {
      // meteor season — a brief twinkle surge as the page crosses its middle
      const boost = 1 + 1.5 * Math.exp(-(((g - 0.5) / 0.075) ** 2));
      for (const st of stars) {
        if ((st.z >= coreZV) !== back) continue; // split at the core's depth
        const sc = fovV / (fovV + st.z);
        const X = w / 2 + (st.x - camX) * sc;
        const Y = h / 2 + (st.y - camY) * sc;
        if (!still && (X < -w * 0.14 || X > w * 1.14 || Y < -h * 0.14 || Y > h * 1.14)) {
          respawnStar(st, true); // streamed past the frame — re-enter at the far plane
          continue;
        }
        const tw = still
          ? st.base
          : clamp01(Math.max(0.03, st.base + Math.sin(t * 0.001 * st.speed + st.phase) * st.amp * boost));
        const c = st.tint === 0 ? RGB.ink : st.tint === 1 ? RGB.gold : RGB.azure;
        // depth fog: far stars shrink and dim hard — the volume reads through scale
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(tw * (0.18 + 0.82 * Math.min(1, sc * 1.7))).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(X, Y, st.r * (0.25 + 1.1 * sc), 0, TAU);
        ctx.fill();
        if (!still && st.glint && sc > 0.55 && tw > 0.55) {
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${((tw - 0.5) * 0.8).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          const g2 = st.r * 3.2;
          ctx.beginPath();
          ctx.moveTo(X - g2, Y); ctx.lineTo(X + g2, Y);
          ctx.moveTo(X, Y - g2); ctx.lineTo(X, Y + g2);
          ctx.stroke();
        }
      }
    }

    /** Trace ring `b`'s projected arc from a0 to a1 into a fresh Path2D. */
    function ringArc(b: RingBasis, a0: number, a1: number, steps: number): Path2D {
      const P = new Path2D();
      for (let i = 0; i <= steps; i++) {
        projectRingPoint(b, a0 + ((a1 - a0) * i) / steps, 1);
        if (i === 0) P.moveTo(ptX, ptY);
        else P.lineTo(ptX, ptY);
      }
      return P;
    }

    /** Back half of a ring — dim, thin, drawn before the core glow. */
    function strokeRingHalf(b: RingBasis, a0: number, a1: number, alpha: number, lw: number): void {
      ctx.strokeStyle = b.azure ? `rgba(132, 200, 255, ${alpha})` : `rgba(210, 174, 112, ${alpha})`;
      ctx.lineWidth = lw;
      ctx.stroke(ringArc(b, a0, a1, 40));
    }

    /**
     * Front half of a ring — bucketed by brightness toward the lower-left
     * light (4 alpha tiers keep stroke calls at 4/ring instead of ~44).
     */
    function strokeRingFront(b: RingBasis, a0: number, a1: number): void {
      // soft under-stroke first — gives the crisp line a metallic body/glow
      ctx.strokeStyle = b.azure ? 'rgba(134, 202, 255, 0.14)' : 'rgba(232, 196, 128, 0.18)';
      ctx.lineWidth = b.lw * 3.6;
      ctx.stroke(ringArc(b, a0, a1, 44));
      const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      let prevK = -1;
      // Fresnel rim: metal reflects most at grazing view — the silhouette
      // extremes of the projected ellipse. Track the max |x-offset| of the
      // arc, then brighten points near it (pow-falloff). Two passes: collect
      // extents first, bucket with the rim term blended in.
      let minX = Infinity, maxX = -Infinity;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 44; i++) {
        projectRingPoint(b, a0 + ((a1 - a0) * i) / 44, 1);
        pts.push([ptX, ptY]);
        if (ptX < minX) minX = ptX;
        if (ptX > maxX) maxX = ptX;
      }
      const spanX = Math.max(1, maxX - minX);
      for (let i = 0; i <= 44; i++) {
        const [x, y] = pts[i] ?? [0, 0];
        // k: 0..3 light bucket; rim adds up to +1 bucket near the extremes
        const edge = Math.abs(x - (minX + maxX) / 2) / (spanX / 2); // 0 center → 1 edge
        const rim = Math.pow(edge, 4) * 0.9;
        const k = Math.min(3, ((lightDot(x, y) + rim) * 1.6) | 0);
        const P = paths[k];
        if (!P) continue;
        if (k === prevK && i > 0) P.lineTo(x, y);
        else P.moveTo(x, y);
        prevK = k;
      }
      for (let k = 0; k < 4; k++) {
        const P = paths[k];
        if (!P) continue;
        const f = k / 3;
        ctx.strokeStyle = b.azure
          ? `rgba(134, 202, 255, ${(0.58 + 0.16 * f).toFixed(3)})`
          : `rgba(240, 206, 140, ${(0.72 + 0.2 * f).toFixed(3)})`;
        ctx.lineWidth = b.lw * (0.95 + 0.25 * f);
        ctx.stroke(P);
      }
    }

    /** Degree ticks + Arabic-Indic numerals on the limb's FRONT half only. */
    function drawGraduations(b: RingBasis): void {
      const fz = b.Bz >= 0 ? 1 : -1;
      const dim = new Path2D();
      const bright = new Path2D();
      for (let d = 0; d < 360; d += 5) {
        const a = d * DEG + b.s;
        if (Math.sin(a) * fz >= 0) continue; // behind the core this frame
        const f0 = d % 15 === 0 ? 0.962 : 0.977;
        projectRingPoint(b, a, f0);
        const x1 = ptX, y1 = ptY;
        projectRingPoint(b, a, 0.996);
        const P = lightDot(ptX, ptY) > 0.55 ? bright : dim;
        P.moveTo(x1, y1);
        P.lineTo(ptX, ptY);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(226, 192, 128, 0.4)';
      ctx.stroke(dim);
      ctx.strokeStyle = 'rgba(240, 210, 148, 0.58)';
      ctx.stroke(bright);

      // the limb speaks its mother tongue — Arabic-Indic numerals every 30°
      ctx.font = `500 ${Math.max(9, RsV * 0.052).toFixed(1)}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let d = 0; d < 360; d += 30) {
        const a = d * DEG + b.s;
        if (Math.sin(a) * fz >= 0) continue;
        projectRingPoint(b, a, 0.945);
        ctx.fillStyle = `rgba(244, 216, 156, ${(0.45 + 0.2 * lightDot(ptX, ptY)).toFixed(3)})`;
        ctx.fillText(arNum(d), ptX, ptY);
      }
    }

    /** Orbital nodes riding the rings — the far travellers / the near ones. */
    function drawOrbiters(t: number, hp: number, back: boolean): void {
      for (const ob of ORBITERS) {
        const b = bases[ob.ring];
        if (!b) continue;
        const a = ob.a0 + ob.speed * t * 0.001 + hp * b.scrollSpin * 0.6;
        projectRingPoint(b, a, 1);
        const isBack = ptZ > coreZV;
        if (isBack !== back) continue;
        const nx = ptX, ny = ptY;
        const depth = ptS / scaleCV; // >1 when nearer than the core's plane
        const size = ob.size * depth;
        const c = b.azure ? RGB.nodeA : RGB.nodeG;
        // a short arc-trail along the ring behind the node
        const dir = ob.speed >= 0 ? 1 : -1;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${back ? 0.16 : 0.4})`;
        ctx.lineWidth = 1.1;
        ctx.stroke(ringArc(b, a - dir * 0.255, a, 3));
        // glow + bright heart (dimmed when the core stands in front of it)
        ctx.globalAlpha = back ? 0.3 : 0.8;
        const s7 = size * 7;
        ctx.drawImage(b.azure ? nodeAzure : nodeGold, nx - s7 / 2, ny - s7 / 2, s7, s7);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${back ? 0.35 : 0.9})`;
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(1, size), 0, TAU);
        ctx.fill();
      }
    }

    /** Volumetric god rays — pre-rendered wedges, screen-blended, swaying. */
    function drawRays(t: number, still: boolean): void {
      if (!raySprite) return;
      ctx.save();
      ctx.translate(coreSxV, coreSyV);
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < RAYS.length; i++) {
        const r = RAYS[i];
        if (!r) continue;
        const sway = still ? 0 : Math.sin(t * 0.00021 + i * 1.7) * r.sway;
        const len = RsV * r.len * (still ? 1 : 1 + Math.sin(t * 0.00017 + i * 2.3) * 0.04);
        const dw = (len * RAY_W) / RAY_H;
        ctx.save();
        ctx.rotate((r.deg + sway) * DEG);
        ctx.globalAlpha = r.a * (still ? 1 : 0.85 + 0.15 * Math.sin(t * 0.0003 + i * 2.1));
        ctx.drawImage(raySprite, -dw / 2, -len, dw, len);
        ctx.restore();
      }
      ctx.restore();
    }

    function drawCore(t: number, hp: number, still: boolean): void {
      const breath = still ? 1.05 : 1 + Math.sin(t * 0.0016) * 0.14 + Math.sin(t * 0.0007) * 0.06;

      // (a) the outer halo — the instrument's light field (light, not glow-porn)
      const haloS = RsV * 3.15 * (still ? 1 : 1 + Math.sin(t * 0.0004) * 0.05);
      ctx.globalAlpha = 0.44;
      ctx.drawImage(coreHalo, coreSxV - haloS / 2, coreSyV - haloS / 2, haloS, haloS);
      ctx.globalAlpha = 1;

      // ring bases for this frame: tilt + slow precession + scroll spin
      for (let i = 0; i < RINGS.length; i++) {
        const ring = RINGS[i];
        const b = bases[i];
        if (!ring || !b) continue;
        const tz = ring.tiltZ + Math.sin(t * 0.00005 * ring.precess + ring.phase) * ring.precessAmp;
        const cz = Math.cos(tz), sz = Math.sin(tz);
        const cx1 = Math.cos(ring.tiltX), sx1 = Math.sin(ring.tiltX);
        b.Ax = cz; b.Ay = sz; b.Bx = -sz * cx1; b.By = cz * cx1; b.Bz = sx1;
        b.s = ring.spin * t * 0.001 + hp * ring.scrollSpin;
        b.rw = RwV * ring.f;
      }

      // (b) back halves — occluded by the coming glow, dimmed and thinner
      for (const b of bases) {
        const backStart = b.Bz >= 0 ? 0 : Math.PI;
        strokeRingHalf(b, backStart, backStart + Math.PI, b.azure ? 0.24 : 0.34, b.lw * 0.75);
      }
      drawOrbiters(t, hp, true);

      // (c) god rays — light rising up-right out of the core
      drawRays(t, still);

      // (d) mid glow — the amber breath of the knowledge sun
      const midS = RsV * 0.9 * breath;
      ctx.globalAlpha = 0.62;
      ctx.drawImage(coreMid, coreSxV - midS / 2, coreSyV - midS / 2, midS, midS);
      ctx.globalAlpha = 1;

      // (e) front halves — bright, graded toward the lower-left light
      for (const b of bases) {
        const frontStart = b.Bz >= 0 ? Math.PI : 0;
        strokeRingFront(b, frontStart, frontStart + Math.PI);
      }

      // (f) the graduated limb — ticks + Arabic-Indic numerals, front only
      const limb = bases[0];
      if (limb) drawGraduations(limb);

      // (g) the hot heart — near-white gold, layered twice for dynamic range
      const hotS = RsV * 0.26 * breath;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(coreHot, coreSxV - hotS / 2, coreSyV - hotS / 2, hotS, hotS);
      const hotS2 = RsV * 0.13 * breath;
      ctx.globalAlpha = 1;
      ctx.drawImage(coreHot, coreSxV - hotS2 / 2, coreSyV - hotS2 / 2, hotS2, hotS2);

      // (g2) the diffraction star — anamorphic streaks breathe with the sun
      if (starSprite) {
        const starS = RsV * 1.5 * (still ? 1 : 0.92 + 0.08 * Math.sin(t * 0.0016 + 0.6));
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.55;
        ctx.drawImage(starSprite, coreSxV - starS / 2, coreSyV - starS / 2, starS, starS);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // (h) front nodes — passing before the instrument
      drawOrbiters(t, hp, false);
    }

    function drawConstellation(t: number): void {
      if (!canHover || !pointerSeen) return;
      const mx = px * w;
      const my = py * h;
      for (const n of pointerNodes) {
        const nx = n.x * w - leanX * 26;
        const ny = n.y * h - leanY * 17 + Math.sin(t * 0.0011 + n.phase) * 5;
        const near = Math.max(0, 1 - Math.hypot(mx - nx, my - ny) / 220);
        const c = RGB[n.hue];
        if (near > 0.02) {
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(near * 0.35).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }
        const a = 0.35 + near * 0.5 + Math.sin(t * 0.002 + n.phase) * 0.12;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(nx, ny, n.r, 0, TAU);
        ctx.fill();
      }
    }

    function drawDust(t: number, hp: number, still: boolean): void {
      for (const m of motes) {
        const x = ((((m.x + t * 0.0000045 * m.dx * 60) % 1) + 1) % 1) * w - leanX * 52 - hp * 44;
        const y = ((((m.y + t * 0.000003 * m.dy * 60) % 1) + 1) % 1) * h - leanY * 34;
        ctx.globalAlpha = m.a * (still ? 1 : 0.7 + 0.3 * Math.sin(t * 0.001 + m.phase));
        ctx.drawImage(dustSprite, x - m.r * 3, y - m.r * 3, m.r * 6, m.r * 6);
      }
      ctx.globalAlpha = 1;
    }

    function stepMeteor(now: number, g: number): void {
      if (tier !== 'full') return;
      if (!meteor && now >= nextMeteorAt) {
        const fromRight = Math.random() > 0.5;
        meteor = {
          x: fromRight ? w * (0.7 + Math.random() * 0.3) : w * Math.random() * 0.3, y: -h * 0.05,
          vx: (fromRight ? -1 : 1) * (0.22 + Math.random() * 0.1), vy: 0.1 + Math.random() * 0.05,
          life: 0, max: 60 + Math.random() * 20,
        };
      }
      if (meteor) {
        meteor.life++;
        meteor.x += meteor.vx * w * 0.006; meteor.y += meteor.vy * h * 0.01;
        if (meteor.life >= meteor.max) {
          meteor = null;
          // the final act gets a slightly denser meteor shower
          nextMeteorAt = now + (g > 0.82 ? 3800 + Math.random() * 3200 : 7000 + Math.random() * 8000);
        }
      }
    }

    function drawMeteor(): void {
      if (!meteor || !meteorSprite) return;
      const fade = Math.sin((meteor.life / meteor.max) * Math.PI);
      const len = 100 + 50 * fade; // the streak breathes a little as it flies
      const k = len / METEOR_W;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(meteor.x, meteor.y);
      ctx.rotate(Math.atan2(meteor.vy * h * 0.01, meteor.vx * w * 0.006));
      ctx.drawImage(meteorSprite, -len, (-METEOR_TH * k) / 2, len, METEOR_TH * k);
      ctx.restore();
    }

    // ── frame ─────────────────────────────────────────────────────────
    function drawWorld(t: number, hp: number, g: number, still: boolean): void {
      ctx.clearRect(0, 0, w, h);
      drawNebula(t, hp, g, still);
      drawStarsPass(true, t, g, still); // stars behind the instrument
      drawCore(t, hp, still);
      drawStarsPass(false, t, g, still); // stars streaming past the viewer
      if (!still) drawConstellation(t);
      drawDust(t, hp, still);
      if (!still) drawMeteor();
    }

    function paintFrame(now: number): void {
      const t = now - t0;
      const dt = Math.min(50, now - (lastNow || now));
      lastNow = now;
      const dts = dt / 1000;

      const rect = canvas.getBoundingClientRect();
      // fixed mount: the canvas rect is pinned to the viewport, so the
      // hero's own element drives the scrub measurement instead.
      const trackEl = heroEl ?? canvas;
      const track = trackEl.getBoundingClientRect();
      heroProgress = clamp01(-track.top / Math.max(1, heroSpan));
      void rect;
      frameNo++;
      if ((frameNo & 255) === 0) docH = document.documentElement.scrollHeight;
      G = clamp01(window.scrollY / Math.max(1, docH - window.innerHeight));

      px += (pxTarget - px) * 0.06;
      py += (pyTarget - py) * 0.06;
      leanX = (px - 0.5) * 2; leanY = (py - 0.5) * 2;

      // the pointer moves the camera (near planes answer most)
      const M = Math.min(w, h) || 1;
      camX = leanX * 0.06 * M;
      camY = leanY * 0.038 * M;

      computeCamera(heroProgress, G);

      // the slow flight — stars stream toward the viewer, faster in the hero
      const spd = driftBase * (1 + 2.4 * heroProgress + 1.2 * G);
      for (const st of stars) {
        st.z -= spd * dts; st.x += st.dx * dts; st.y += st.dy * dts;
        if (st.z < Z_NEAR) respawnStar(st, true);
      }

      stepMeteor(now, G);
      drawWorld(t, heroProgress, G, false);
    }

    function paintStatic(): void {
      // reduced-motion: the whole world, composed, still — depth without motion
      camX = 0; camY = 0; leanX = 0; leanY = 0;
      computeCamera(0, 0);
      drawWorld(1400, 0, 0, true);
    }

    function loop(now: number): void {
      if (!running) return;
      // 30fps cap — the world is ambient (breath, twinkle, drift); 60Hz
      // doubles GPU/CPU cost for motion the eye cannot distinguish at
      // these speeds. Skipped frames fall through; dt clamps at 50ms so
      // long pauses can never teleport the drift.
      if (now - lastFrameAt < 31) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastFrameAt = now;
      paintFrame(now);
      raf = requestAnimationFrame(loop);
    }

    // ── lifecycle ─────────────────────────────────────────────────────
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointerSeen = true;
      const rect = canvas.getBoundingClientRect();
      pxTarget = Math.min(1.4, Math.max(-0.4, (e.clientX - rect.left) / rect.width));
      pyTarget = Math.min(1.4, Math.max(-0.4, (e.clientY - rect.top) / rect.height));
    };

    let io: IntersectionObserver | null = null;
    let onVisibility = () => {};

    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      lastNow = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // measure the hero. The canvas lives in a page-wide FIXED layer
    // (the world persists across every act), so the holder is looked up
    // in the document — the hero keeps its data-hero-holder attribute.
    // When mounted the legacy way (inside the sticky hero) the closest()
    // path still works, so both mounts measure identically.
    let heroEl: HTMLElement | null = null;
    const findHero = () => {
      heroEl = (canvas.closest('[data-hero-holder]') as HTMLElement | null) ??
        (document.querySelector('[data-hero-holder]') as HTMLElement | null);
    };
    const measureHero = () => {
      findHero();
      if (heroEl) {
        const hr = heroEl.getBoundingClientRect();
        heroSpan = Math.max(1, hr.height - window.innerHeight);
      } else {
        heroSpan = Math.max(1, window.innerHeight);
      }
      docH = document.documentElement.scrollHeight;
    };

    resize();
    measureHero();

    if (!reducedMotion) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) start();
          else stop();
        },
        { threshold: 0.01 }
      );
      io.observe(canvas);
      onVisibility = () => {
        if (document.hidden) stop();
        else if (!io || canvas.getBoundingClientRect().bottom > 0) start();
      };
      document.addEventListener('visibilitychange', onVisibility);
      if (canHover) window.addEventListener('pointermove', onPointer, { passive: true });
    }

    const ro = new ResizeObserver(() => {
      resize();
      measureHero();
    });
    ro.observe(canvas);

    return () => {
      stop();
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [density, biasX]);

  if (failed) return null;
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
