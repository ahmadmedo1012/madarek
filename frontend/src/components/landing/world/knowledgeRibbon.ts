import type * as THREE_NS from 'three';
import {
  DEFAULT_PATH,
  buildFrameTable,
  rmfOverPolyline,
  sampleFrames,
  type FrameTable,
} from './ribbon/path';
import { buildProfile, sweepGeometry, type ProfileSpec } from './ribbon/sweep';
import { createRibbonMaterials, type RibbonMaterials } from './ribbon/materials';
import { dampFactor, samplePose, type RibbonPose } from './ribbon/poses';

/**
 * ════════════════════════════════════════════════════════════════════
 *  createKnowledgeRibbon — the R304 artwork factory (AGENT 1 deliverable)
 * ════════════════════════════════════════════════════════════════════
 *
 * «MERIDIAN — the knowledge loop». An authored, articulated ribbon
 * sculpture replacing the r303 instanced-torus knot:
 *
 *   · ONE organic Meridian loop (3-lobe + 2-lobe radial wobble, 2-lobe
 *     + 3-lobe out-of-plane wave — never a plain ring), carrying a baked
 *     Möbius half-twist on a rotation-minimizing frame field.
 *   · EIGHT chamfered lamellae ride the loop with thin slits of negative
 *     space between them; lamella 0 is the graphite keystone, the rest
 *     ember-orange ceramic.
 *   · A dark steel core filament threads the loop, exposed only in the
 *     slits — the lamellae read as threaded on a cable.
 *   · A free brushed-steel sash sweeps a tilted 207° arc around the loop,
 *     tapered to points, orbiting with the journey.
 *
 * Geometry is 100% authored BufferGeometry (swept profiles with exact
 * analytic normals, chamfered edge arcs, capped ends) — no primitives,
 * no GLB, no torus. Total ≈ 10k vertices at the high tier.
 *
 * ── INTEGRATION CONTRACT (Agent 2) ──────────────────────────────────
 *
 * ```ts
 * import { createKnowledgeRibbon } from './world/knowledgeRibbon';
 *
 * const ribbon = createKnowledgeRibbon(THREE, { renderer, quality: 'high' });
 * scene.add(ribbon.group);
 *
 * // Once per rendered frame, fed from the scroll conductor:
 * ribbon.update({
 *   progress: state.smooth,        // fractional chapter progress
 *   chapterIndex: state.smoothIndex,
 *   localProgress: state.localSmooth,
 *   direction: state.direction,
 *   theme: document.documentElement.getAttribute('data-theme') ?? 'light',
 *   mobile: isMobile,
 * });
 *
 * // Teardown with the rest of the world:
 * ribbon.dispose();
 * ```
 *
 * The factory never touches the camera, `scene.environment`, scene
 * lights, fog, or any DOM: everything it owns lives under `ribbon.group`
 * and is released by `dispose()`. Materials are pre-tuned for the r303
 * world renderer (sRGB output, no tone mapping, key/fill/rim +
 * ambient/hemisphere lights); the private PMREM studio environment is
 * assigned per-material, so metals never render black regardless of
 * scene-level environment state.
 */

/** Per-frame state, fed by the world controller from the conductor. */
export interface RibbonUpdateState {
  /** Fractional chapter progress (conductor `smooth`); 0..1 is also accepted. */
  progress: number;
  /** Current chapter index (0-based, matches the `data-cam` ledger). */
  chapterIndex: number;
  /** Damped progress within the current chapter segment (0..1). */
  localProgress: number;
  /** Last scroll direction: 1 down, −1 up, 0 idle. */
  direction: number;
  /** `'light' | 'dark'` (any other value falls back to light). */
  theme?: string;
  /** Mobile tier — gentler motion amplitudes. */
  mobile?: boolean;
}

export interface KnowledgeRibbonOptions {
  /**
   * The world's WebGLRenderer. Strongly recommended: enables the private
   * PMREM studio environment that drives the metal response. Without it
   * the artwork falls back to a dielectric-biased material setup.
   */
  renderer?: THREE_NS.WebGLRenderer;
  /** Build tier. Defaults to `'medium'` on mobile/`pointer:coarse`, else `'high'`. */
  quality?: 'high' | 'medium' | 'low';
  /** Uniform base scale of the sculpture (default 1.28). */
  scale?: number;
  /** Force the mobile motion tier even on desktop builds. */
  mobile?: boolean;
}

export interface KnowledgeRibbon {
  /** Root group — add it to the scene; transform it freely. */
  group: THREE_NS.Group;
  /** Feed once per rendered frame (see {@link RibbonUpdateState}). */
  update: (state: RibbonUpdateState) => void;
  /** Releases every geometry, material and texture owned by the artwork. */
  dispose: () => void;
}

/* ── Authored constants ─────────────────────────────────────────────── */

const TAU = Math.PI * 2;

/** Eight lamellae → 45° pitch, 0.115 rad slits (~85% band coverage). */
const LAMELLAE = 8;
const PITCH = TAU / LAMELLAE;
const GAP = 0.115;
const SPAN = PITCH - GAP;

/** The baked Möbius half-twist of the band. */
const HALF_TWIST = Math.PI;
const twistAt = (theta: number) => (HALF_TWIST * theta) / TAU;

interface QualityTier {
  table: number;
  lamellaSteps: number;
  lamellaArc: number;
  coreSteps: number;
  sashSteps: number;
  sashArc: number;
}

const TIERS: Record<'high' | 'medium' | 'low', QualityTier> = {
  high: { table: 1024, lamellaSteps: 46, lamellaArc: 2, coreSteps: 420, sashSteps: 150, sashArc: 2 },
  medium: { table: 768, lamellaSteps: 34, lamellaArc: 2, coreSteps: 300, sashSteps: 110, sashArc: 2 },
  low: { table: 512, lamellaSteps: 24, lamellaArc: 1, coreSteps: 220, sashSteps: 84, sashArc: 1 },
};

/** Deterministic 0..1 hash — per-lamella phase offsets stay stable. */
const hash01 = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Lamella i is centered at θ = π/2 + i·pitch — keystone faces the hero camera. */
const thetaCenterOf = (i: number) => Math.PI / 2 + i * PITCH;

/** Authored span rhythm: plates breathe slightly unequal lengths (±4%). */
const spanScaleOf = (i: number) => 1 + 0.04 * Math.sin(i * 2.4 + 1.3);

/** Global width rhythm along the loop (3-lobe dominant, 2-lobe counterpoint). */
const widthRhythm = (theta: number) =>
  1 + 0.14 * Math.sin(3 * theta + 2.1) + 0.05 * Math.sin(2 * theta + 1.3);

/** Gentler thickness rhythm (2-lobe, quarter-phase offset from the width). */
const thicknessRhythm = (theta: number) => 1 + 0.15 * Math.cos(2 * theta + 0.2);

/* ── Factory ────────────────────────────────────────────────────────── */

export function createKnowledgeRibbon(
  THREE: typeof THREE_NS,
  options: KnowledgeRibbonOptions = {},
): KnowledgeRibbon {
  const coarse =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const mobile =
    options.mobile ?? (coarse || (typeof window !== 'undefined' && window.innerWidth < 768));
  const tierKey = options.quality ?? (mobile ? 'medium' : 'high');
  const tier = TIERS[tierKey];
  const baseScale = options.scale ?? 1.42;

  const group = new THREE.Group();
  group.name = 'knowledge-ribbon';

  /** Everything GPU-owned, released by dispose(). */
  const owned: { dispose: () => void }[] = [];
  const trackGeometry = (g: THREE_NS.BufferGeometry) => {
    owned.push({ dispose: () => g.dispose() });
    return g;
  };

  /* ── Shared frame field ───────────────────────────────────────────── */
  const table: FrameTable = buildFrameTable(THREE, DEFAULT_PATH, tier.table);

  /* ── Materials ────────────────────────────────────────────────────── */
  const materials: RibbonMaterials = createRibbonMaterials(THREE, {
    renderer: options.renderer,
  });
  owned.push({ dispose: () => materials.dispose() });

  /* ── Lamellae ─────────────────────────────────────────────────────── */
  const bandProfile: ProfileSpec = {
    width: 0.36,
    thickness: 0.082,
    chamfer: 0.022,
    cornerArcSteps: tier.lamellaArc,
    crown: 0.28,
  };

  interface LamellaRig {
    mesh: THREE_NS.Mesh;
    basePosition: THREE_NS.Vector3;
    baseQuaternion: THREE_NS.Quaternion;
    phase: number;
  }
  const lamellae: LamellaRig[] = [];

  for (let i = 0; i < LAMELLAE; i += 1) {
    const center = thetaCenterOf(i);
    const keystone = i === 0;
    // The keystone is the clasp: shorter, not wider — a resting anchor
    // in the rhythm rather than a dominating slab.
    const spanI = SPAN * spanScaleOf(i) * (keystone ? 0.78 : 1);
    const frames = sampleFrames(
      THREE,
      table,
      center - spanI / 2,
      center + spanI / 2,
      tier.lamellaSteps,
      twistAt,
    );
    const { geometry, basePosition, baseQuaternion } = sweepGeometry(THREE, {
      frames,
      profile: buildProfile({
        ...bandProfile,
        width: bandProfile.width * (keystone ? 1.04 : 1),
      }),
      closed: false,
      caps: true,
      uPerTurn: 3,
      widthScale: (_s01, theta) =>
        widthRhythm(theta) * (keystone ? 1.04 : 1),
      thicknessScale: (_s01, theta) => thicknessRhythm(theta),
    });
    trackGeometry(geometry);

    const mesh = new THREE.Mesh(
      geometry,
      keystone ? materials.graphite : materials.ember,
    );
    mesh.name = keystone ? 'ribbon-keystone' : `ribbon-lamella-${i}`;
    mesh.position.copy(basePosition);
    mesh.quaternion.copy(baseQuaternion);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = true;
    group.add(mesh);
    lamellae.push({
      mesh,
      basePosition,
      baseQuaternion,
      phase: i * 2.399 + hash01(i + 1) * 0.9,
    });
  }

  /* ── Core filament — threaded through the band, exposed in the slits ── */
  {
    const frames = sampleFrames(THREE, table, 0, TAU, tier.coreSteps, () => 0);
    const { geometry, basePosition, baseQuaternion } = sweepGeometry(THREE, {
      frames,
      profile: buildProfile({
        width: 0.042,
        thickness: 0.042,
        chamfer: 0.012,
        cornerArcSteps: 1,
      }),
      closed: true,
      caps: false,
      uPerTurn: 8,
    });
    trackGeometry(geometry);
    const mesh = new THREE.Mesh(geometry, materials.core);
    mesh.name = 'ribbon-core';
    mesh.frustumCulled = false;
    // Static after placement: bake the frame-0 transform into the matrix.
    mesh.position.copy(basePosition);
    mesh.quaternion.copy(baseQuaternion);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }

  /* ── Free sash — brushed steel arc orbiting the loop ───────────── */
  const sashPivot = new THREE.Group();
  sashPivot.name = 'ribbon-sash-pivot';
  group.add(sashPivot);
  void (() => {
    const steps = tier.sashSteps;
    const ARC = 3.62; // ≈207°
    const PHI0 = -0.35;
    const A = 1.66;
    const B = 1.55;

    const points: THREE_NS.Vector3[] = [];
    const tangents: THREE_NS.Vector3[] = [];
    const t = new THREE.Vector3();
    for (let j = 0; j <= steps; j += 1) {
      const s01 = j / steps;
      const phi = PHI0 + ARC * s01;
      const p = new THREE.Vector3(
        A * Math.cos(phi),
        0.05 * Math.sin(2 * phi + 0.3),
        B * Math.sin(phi),
      );
      t.set(
        -A * Math.sin(phi),
        0.1 * Math.cos(2 * phi + 0.3),
        B * Math.cos(phi),
      ).normalize();
      points.push(p);
      tangents.push(t.clone());
    }
    const normals = rmfOverPolyline(THREE, points, tangents);
    const frames = points.map((p, j) => ({
      position: p,
      tangent: tangents[j]!,
      normal: normals[j]!,
      binormal: new THREE.Vector3().copy(tangents[j]!).cross(normals[j]!).normalize(),
      theta: PHI0 + ARC * (j / steps),
    }));

    const { geometry, basePosition, baseQuaternion } = sweepGeometry(THREE, {
      frames,
      profile: buildProfile({
        width: 0.085,
        thickness: 0.024,
        chamfer: 0.007,
        cornerArcSteps: tier.sashArc,
        crown: 0.2,
      }),
      closed: false,
      caps: true,
      uPerTurn: 6,
      widthScale: (s01) => 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * s01), 0.7),
    });
    trackGeometry(geometry);

    const mesh = new THREE.Mesh(geometry, materials.sash);
    mesh.name = 'ribbon-sash';
    mesh.position.copy(basePosition);
    mesh.quaternion.copy(baseQuaternion); // baked — the pivot carries motion
    mesh.frustumCulled = false;
    sashPivot.add(mesh);
    return mesh;
  })();

  /* ── Runtime state ────────────────────────────────────────────────── */
  const holder = group; // the root group IS the pose target

  const current: RibbonPose = {
    turn: 0, tilt: 0.14, roll: 0, fan: 1, lift: 0, spread: 1, sashSpin: 0, sashTilt: 0.42,
  };
  const poseTarget: RibbonPose = { ...current };

  let lastTime = -1;
  let time = 0;
  let drift = 0;
  let scaleSmooth = 1;
  let lastTheme: string | undefined;
  const qFlex = new THREE.Quaternion();
  const axisX = new THREE.Vector3(1, 0, 0);

  /**
   * Per-frame update. Defensive defaults everywhere: a partially
   * populated state object still produces a sane pose.
   */
  const update = (state: RibbonUpdateState) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = lastTime < 0 ? 1 / 60 : Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;
    time += dt;

    const motion = state.mobile ? 0.6 : 1;

    /* Theme — damp materials toward the palette target. */
    if (state.theme !== lastTheme) {
      lastTheme = state.theme;
      materials.setTheme(state.theme);
    }
    materials.update(dt);

    /* Pose target from the chapter ledger. */
    const index = Number.isFinite(state.chapterIndex)
      ? state.chapterIndex
      : Math.floor(Number(state.progress) || 0);
    const local = Number.isFinite(state.localProgress) ? state.localProgress : 0;
    samplePose(poseTarget, index, local);

    /* Damp toward the blended pose (cinematic chase over the conductor). */
    const k = dampFactor(4.5, dt);
    current.turn += (poseTarget.turn - current.turn) * k;
    current.tilt += (poseTarget.tilt - current.tilt) * k;
    current.roll += (poseTarget.roll - current.roll) * k;
    current.fan += (poseTarget.fan - current.fan) * k;
    current.lift += (poseTarget.lift - current.lift) * k;
    current.spread += (poseTarget.spread - current.spread) * k;
    current.sashSpin += (poseTarget.sashSpin - current.sashSpin) * k;
    current.sashTilt += (poseTarget.sashTilt - current.sashTilt) * k;

    /* Continuous drift from raw progress + direction-biased glide. */
    const progress = Number(state.progress) || 0;
    const driftTarget = progress * 0.1 * (state.direction === -1 ? 0.85 : 1);
    drift += (driftTarget - drift) * dampFactor(2.5, dt);

    /* Holder pose: turn + drift, tilt with a slow breathing pitch, roll. */
    holder.rotation.y = current.turn + drift;
    holder.rotation.x = current.tilt + Math.sin(time * 0.4) * 0.02 * motion;
    holder.rotation.z = current.roll;
    holder.position.y = current.lift + Math.sin(time * 0.55) * 0.018 * motion;
    /* Narrow (portrait) viewports crop a horizontally-wide sculpture —
     * the mobile channel shrinks the composition to keep the loop whole. */
    const scaleTarget = baseScale * current.spread * (state.mobile ? 0.78 : 1);
    scaleSmooth += (scaleTarget - scaleSmooth) * dampFactor(3, dt);
    holder.scale.setScalar(scaleSmooth);

    /* Lamellae: fan stretch along the tangent + gentle articulated flex. */
    const fanBase = current.fan;
    for (let i = 0; i < lamellae.length; i += 1) {
      const rig = lamellae[i]!;
      const fanI =
        fanBase * (1 + 0.018 * Math.sin(time * 0.8 + rig.phase) * motion);
      const flex =
        0.09 * Math.sin(time * 0.55 + rig.phase * 3.1) * motion;
      qFlex.setFromAxisAngle(axisX, flex);
      rig.mesh.quaternion.copy(rig.baseQuaternion).multiply(qFlex);
      rig.mesh.position.copy(rig.basePosition);
      rig.mesh.scale.set(fanI, 1, 1);
    }

    /* Sash: pose orbit + slow idle spin, tilt clamped to the safe band.
     * The pivot rotates; the mesh keeps its baked path frame. */
    sashPivot.rotation.set(
      Math.min(0.5, Math.max(0.15, current.sashTilt)),
      current.sashSpin + time * 0.05 * motion,
      Math.sin(time * 0.3) * 0.02 * motion,
      'XYZ',
    );
  };

  const dispose = () => {
    for (const entry of owned) entry.dispose();
    owned.length = 0;
    group.clear();
  };

  return { group, update, dispose };
}
