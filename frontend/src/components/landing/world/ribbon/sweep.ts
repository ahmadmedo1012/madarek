import type * as THREE_NS from 'three';
import type { SweepFrame } from './path';

/**
 * ribbon/sweep — the cross-section and sweep-geometry builder.
 *
 * Every solid part of the artwork is a 2D profile swept along sampled
 * frames. The profile is a rounded rectangle (flat bar with corner arcs
 * — the chamfer is what catches studio light along the band edges), and
 * normals are computed analytically from the profile arc directions, so
 * edges read crisp where they should and smooth along the sweep. No
 * `computeVertexNormals()` averaging smudges.
 */

export interface ProfileSpec {
  /** Full width across the band (u axis). */
  width: number;
  /** Full thickness of the band (v axis). */
  thickness: number;
  /** Corner-arc radius (0 < c ≤ min(w,h)/2). */
  chamfer: number;
  /** Arc segments per corner: 2 → 12-point smooth chamfer, 1 → 8-point bevel. */
  cornerArcSteps: number;
  /** Convex face crown as a fraction of thickness (0 = flat faces). */
  crown?: number;
}

export interface ProfilePoint {
  /** u ∈ width axis, v ∈ thickness axis. */
  u: number;
  v: number;
  /** Outward 2D profile normal. */
  nu: number;
  nv: number;
}

/** Walk a rounded-rectangle profile CCW (viewed from +tangent). */
export function buildProfile(spec: ProfileSpec): ProfilePoint[] {
  const hw = spec.width / 2;
  const ht = spec.thickness / 2;
  const c = Math.min(spec.chamfer, Math.min(hw, ht) * 0.98);
  const steps = Math.max(1, Math.floor(spec.cornerArcSteps));
  const crown = Math.max(0, spec.crown ?? 0);
  const points: ProfilePoint[] = [];

  const corner = (cx: number, cy: number, a0: number) => {
    for (let s = 0; s <= steps; s += 1) {
      const a = a0 + (Math.PI / 2) * (s / steps);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      points.push({ u: cx + c * ca, v: cy + c * sa, nu: ca, nv: sa });
    }
  };

  // Corners in quadrants I → IV, CCW in (u, v).
  corner(hw - c, ht - c, 0);

  // Crowned top edge: parabolic rise toward the centerline midpoint.
  if (crown > 0) {
    const edge = hw - c;
    for (const f of [0.62, 0.24, -0.24, -0.62]) {
      const u = edge * f;
      const rise = crown * spec.thickness * (1 - (u / hw) ** 2);
      const dvdu = (-2 * rise * u) / (hw * hw);
      const len = Math.hypot(dvdu, 1);
      points.push({ u, v: ht + rise, nu: dvdu / len, nv: 1 / len });
    }
  }

  corner(-(hw - c), ht - c, Math.PI / 2);
  corner(-(hw - c), -(ht - c), Math.PI);

  if (crown > 0) {
    const edge = hw - c;
    for (const f of [-0.62, -0.24, 0.24, 0.62]) {
      const u = edge * f;
      const rise = crown * spec.thickness * (1 - (u / hw) ** 2);
      const dvdu = (2 * rise * u) / (hw * hw);
      const len = Math.hypot(dvdu, 1);
      points.push({ u, v: -ht - rise, nu: dvdu / len, nv: -1 / len });
    }
  }

  corner(hw - c, -(ht - c), (3 * Math.PI) / 2);
  return points;
}

/** Optional modulation of width/thickness along a sweep (s01, θ). */
export type SweepModulation = (s01: number, theta: number) => number;

export interface SweepSpec {
  frames: SweepFrame[];
  profile: ProfilePoint[];
  /** Closed ring (seamless wrap) vs open arc (capped ends). */
  closed: boolean;
  /** Emit flat end caps for open sweeps. */
  caps: boolean;
  /** UV repeats per full loop along the sweep direction. */
  uPerTurn: number;
  widthScale?: SweepModulation;
  thicknessScale?: SweepModulation;
}

export interface SweepResult {
  geometry: THREE_NS.BufferGeometry;
  /** World-space (holder-space) transform placing the geometry back on its path. */
  basePosition: THREE_NS.Vector3;
  baseQuaternion: THREE_NS.Quaternion;
}

const TAU = Math.PI * 2;

/**
 * Sweep a profile along frames. Vertices are emitted in the LOCAL space of
 * the first frame (tangent = +X, normal = +Y, binormal = +Z), so the mesh
 * can later flex about its own tangent axis by rotating around local X.
 */
export function sweepGeometry(
  three: typeof THREE_NS,
  spec: SweepSpec,
): SweepResult {
  const { frames, profile } = spec;
  const K = profile.length;
  const rows = frames.length;
  // Closed sweeps receive frames whose last entry duplicates the first
  // (θ = 2π ≡ 0). Ring 0..rows-2 are real rings; the seam row re-uses
  // ring 0's space with the far-end UV so the texture wraps cleanly.
  const bodyRows = spec.closed ? rows - 1 : rows;
  const vertRows = spec.closed ? rows : rows; // seam row replaces the dup frame

  const capVerts = spec.caps && !spec.closed ? (K + 1) * 2 : 0; // center + ring per cap
  const vertCount = vertRows * K + capVerts;

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices: number[] = [];

  // Reference basis from the first frame.
  const f0 = frames[0]!;
  const basis = new three.Matrix4().makeBasis(
    f0.tangent,
    f0.normal,
    f0.binormal,
  );
  const invBasis = new three.Matrix4().copy(basis).invert();
  const v = new three.Vector3();
  const nrm = new three.Vector3();
  const basePosition = f0.position.clone();
  const baseQuaternion = new three.Quaternion().setFromRotationMatrix(basis);

  let thetaSpan = frames[rows - 1]!.theta - f0.theta;
  if (spec.closed) thetaSpan = TAU;

  const fullTurnTheta = spec.closed ? TAU : thetaSpan;

  const writeRing = (row: number, frame: SweepFrame, uValue: number) => {
    const ws = spec.widthScale ? spec.widthScale(row / (rows - 1), frame.theta) : 1;
    const ts = spec.thicknessScale ? spec.thicknessScale(row / (rows - 1), frame.theta) : 1;
    for (let k = 0; k < K; k += 1) {
      const pk = profile[k]!;
      const idx = row * K + k;
      v.copy(frame.position)
        .addScaledVector(frame.normal, pk.u * ws)
        .addScaledVector(frame.binormal, pk.v * ts)
        .sub(basePosition)
        .applyMatrix4(invBasis);
      positions[idx * 3] = v.x;
      positions[idx * 3 + 1] = v.y;
      positions[idx * 3 + 2] = v.z;

      nrm.copy(frame.normal).multiplyScalar(pk.nu).addScaledVector(frame.binormal, pk.nv);
      nrm.applyMatrix4(invBasis); // rotation-only → normals transform identically
      normals[idx * 3] = nrm.x;
      normals[idx * 3 + 1] = nrm.y;
      normals[idx * 3 + 2] = nrm.z;

      uvs[idx * 2] = uValue;
      uvs[idx * 2 + 1] = k / (K - 1);
    }
  };

  for (let row = 0; row < bodyRows; row += 1) {
    const frame = frames[row]!;
    const thetaFrac = spec.closed
      ? row / bodyRows
      : (frame.theta - f0.theta) / fullTurnTheta;
    writeRing(row, frame, (thetaFrac * spec.uPerTurn) % 64);
  }

  if (spec.closed) {
    // Seam row duplicates ring 0's space with u at the far end.
    const row = bodyRows;
    for (let k = 0; k < K; k += 1) {
      const src = k;
      const idx = row * K + k;
      positions[idx * 3] = positions[src * 3]!;
      positions[idx * 3 + 1] = positions[src * 3 + 1]!;
      positions[idx * 3 + 2] = positions[src * 3 + 2]!;
      normals[idx * 3] = normals[src * 3]!;
      normals[idx * 3 + 1] = normals[src * 3 + 1]!;
      normals[idx * 3 + 2] = normals[src * 3 + 2]!;
      uvs[idx * 2] = spec.uPerTurn % 64;
      uvs[idx * 2 + 1] = k / (K - 1);
    }
  }

  // Side quads. Profile is CCW seen from +tangent; verified winding:
  // (a, b, d) and (a, d, c) face outward. Both closed and open sweeps
  // connect row j → j+1 for j in 0..rows-2 (closed's last step lands
  // on the seam row).
  for (let row = 0; row < rows - 1; row += 1) {
    const r0 = row * K;
    const r1 = (row + 1) * K;
    for (let k = 0; k < K; k += 1) {
      const k1 = (k + 1) % K;
      const a = r0 + k;
      const b = r0 + k1;
      const c = r1 + k;
      const d = r1 + k1;
      indices.push(a, b, d, a, d, c);
    }
  }

  let cursor = vertRows * K;

  if (spec.caps && !spec.closed) {
    const first = frames[0]!;
    const last = frames[rows - 1]!;

    // Start cap — faces −tangent. Fan: center + first-frame ring.
    const startCenter = cursor;
    v.copy(first.position).sub(basePosition).applyMatrix4(invBasis);
    positions[startCenter * 3] = v.x;
    positions[startCenter * 3 + 1] = v.y;
    positions[startCenter * 3 + 2] = v.z;
    nrm.copy(first.tangent).multiplyScalar(-1).applyMatrix4(invBasis);
    normals[startCenter * 3] = nrm.x;
    normals[startCenter * 3 + 1] = nrm.y;
    normals[startCenter * 3 + 2] = nrm.z;
    uvs[startCenter * 2] = 0.5;
    uvs[startCenter * 2 + 1] = 0.5;
    cursor += 1;

    const startRing = cursor;
    for (let k = 0; k <= K; k += 1) {
      const pk = profile[k % K]!;
      const idx = startRing + k;
      v.copy(first.position)
        .addScaledVector(first.normal, pk.u)
        .addScaledVector(first.binormal, pk.v)
        .sub(basePosition)
        .applyMatrix4(invBasis);
      positions[idx * 3] = v.x;
      positions[idx * 3 + 1] = v.y;
      positions[idx * 3 + 2] = v.z;
      nrm.copy(first.tangent).multiplyScalar(-1).applyMatrix4(invBasis);
      normals[idx * 3] = nrm.x;
      normals[idx * 3 + 1] = nrm.y;
      normals[idx * 3 + 2] = nrm.z;
      uvs[idx * 2] = pk.nu * 0.5 + 0.5;
      uvs[idx * 2 + 1] = pk.nv * 0.5 + 0.5;
    }
    cursor += K + 1;

    for (let k = 0; k < K; k += 1) {
      // CW seen from +tangent → visible from −tangent.
      indices.push(startCenter, startRing + k + 1, startRing + k);
    }

    // End cap — faces +tangent.
    const endCenter = cursor;
    v.copy(last.position).sub(basePosition).applyMatrix4(invBasis);
    positions[endCenter * 3] = v.x;
    positions[endCenter * 3 + 1] = v.y;
    positions[endCenter * 3 + 2] = v.z;
    nrm.copy(last.tangent).applyMatrix4(invBasis);
    normals[endCenter * 3] = nrm.x;
    normals[endCenter * 3 + 1] = nrm.y;
    normals[endCenter * 3 + 2] = nrm.z;
    uvs[endCenter * 2] = 0.5;
    uvs[endCenter * 2 + 1] = 0.5;
    cursor += 1;

    const endRing = cursor;
    for (let k = 0; k <= K; k += 1) {
      const pk = profile[k % K]!;
      const idx = endRing + k;
      v.copy(last.position)
        .addScaledVector(last.normal, pk.u)
        .addScaledVector(last.binormal, pk.v)
        .sub(basePosition)
        .applyMatrix4(invBasis);
      positions[idx * 3] = v.x;
      positions[idx * 3 + 1] = v.y;
      positions[idx * 3 + 2] = v.z;
      nrm.copy(last.tangent).applyMatrix4(invBasis);
      normals[idx * 3] = nrm.x;
      normals[idx * 3 + 1] = nrm.y;
      normals[idx * 3 + 2] = nrm.z;
      uvs[idx * 2] = pk.nu * 0.5 + 0.5;
      uvs[idx * 2 + 1] = pk.nv * 0.5 + 0.5;
    }

    for (let k = 0; k < K; k += 1) {
      indices.push(endCenter, endRing + k, endRing + k + 1);
    }
  }

  const geometry = new three.BufferGeometry();
  geometry.setAttribute('position', new three.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new three.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new three.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return { geometry, basePosition, baseQuaternion };
}
