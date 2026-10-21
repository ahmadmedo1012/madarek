import type * as THREE_NS from 'three';

/**
 * ribbon/path — the authored centerline of the knowledge ribbon and its
 * rotation-minimizing frame field.
 *
 * The Meridian loop is a single closed analytic curve: an organic base
 * circle with a 3-lobe + 2-lobe radial wobble (so the silhouette is never
 * a plain ring) and a 2-lobe + 3-lobe out-of-plane wave (so the band rises
 * and dips as the camera orbits). Tangents are analytic — no numeric
 * differentiation noise — and frames are propagated with the
 * double-reflection rotation-minimizing frame (RMF) algorithm of
 * Wang et al. 2008, closed with the standard linear holonomy
 * compensation so the field is continuous around the loop.
 */

export interface RibbonPathConfig {
  /** Base loop radius (world units before the artwork's base scale). */
  radius: number;
  /** 3-lobe radial wobble amplitude (relative to radius). */
  lobe3: number;
  phase3: number;
  /** 2-lobe radial wobble amplitude (relative to radius). */
  lobe2: number;
  phase2: number;
  /** Out-of-plane 2-lobe wave amplitude. */
  wave2: number;
  wave2Phase: number;
  /** Out-of-plane 3-lobe wave amplitude. */
  wave3: number;
  wave3Phase: number;
}

export const DEFAULT_PATH: RibbonPathConfig = {
  radius: 1.15,
  lobe3: 0.055,
  phase3: 0.7,
  lobe2: 0.034,
  phase2: -0.4,
  wave2: 0.13,
  wave2Phase: 0.9,
  wave3: 0.04,
  wave3Phase: -0.5,
};

const TAU = Math.PI * 2;

/** Radial wobble w(θ) — shared by point and tangent evaluation. */
function wobble(c: RibbonPathConfig, theta: number): number {
  return (
    1 +
    c.lobe3 * Math.cos(3 * theta + c.phase3) +
    c.lobe2 * Math.cos(2 * theta + c.phase2)
  );
}

function wobbleDerivative(c: RibbonPathConfig, theta: number): number {
  return (
    -3 * c.lobe3 * Math.sin(3 * theta + c.phase3) -
    2 * c.lobe2 * Math.sin(2 * theta + c.phase2)
  );
}

/** Point on the Meridian centerline at angle θ ∈ [0, 2π). */
export function pathPoint(
  c: RibbonPathConfig,
  theta: number,
  out: THREE_NS.Vector3,
): THREE_NS.Vector3 {
  const w = wobble(c, theta);
  return out.set(
    c.radius * w * Math.cos(theta),
    c.wave2 * Math.sin(2 * theta + c.wave2Phase) +
      c.wave3 * Math.sin(3 * theta + c.wave3Phase),
    c.radius * w * Math.sin(theta),
  );
}

/** Analytic unit tangent of the centerline at θ. */
export function pathTangent(
  c: RibbonPathConfig,
  theta: number,
  out: THREE_NS.Vector3,
): THREE_NS.Vector3 {
  const w = wobble(c, theta);
  const wd = wobbleDerivative(c, theta);
  out.set(
    c.radius * (wd * Math.cos(theta) - w * Math.sin(theta)),
    2 * c.wave2 * Math.cos(2 * theta + c.wave2Phase) +
      3 * c.wave3 * Math.cos(3 * theta + c.wave3Phase),
    c.radius * (wd * Math.sin(theta) + w * Math.cos(theta)),
  );
  return out.normalize();
}

/**
 * Dense frame field: `count` entries; entry i lives at θ_i = 2π·i/count.
 * All vectors are flattened xyz triplets. The field is closure-corrected,
 * so entry 0 and a hypothetical entry `count` share orientation.
 */
export interface FrameTable {
  positions: Float32Array;
  tangents: Float32Array;
  normals: Float32Array;
  binormals: Float32Array;
  count: number;
}

/**
 * Build the closure-compensated RMF field for the Meridian loop.
 *
 * @param three   The injected three namespace (no side-effect imports).
 * @param c       Path configuration.
 * @param samples Frame-table density (quality tier).
 */
export function buildFrameTable(
  three: typeof THREE_NS,
  c: RibbonPathConfig,
  samples: number,
): FrameTable {
  const count = Math.max(64, Math.floor(samples));
  const positions = new Float32Array(count * 3);
  const tangents = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const binormals = new Float32Array(count * 3);

  const p = new three.Vector3();
  const t = new three.Vector3();
  const n = new three.Vector3();
  const b = new three.Vector3();
  const v1 = new three.Vector3();
  const tL = new three.Vector3();
  const nL = new three.Vector3();
  const v2 = new three.Vector3();
  const prevP = new three.Vector3();
  const prevT = new three.Vector3();
  const prevN = new three.Vector3();

  // Seed frame: reference up = +Y, normal = up projected ⊥ tangent.
  const up = new three.Vector3(0, 1, 0);

  const write = (i: number) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    tangents[i * 3] = t.x;
    tangents[i * 3 + 1] = t.y;
    tangents[i * 3 + 2] = t.z;
    normals[i * 3] = n.x;
    normals[i * 3 + 1] = n.y;
    normals[i * 3 + 2] = n.z;
    binormals[i * 3] = b.x;
    binormals[i * 3 + 1] = b.y;
    binormals[i * 3 + 2] = b.z;
  };

  // Frame 0.
  pathPoint(c, 0, p);
  pathTangent(c, 0, t);
  n.copy(up).addScaledVector(t, -up.dot(t)).normalize();
  if (!Number.isFinite(n.x) || n.lengthSq() < 1e-8) n.set(0, 0, 1);
  b.copy(t).cross(n).normalize();
  prevP.copy(p);
  prevT.copy(t);
  prevN.copy(n);
  write(0);

  // Double-reflection propagation around the loop (inclusive of the
  // wrap segment, so the holonomy can be measured at entry `count`).
  const wrapN = new three.Vector3();
  for (let i = 1; i <= count; i += 1) {
    const theta = (TAU * i) / count;
    pathPoint(c, theta, p);
    pathTangent(c, theta, t);

    v1.copy(p).sub(prevP);
    const c1 = v1.lengthSq();
    if (c1 > 1e-12) {
      // Reflection 1 (Wang et al. 2008): across the plane ⊥ chord v1,
      // carrying prevT → tL and prevN → nL.
      tL.copy(prevT).addScaledVector(v1, (-2 / c1) * prevT.dot(v1));
      nL.copy(prevN).addScaledVector(v1, (-2 / c1) * prevN.dot(v1));
      // Reflection 2: maps tL → t, so its plane normal is (t − tL).
      v2.copy(t).sub(tL);
      const c2 = v2.lengthSq();
      if (c2 > 1e-12) {
        n.copy(nL).addScaledVector(v2, (-2 / c2) * nL.dot(v2));
      } else {
        n.copy(nL);
      }
    } else {
      n.copy(prevN);
    }
    n.addScaledVector(t, -n.dot(t)).normalize();
    b.copy(t).cross(n).normalize();

    if (i < count) write(i);
    else wrapN.copy(n);

    prevP.copy(p);
    prevT.copy(t);
    prevN.copy(n);
  }

  // Holonomy: angle from frame-0 normal to the wrapped-around normal,
  // measured about the tangent. Distribute −δ linearly to close the field.
  const n0 = new three.Vector3(normals[0] ?? 0, normals[1] ?? 0, normals[2] ?? 0);
  const t0 = new three.Vector3(tangents[0] ?? 0, tangents[1] ?? 0, tangents[2] ?? 0);
  const nEnd = wrapN.addScaledVector(t0, -wrapN.dot(t0)).normalize();
  const cross = new three.Vector3().copy(n0).cross(nEnd);
  const delta = Math.atan2(cross.dot(t0), n0.dot(nEnd));

  if (Math.abs(delta) > 1e-6) {
    const q = new three.Quaternion();
    const axis = new three.Vector3();
    for (let i = 0; i < count; i += 1) {
      axis.set(tangents[i * 3] ?? 0, tangents[i * 3 + 1] ?? 0, tangents[i * 3 + 2] ?? 0);
      q.setFromAxisAngle(axis, (-delta * i) / count);
      n.fromArray(normals, i * 3).applyQuaternion(q);
      b.fromArray(binormals, i * 3).applyQuaternion(q);
      n.toArray(normals, i * 3);
      b.toArray(binormals, i * 3);
    }
  }

  return { positions, tangents, normals, binormals, count };
}

/** One sampled, twist-applied frame (build-time object, not per-frame). */
export interface SweepFrame {
  position: THREE_NS.Vector3;
  tangent: THREE_NS.Vector3;
  normal: THREE_NS.Vector3;
  binormal: THREE_NS.Vector3;
  theta: number;
}

export type TwistFn = (theta: number) => number;

/**
 * Sample `steps + 1` frames between θ0 and θ1 (θ1 > θ0 may exceed 2π —
 * the table wraps). Each frame's normal/binormal is rotated about the
 * tangent by `twist(θ)`, giving the authored design twist on top of the
 * rotation-minimizing base field.
 */
export function sampleFrames(
  three: typeof THREE_NS,
  table: FrameTable,
  theta0: number,
  theta1: number,
  steps: number,
  twist: TwistFn,
): SweepFrame[] {
  const frames: SweepFrame[] = [];
  const n = new three.Vector3();
  const q = new three.Quaternion();
  const span = theta1 - theta0;

  for (let j = 0; j <= steps; j += 1) {
    const theta = theta0 + (span * j) / steps;
    const f = (((theta / TAU) % 1) + 1) % 1;
    const x = f * table.count;
    const i0 = Math.floor(x) % table.count;
    const i1 = (i0 + 1) % table.count;
    const a = x - Math.floor(x);

    const frame: SweepFrame = {
      position: new three.Vector3(
        lerp(table.positions[i0 * 3] ?? 0, table.positions[i1 * 3] ?? 0, a),
        lerp(table.positions[i0 * 3 + 1] ?? 0, table.positions[i1 * 3 + 1] ?? 0, a),
        lerp(table.positions[i0 * 3 + 2] ?? 0, table.positions[i1 * 3 + 2] ?? 0, a),
      ),
      tangent: new three.Vector3(
        lerp(table.tangents[i0 * 3] ?? 0, table.tangents[i1 * 3] ?? 0, a),
        lerp(table.tangents[i0 * 3 + 1] ?? 0, table.tangents[i1 * 3 + 1] ?? 0, a),
        lerp(table.tangents[i0 * 3 + 2] ?? 0, table.tangents[i1 * 3 + 2] ?? 0, a),
      ).normalize(),
      normal: new three.Vector3(),
      binormal: new three.Vector3(),
      theta,
    };

    n.set(
      lerp(table.normals[i0 * 3] ?? 0, table.normals[i1 * 3] ?? 0, a),
      lerp(table.normals[i0 * 3 + 1] ?? 0, table.normals[i1 * 3 + 1] ?? 0, a),
      lerp(table.normals[i0 * 3 + 2] ?? 0, table.normals[i1 * 3 + 2] ?? 0, a),
    );
    const angle = twist(theta);
    if (angle !== 0) {
      q.setFromAxisAngle(frame.tangent, angle);
      n.applyQuaternion(q);
    }
    n.addScaledVector(frame.tangent, -n.dot(frame.tangent)).normalize();
    frame.normal.copy(n);
    frame.binormal.copy(frame.tangent).cross(n).normalize();
    frames.push(frame);
  }
  return frames;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Rotation-minimizing frames over an explicit open polyline (used by the
 * free sash arc, which has its own path rather than the shared table).
 * Returns one normal per input point; tangents are assumed unit length.
 */
export function rmfOverPolyline(
  three: typeof THREE_NS,
  points: THREE_NS.Vector3[],
  tangents: THREE_NS.Vector3[],
): THREE_NS.Vector3[] {
  const count = points.length;
  const out: THREE_NS.Vector3[] = [];
  const v1 = new three.Vector3();
  const tL = new three.Vector3();
  const nL = new three.Vector3();
  const v2 = new three.Vector3();
  const up = new three.Vector3(0, 1, 0);

  const t0 = tangents[0]!;
  const n0 = new three.Vector3().copy(up).addScaledVector(t0, -up.dot(t0));
  if (n0.lengthSq() < 1e-8) n0.set(0, 0, 1);
  n0.normalize();
  out.push(n0.clone());

  for (let i = 1; i < count; i += 1) {
    const prevN = out[i - 1]!;
    const prevT = tangents[i - 1]!;
    v1.copy(points[i]!).sub(points[i - 1]!);
    const c1 = v1.lengthSq();
    let n: THREE_NS.Vector3;
    if (c1 > 1e-12) {
      tL.copy(prevT).addScaledVector(v1, (-2 / c1) * prevT.dot(v1));
      nL.copy(prevN).addScaledVector(v1, (-2 / c1) * prevN.dot(v1));
      // Reflection plane normal is (tᵢ − tL) — maps tL onto tᵢ.
      v2.copy(tangents[i]!).sub(tL);
      const c2 = v2.lengthSq();
      n = c2 > 1e-12
        ? new three.Vector3().copy(nL).addScaledVector(v2, (-2 / c2) * nL.dot(v2))
        : nL.clone();
    } else {
      n = prevN.clone();
    }
    n.addScaledVector(tangents[i]!, -n.dot(tangents[i]!)).normalize();
    out.push(n);
  }
  return out;
}
