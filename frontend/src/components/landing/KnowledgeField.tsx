import { useEffect, useRef, useState } from 'react';

/**
 * KnowledgeField — «منظومة المعرفة الحيّة» WebGL engine.
 *
 * ONE persistent world behind the whole landing. A constellation of
 * nodes (الجامعة، الكليات، الوظائف، المحطات، الأدوار) threaded by light,
 * that MORPHS between the page's seven scenes as the user scrolls:
 *
 *   0 entry    — a golden hub (الجامعة) + a wide ring of 25 faculty nodes
 *   1 system   — nine function nodes close into orbital shells around the hub
 *   2 journey  — milestone nodes align along a serpentine learning path
 *   3 oasis    — the field recedes into a calm pool of drifting concepts
 *   4 roles    — four role nodes rise into quadrants
 *   5 quality  — nodes arrange into a data pipeline flowing upward
 *   6 join     — everything converges into a single point of light
 *
 * Craft contract (docs/execution-gap.md):
 *   · Zero dependencies — raw WebGL1, two tiny shaders.
 *   · Points drawn as gaussian glow sprites (additive), hairline threads
 *     with travelling light pulses, multi-depth star dust with fog.
 *   · DPR capped at 2 (1.5 on small screens); dust density scales with
 *     area and drops for saveData / low deviceMemory.
 *   · Pauses when the landing leaves the viewport or the tab hides;
 *     one static frame for prefers-reduced-motion (scroll-driven morph
 *     updates only — nothing animates on its own).
 *   · Any WebGL failure → the component hides itself; the CSS sky
 *     (gradients + star-dust layers) carries the scene alone.
 */

/* ───────────────────────────── palette ──────────────────────────── */

type Tint = 0 | 1 | 2 | 3 | 4; // gold · azure · mist · rose · teal
const TINT_RGB: readonly (readonly [number, number, number])[] = [
  [233, 180, 76], // gold  — knowledge light
  [111, 168, 255], // azure — structure
  [168, 178, 210], // mist  — context
  [233, 138, 166], // rose  — institution
  [122, 217, 201], // teal  — oasis calm
];

const STAGES = 7; // must match the DOM scene count

/* ────────────────────────── world model ─────────────────────────── */

type NodeSpec = {
  kind: 'hub' | 'faculty' | 'fn' | 'milestone' | 'role' | 'station' | 'dust' | 'nebula';
  tint: Tint;
  /** per-stage [x, y, depth, radius] — x,y in world units (≈ −1.6…1.6), depth 0 near → 1 far */
  s: number[][];
  /** per-stage brightness multiplier (0 = invisible in that scene) */
  b?: number[];
  /** autonomous drift amplitude (world units) — 0 for anchored nodes */
  drift?: number;
};

type FieldNode = {
  spec: NodeSpec;
  x: number; y: number; z: number; r: number; // current (morphed)
  phase: number; omega: number;
};

type Thread = { a: number; b: number; /** per-stage alpha */ alphas: number[] };
type Pulse = { thread: number; t: number; speed: number };

/* Deterministic PRNG — the same sky every visit (no flicker on rerenders). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

/** convenience: build a stage row */
const st = (x: number, y: number, z: number, r: number) => [x, y, z, r];

function buildWorld(dustCount: number): { nodes: FieldNode[]; threads: Thread[] } {
  const rnd = mulberry32(20260929);
  const specs: NodeSpec[] = [];
  const push = (spec: NodeSpec) => specs.push(spec);

  /* ── The hub — جامعة الزاوية ─────────────────────────────────── */
  push({
    kind: 'hub', tint: 0,
    s: [
      st(-0.52, 0.06, 0.10, 0.115), // 0 entry — sits left of the RTL headline
      st(0, 0.02, 0.08, 0.085),     // 1 system — system heart
      st(0.95, 0.55, 0.55, 0.05),   // 2 journey — recedes top-corner
      st(-0.62, 0.10, 0.30, 0.06),  // 3 oasis — quiet companion glow
      st(0, 0, 0.06, 0.07),         // 4 roles — the shared center
      st(1.05, 0.62, 0.50, 0.045),  // 5 quality — aside
      st(0, -0.04, 0.04, 0.16),     // 6 join — THE convergence point
    ],
    b: [1, 1, 0.5, 0.55, 0.8, 0.45, 1.35],
  });

  /* ── 25 faculties — the outer knowledge ring ──────────────────── */
  for (let i = 0; i < 25; i++) {
    const ang = (i / 25) * TAU + 0.35;
    const ring = 0.92 + rnd() * 0.34;
    const x = Math.cos(ang) * ring * 1.35;
    const y = Math.sin(ang) * ring * 0.78;
    const z = 0.32 + rnd() * 0.5;
    const r = 0.014 + rnd() * 0.014;
    const tint: Tint = i % 5 === 0 ? 1 : i % 7 === 3 ? 0 : 2;
    push({
      kind: 'faculty', tint,
      s: [
        st(x * 1.06 - 0.1, y * 1.1, z, r * 1.25), // entry — wide breathing ring
        st(x * 0.62, y * 0.6, Math.min(0.92, z + 0.34), r * 0.8), // system — recede
        st(x * 0.5, y * 0.5 + 0.5, 0.9, r * 0.7), // journey — far
        st(x * 0.42, y * 0.4, 0.95, r * 0.6), // oasis — almost gone
        st(x * 0.66, y * 0.66, 0.8, r * 0.9), // roles — supporting
        st(x * 0.4, y * 0.4 - 0.3, 0.92, r * 0.6), // quality — far
        st(x * 0.16, y * 0.16, 0.55, r * 1.1), // join — pulled inward
      ],
      b: [0.9, 0.5, 0.32, 0.25, 0.55, 0.3, 0.8],
      drift: 0.02,
    });
  }

  /* ── 9 functions — المحاضرات، الحضور، الدرجات، الامتحانات، البحوث،
        المكتبة، التحليلات، المساعد، الجودة ─────────────────────── */
  const FN_POS: [number, number][] = [
    [-0.13, 0.42], [0.34, 0.30], [0.42, -0.14], [0.30, -0.52], // محاضرات حضور درجات امتحانات
    [-0.52, -0.40], [-0.60, 0.10], [-0.18, -0.62], [0.02, 0.66], [0.66, 0.12], // بحوث مكتبة تحليلات مساعد جودة
  ];
  const FN_TINTS: Tint[] = [0, 2, 2, 0, 1, 1, 0, 4, 3];
  for (let i = 0; i < 9; i++) {
    const fpos = FN_POS[i] ?? [0, 0];
    const fx = fpos[0], fy = fpos[1];
    const fTint: Tint = FN_TINTS[i] ?? 2;
    push({
      kind: 'fn', tint: fTint,
      s: [
        st(fx * 1.8, fy * 1.5, 0.85, 0.006), // entry — hidden among dust
        st(fx, fy, 0.12, i === 0 || i === 3 || i === 6 || i === 7 ? 0.05 : 0.042), // system — orbital shells
        st(fx * 0.3, fy * 0.3 + 0.4, 0.85, 0.01), // journey — recede
        st(fx * 0.24, fy * 0.3, 0.9, 0.012), // oasis — only oasis-tinted breathe (alpha via b)
        st(fx * 0.2, fy * 0.2, 0.92, 0.012), // roles — dim
        st(fx * 0.55, fy * 0.5 - 0.35, 0.8, 0.016), // quality — faint
        st(fx * 0.12, fy * 0.1, 0.4, 0.02), // join — gather
      ],
      b: [0.25, 1.35, 0.3, i === 7 ? 0.9 : 0.22, 0.3, 0.45, 0.75],
      drift: 0.012,
    });
  }

  /* ── 8 journey milestones — serpentine path (right → left, RTL) ── */
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    // serpentine: x sweeps right→left with vertical wave, alternating z
    const jx = 1.15 - t * 2.3;
    const jy = Math.sin(t * Math.PI * 2.2) * 0.52;
    const jz = i % 2 === 0 ? 0.1 : 0.34;
    push({
      kind: 'milestone', tint: i === 7 ? 0 : 1,
      s: [
        st(jx * 0.5, jy * 0.4, 0.9, 0.006),
        st(jx * 0.4, jy * 0.35, 0.92, 0.006),
        st(jx, jy, jz, 0.038), // journey — THE path
        st(jx * 0.3, jy * 0.3, 0.93, 0.008),
        st(jx * 0.25, jy * 0.25, 0.94, 0.008),
        st(jx * 0.2, jy * 0.2, 0.95, 0.008),
        st(jx * 0.1, jy * 0.08, 0.5, 0.014),
      ],
      b: [0.3, 0.3, 1.5, 0.28, 0.3, 0.3, 0.7],
    });
  }

  /* ── 4 roles — quadrants ──────────────────────────────────────── */
  const ROLE_POS: [number, number][] = [[0.62, 0.44], [-0.62, 0.44], [0.62, -0.44], [-0.62, -0.44]];
  const ROLE_TINTS: Tint[] = [0, 1, 3, 4];
  for (let i = 0; i < 4; i++) {
    const rpos = ROLE_POS[i] ?? [0, 0];
    const rx = rpos[0], ry = rpos[1];
    const rTint: Tint = ROLE_TINTS[i] ?? 0;
    push({
      kind: 'role', tint: rTint,
      s: [
        st(rx * 0.4, ry * 0.4, 0.9, 0.007),
        st(rx * 0.35, ry * 0.35, 0.9, 0.007),
        st(rx * 0.3, ry * 0.3, 0.93, 0.008),
        st(rx * 0.25, ry * 0.25, 0.94, 0.008),
        st(rx, ry, 0.08, 0.056), // roles — rise into quadrants
        st(rx * 0.3, ry * 0.3 - 0.2, 0.9, 0.01),
        st(rx * 0.14, ry * 0.1, 0.45, 0.02),
      ],
      b: [0.35, 0.35, 0.32, 0.3, 1.6, 0.35, 0.8],
      drift: 0.01,
    });
  }

  /* ── 4 quality stations — ascending pipeline ──────────────────── */
  for (let i = 0; i < 4; i++) {
    const qy = 0.62 - i * 0.42;
    push({
      kind: 'station', tint: i === 3 ? 0 : 4,
      s: [
        st(-1.0, qy * 0.4, 0.92, 0.006),
        st(-0.7, qy * 0.4, 0.92, 0.006),
        st(-0.5, qy * 0.4, 0.93, 0.007),
        st(-0.4, qy * 0.4, 0.94, 0.007),
        st(-0.3, qy * 0.4, 0.94, 0.008),
        st(-0.1, qy, 0.06, 0.046), // quality — THE pipeline (right of RTL text)
        st(-0.03, qy * 0.12, 0.5, 0.014),
      ],
      b: [0.3, 0.3, 0.3, 0.28, 0.32, 1.5, 0.7],
    });
  }

  /* ── star dust — depth layers ─────────────────────────────────── */
  for (let i = 0; i < dustCount; i++) {
    const dx = (rnd() * 2 - 1) * 1.9;
    const dy = (rnd() * 2 - 1) * 1.15;
    const dz = rnd();
    const dr = 0.004 + rnd() * 0.008 * (1 - dz * 0.6);
    const tint: Tint = rnd() < 0.14 ? 0 : rnd() < 0.3 ? 1 : 2;
    // dust keeps its place in every stage (parallax bed), only dims
    const rows = Array.from({ length: STAGES }, (_, k) =>
      st(dx * (k === 6 ? 0.5 : 1), dy * (k === 6 ? 0.5 : 1), dz, dr * (k === 6 ? 0.85 : 1)));
    push({ kind: 'dust', tint, s: rows, drift: 0.05 + rnd() * 0.08 });
  }

  /* ── nodes → engine arrays ────────────────────────────────────── */
  const nodes: FieldNode[] = specs.map((spec) => ({
    spec, x: 0, y: 0, z: 0, r: 0,
    phase: rnd() * TAU,
    omega: 0.12 + rnd() * 0.5,
  }));

  /* ── threads — light links (positions follow nodes as they morph) ── */
  const indexByKind: Record<string, number[]> = {};
  for (let i = 0; i < specs.length; i++) {
    const k = specs[i]?.kind;
    if (!k) continue;
    (indexByKind[k] ??= []).push(i);
  }

  const threads: Thread[] = [];
  const link = (a: number, b: number, alphas: number[]) => threads.push({ a, b, alphas });
  const hub = indexByKind.hub?.[0] ?? 0;
  const fns = indexByKind.fn ?? [];
  const miles = indexByKind.milestone ?? [];
  const roles = indexByKind.role ?? [];
  const stations = indexByKind.station ?? [];
  const faculties = indexByKind.faculty ?? [];

  // system: hub ↔ each function node (bright in scene 1)
  for (let i = 0; i < 9; i++) {
    link(hub, fns[i] ?? 0,
      [0.06, 0.5, 0.05, 0.04, 0.08, 0.05, 0.1]);
  }
  // system cross-links: محاضرات↔حضور، محاضرات↔امتحانات، امتحانات↔تحليلات، تحليلات↔جودة، مكتبة↔بحوث، Oasis↔تحليلات
  const cross: [number, number][] = [[0, 1], [0, 3], [3, 6], [6, 8], [5, 4], [7, 6]];
  for (const [a, b] of cross) {
    link(fns[a] ?? 0, fns[b] ?? 0,
      [0.02, 0.3, 0.02, 0.02, 0.04, 0.03, 0.05]);
  }
  // journey: milestone chain (bright in scene 2)
  for (let i = 0; i < 7; i++) {
    link(miles[i] ?? 0, miles[i + 1] ?? 0,
      [0.02, 0.02, 0.55, 0.02, 0.02, 0.02, 0.06]);
  }
  // roles: each role ↔ hub (bright in scene 4)
  for (let i = 0; i < 4; i++) {
    link(hub, roles[i] ?? 0,
      [0.03, 0.03, 0.03, 0.02, 0.45, 0.03, 0.12]);
  }
  // quality: station chain ascending (bright in scene 5)
  for (let i = 0; i < 3; i++) {
    link(stations[i] ?? 0, stations[i + 1] ?? 0,
      [0.02, 0.02, 0.02, 0.02, 0.03, 0.5, 0.08]);
  }
  // join: faint converging spokes from a few faculties to hub
  for (let i = 0; i < 25; i += 4) {
    link(faculties[i] ?? 0, hub,
      [0.02, 0.02, 0.02, 0.02, 0.03, 0.02, 0.16]);
  }

  return { nodes, threads };
}

/* ──────────────────────────── shaders ───────────────────────────── */

const VERT_POINT = `
attribute vec2 aPos;
attribute float aSize;
attribute vec4 aColor;
varying vec4 vColor;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
  gl_PointSize = aSize;
  vColor = aColor;
}`;

const FRAG_POINT = `
precision mediump float;
varying vec4 vColor;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(uv, uv);
  if (d2 > 1.0) discard;
  float core = exp(-d2 * 9.0);
  float halo = exp(-d2 * 2.6) * 0.42;
  gl_FragColor = vec4(vColor.rgb, vColor.a * (core + halo));
}`;

const VERT_LINE = `
attribute vec2 aPos;
attribute float aAlpha;
varying float vAlpha;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
  vAlpha = aAlpha;
}`;

const FRAG_LINE = `
precision mediump float;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vAlpha * 0.92, vAlpha * 0.82, vAlpha * 0.55, vAlpha);
}`;

/* ─────────────────────────── component ──────────────────────────── */

export type KnowledgeFieldHandle = {
  /** float 0…6 — the world morphs toward this stage position */
  setStageProgress: (v: number) => void;
  /** override accent tint per role scene (index 0-3) — null clears */
  setRoleTint: (role: number | null) => void;
};

type Props = {
  className?: string;
  handleRef?: React.MutableRefObject<KnowledgeFieldHandle | null>;
  density?: 'full' | 'low';
};

export function KnowledgeField({ className, handleRef, density }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData =
      (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const lowMem = (navigator as { deviceMemory?: number }).deviceMemory !== undefined
      ? (navigator as { deviceMemory?: number }).deviceMemory! <= 2
      : false;
    const tier = density ?? (saveData || lowMem ? 'low' : 'full');

    const gl = (canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
      || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) { setFailed(true); return; }

    /* ── program setup ── */
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader');
      return sh;
    };
    let progPoint: WebGLProgram, progLine: WebGLProgram;
    try {
      const pp = gl.createProgram()!;
      gl.attachShader(pp, compile(gl.VERTEX_SHADER, VERT_POINT));
      gl.attachShader(pp, compile(gl.FRAGMENT_SHADER, FRAG_POINT));
      gl.linkProgram(pp);
      const pl = gl.createProgram()!;
      gl.attachShader(pl, compile(gl.VERTEX_SHADER, VERT_LINE));
      gl.attachShader(pl, compile(gl.FRAGMENT_SHADER, FRAG_LINE));
      gl.linkProgram(pl);
      if (!gl.getProgramParameter(pp, gl.LINK_STATUS) || !gl.getProgramParameter(pl, gl.LINK_STATUS)) throw new Error('link');
      progPoint = pp; progLine = pl;
    } catch {
      setFailed(true);
      return;
    }

    const locP = {
      pos: gl.getAttribLocation(progPoint, 'aPos'),
      size: gl.getAttribLocation(progPoint, 'aSize'),
      color: gl.getAttribLocation(progPoint, 'aColor'),
    };
    const locL = {
      pos: gl.getAttribLocation(progLine, 'aPos'),
      alpha: gl.getAttribLocation(progLine, 'aAlpha'),
    };

    const bufPointPos = gl.createBuffer();
    const bufPointSize = gl.createBuffer();
    const bufPointColor = gl.createBuffer();
    const bufLinePos = gl.createBuffer();
    const bufLineAlpha = gl.createBuffer();

    /* ── world ── */
    const small = window.innerWidth < 720;
    const dustCount = tier === 'low' ? 90 : small ? 150 : 240;
    const { nodes, threads } = buildWorld(dustCount);
    const pulses: Pulse[] = [];
    for (let i = 0; i < threads.length; i++) {
      const n = tier === 'low' ? 1 : 2;
      for (let k = 0; k < n; k++) {
        pulses.push({ thread: i, t: Math.random(), speed: 0.1 + Math.random() * 0.22 });
      }
    }

    /* ── state ── */
    let stageTarget = 0; // morph target (float)
    let stageShown = 0;
    let roleTint: number | null = null;
    let mouseTX = 0, mouseTY = 0, mouseCX = 0, mouseCY = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    let W = 0, H = 0, aspect = 1;
    let running = true;
    let raf = 0;
    let visible = true;
    const t0 = performance.now();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.5 : 2);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      aspect = W / Math.max(1, H);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    /* ── per-frame buffers ── */
    const N = nodes.length;
    const posArr = new Float32Array(N * 2);
    const sizeArr = new Float32Array(N);
    const colorArr = new Float32Array(N * 4);
    const T = threads.length;
    const linePos = new Float32Array(T * 4);
    const lineAlpha = new Float32Array(T * 2);
    const pulsePos = new Float32Array(pulses.length * 2);
    const pulseSize = new Float32Array(pulses.length);
    const pulseColor = new Float32Array(pulses.length * 4);

    const mixTint = (tint: Tint, goldMix: number): [number, number, number] => {
      const g = TINT_RGB[0] ?? [233, 180, 76];
      const c = TINT_RGB[tint] ?? g;
      return [
        g[0] * goldMix + c[0] * (1 - goldMix),
        g[1] * goldMix + c[1] * (1 - goldMix),
        g[2] * goldMix + c[2] * (1 - goldMix),
      ];
    };

    const project = (x: number, y: number, z: number): [number, number] => {
      const persp = 1 / (1 + z * 1.9);
      const px = (x * persp + mouseCX) / Math.max(0.6, aspect * 0.62);
      const py = (y * persp + mouseCY) / 1.06;
      return [px, py];
    };

    const morph = (node: FieldNode, sp: number) => {
      const s = node.spec;
      const i0 = Math.max(0, Math.min(STAGES - 1, Math.floor(sp)));
      const i1 = Math.min(STAGES - 1, i0 + 1);
      const t = Math.max(0, Math.min(1, sp - i0));
      const e = t * t * (3 - 2 * t); // smoothstep
      const a = s.s[i0] ?? [0, 0, 1, 0];
      const b = s.s[i1] ?? a;
      const ax = a[0] ?? 0, ay = a[1] ?? 0, az = a[2] ?? 1, ar = a[3] ?? 0;
      const bx = b[0] ?? ax, by = b[1] ?? ay, bz = b[2] ?? az, br = b[3] ?? ar;
      node.x = ax + (bx - ax) * e;
      node.y = ay + (by - ay) * e;
      node.z = az + (bz - az) * e;
      node.r = ar + (br - ar) * e;
      const bRow = s.b ?? [1, 1, 1, 1, 1, 1, 1];
      const bA = bRow[i0] ?? 1;
      const bB = bRow[i1] ?? 1;
      return bA + (bB - bA) * e;
    };

    const render = (now: number) => {
      const time = (now - t0) / 1000;

      // ease the shown stage toward its target (butter-smooth morph)
      stageShown += (stageTarget - stageShown) * 0.09;
      mouseCX += (mouseTX - mouseCX) * 0.05;
      mouseCY += (mouseTY - mouseCY) * 0.05;

      const sp = stageShown;
      const i0 = Math.max(0, Math.min(STAGES - 1, Math.floor(sp + 0.0001)));

      // ── nodes ──
      for (let i = 0; i < N; i++) {
        const node = nodes[i];
        if (!node) continue;
        const bright = morph(node, sp);
        const s = node.spec;
        let x = node.x, y = node.y;
        if (!reduced && s.drift) {
          x += Math.sin(time * node.omega + node.phase) * s.drift;
          y += Math.cos(time * node.omega * 0.8 + node.phase * 1.7) * s.drift * 0.8;
        }
        let tw = 1;
        if (!reduced) {
          tw = 0.78 + 0.22 * Math.sin(time * (s.kind === 'dust' ? 0.7 : 1.4) + node.phase * 3.1);
        }
        // role tint override: while in stage 4, dim non-active role colors toward gold
        let tint = s.tint;
        if (roleTint !== null && s.kind === 'role') {
          tint = (s.tint === roleTint) ? s.tint : 2;
        }
        const rgb = mixTint(tint, tint === 0 ? 1 : roleTint !== null && s.kind === 'role' && tint === s.tint ? 0.65 : 0);
        const [px, py] = project(x, y, node.z);
        posArr[i * 2] = px; posArr[i * 2 + 1] = py;
        const fog = 1 - node.z * 0.62;
        const alpha = Math.max(0, Math.min(1, bright * tw * fog * (s.kind === 'dust' ? 0.6 : 1)));
        const sizePx = node.r * (H * dpr) * 46 * (s.kind === 'hub' ? 1 : 0.9);
        sizeArr[i] = Math.max(2, sizePx);
        colorArr[i * 4] = rgb[0] / 255;
        colorArr[i * 4 + 1] = rgb[1] / 255;
        colorArr[i * 4 + 2] = rgb[2] / 255;
        colorArr[i * 4 + 3] = alpha;
      }

      // ── threads + pulses ──
      let pi = 0;
      for (let i = 0; i < T; i++) {
        const th = threads[i];
        if (!th) continue;
        const a0 = th.alphas[i0] ?? 0, a1 = th.alphas[Math.min(STAGES - 1, i0 + 1)] ?? 0;
        const frac = Math.max(0, Math.min(1, sp - i0));
        let alpha = a0 + (a1 - a0) * frac;
        if (roleTint !== null && i >= 16 && i <= 19) { // role threads brighter for active role
          alpha *= i - 16 === roleTint ? 1.5 : 0.5;
        }
        const na = nodes[th.a], nb = nodes[th.b];
        if (!na || !nb) continue;
        const [ax, ay] = project(na.x, na.y, na.z);
        const [bx, by] = project(nb.x, nb.y, nb.z);
        linePos[i * 4] = ax; linePos[i * 4 + 1] = ay;
        linePos[i * 4 + 2] = bx; linePos[i * 4 + 3] = by;
        lineAlpha[i * 2] = alpha; lineAlpha[i * 2 + 1] = alpha;

        // pulses travel only on sufficiently bright threads
        for (const p of pulses) {
          if (p.thread !== i) continue;
          p.t += reduced ? 0 : p.speed * 0.016;
          if (p.t > 1) p.t -= 1;
          if (alpha > 0.18) {
            const tx = ax + (bx - ax) * p.t;
            const ty = ay + (by - ay) * p.t;
            pulsePos[pi * 2] = tx; pulsePos[pi * 2 + 1] = ty;
            pulseSize[pi] = 3.2 * dpr * (0.8 + 0.4 * Math.sin(p.t * Math.PI));
            pulseColor[pi * 4] = 1; pulseColor[pi * 4 + 1] = 0.86;
            pulseColor[pi * 4 + 2] = 0.55; pulseColor[pi * 4 + 3] = alpha * 0.9 * Math.sin(p.t * Math.PI);
            pi++;
          }
        }
      }
      const pulseCount = pi;

      // ── draw ──
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);

      // threads (normal alpha blend — hairlines)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(progLine);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufLinePos);
      gl.bufferData(gl.ARRAY_BUFFER, linePos, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(locL.pos);
      gl.vertexAttribPointer(locL.pos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufLineAlpha);
      gl.bufferData(gl.ARRAY_BUFFER, lineAlpha, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(locL.alpha);
      gl.vertexAttribPointer(locL.alpha, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, T * 2);

      // nodes + pulses (additive glow)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(progPoint);
      const drawPoints = (
        bufPos: WebGLBuffer, dataPos: Float32Array,
        bufSize: WebGLBuffer, dataSize: Float32Array,
        bufColor: WebGLBuffer, dataColor: Float32Array,
        count: number,
      ) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, dataPos, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(locP.pos);
        gl.vertexAttribPointer(locP.pos, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufSize);
        gl.bufferData(gl.ARRAY_BUFFER, dataSize, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(locP.size);
        gl.vertexAttribPointer(locP.size, 1, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufColor);
        gl.bufferData(gl.ARRAY_BUFFER, dataColor, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(locP.color);
        gl.vertexAttribPointer(locP.color, 4, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, count);
      };
      drawPoints(bufPointPos, posArr, bufPointSize, sizeArr, bufPointColor, colorArr, N);
      if (pulseCount > 0) {
        drawPoints(bufPointPos, pulsePos, bufPointSize, pulseSize, bufPointColor, pulseColor, pulseCount);
      }

      if (running && visible && !document.hidden && !reduced) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(render);
    };

    /* ── wiring ── */
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const onVisibility = () => { if (!document.hidden) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    document.addEventListener('visibilitychange', onVisibility);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) wake();
    }, { threshold: 0.002 });
    io.observe(canvas);

    const canHover = window.matchMedia('(hover: hover)').matches;
    const onMouse = (e: MouseEvent) => {
      mouseTX = ((e.clientX / Math.max(1, window.innerWidth)) * 2 - 1) * 0.035;
      mouseTY = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1) * 0.035;
    };
    if (canHover && !reduced) window.addEventListener('mousemove', onMouse, { passive: true });

    // public handle for the page's scroll engine
    if (handleRef) {
      handleRef.current = {
        setStageProgress: (v: number) => { stageTarget = v; wake(); },
        setRoleTint: (role: number | null) => { roleTint = role; wake(); },
      };
    }

    raf = requestAnimationFrame(render);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (canHover && !reduced) window.removeEventListener('mousemove', onMouse);
      gl.deleteProgram(progPoint);
      gl.deleteProgram(progLine);
      gl.deleteBuffer(bufPointPos); gl.deleteBuffer(bufPointSize); gl.deleteBuffer(bufPointColor);
      gl.deleteBuffer(bufLinePos); gl.deleteBuffer(bufLineAlpha);
      if (handleRef) handleRef.current = null;
    };
  }, [density, handleRef]);

  if (failed) return null;
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
