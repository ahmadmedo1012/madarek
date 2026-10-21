/**
 * landing-story/subject-knot.ts — the fallback knowledge sculpt.
 *
 * The r303 instanced fin-knot, extracted verbatim from MadarekWorld so the
 * world keeps a subject before (or without) Agent 1's
 * `createKnowledgeRibbon` module. The ribbon bridge prefers Agent 1's
 * artwork whenever its module is present; this knot is the poster-tier
 * constant — two InstancedMeshes (paper body + copper signal), ~2 draw
 * calls for the whole sculpt.
 *
 * Rotation is NOT owned here: the world applies the story's spin/wobble to
 * `object.rotation` so the choreography stays in one place.
 */
import type * as THREE_NS from 'three';
import type { WorldChannels } from './types';

export interface SubjectKnot {
  object: THREE_NS.Group;
  /** Re-write instance matrices when the spread channel moves. */
  update: (channels: WorldChannels) => void;
  applyTheme: (paper: string, signal: string) => void;
  setEmissive: (intensity: number) => void;
  dispose: () => void;
}

export function createSubjectKnot(
  THREE: typeof import('three'),
  options: { quality: 'high' | 'standard' },
): SubjectKnot {
  const FINS = 220;
  const R = 1.55;
  const DEPTH = 1.9;

  const finGeo = new THREE.TorusGeometry(1, 0.42, 2, 48, Math.PI * 2);
  /* Two material tiers of the quality governor (r303): desktop GPU gets
   * the clearcoat ceramic stack; software GL the standard PBR tier —
   * visually adjacent at these forms, ~3× cheaper to rasterize. */
  const paperMat = options.quality === 'standard'
    ? new THREE.MeshStandardMaterial({ color: 0xefeadf, roughness: 0.46, metalness: 0.02 })
    : new THREE.MeshPhysicalMaterial({
        color: 0xefeadf,
        roughness: 0.42,
        metalness: 0.03,
        clearcoat: 0.55,
        clearcoatRoughness: 0.5,
      });
  const copperMat = options.quality === 'standard'
    ? new THREE.MeshStandardMaterial({
        color: 0xb57438,
        roughness: 0.34,
        metalness: 0.2,
        emissive: new THREE.Color(0xb57438),
        emissiveIntensity: 0.35,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xb57438,
        roughness: 0.32,
        metalness: 0.22,
        clearcoat: 0.7,
        clearcoatRoughness: 0.35,
        emissive: new THREE.Color(0xb57438),
        emissiveIntensity: 0.35,
      });

  const knot = new THREE.Group();
  knot.name = 'knowledge-knot';

  const dummy = new THREE.Object3D();
  const paperIdx: number[] = [];
  const copperIdx: number[] = [];
  const finTransforms: Array<{ pos: THREE_NS.Vector3; rotZ: number; scale: number }> = [];

  for (let i = 0; i < FINS; i++) {
    const t = i / (FINS - 1);
    const p = 2, q = 3;
    const phi = t * Math.PI * 2 * q;
    const theta = t * Math.PI * 2 * p;
    const x = R * Math.cos(phi) * (1 + 0.32 * Math.cos(theta));
    const y = R * Math.sin(phi) * (1 + 0.32 * Math.cos(theta));
    const s = 0.28 + 0.34 * Math.sin(t * Math.PI);
    finTransforms.push({
      pos: new THREE.Vector3(x * 0.62, y * 0.62, (t - 0.5) * DEPTH),
      rotZ: (t * Math.PI * 4) % (Math.PI * 2),
      scale: s,
    });
    (i % 26 === 0 ? copperIdx : paperIdx).push(i);
  }

  const paperMesh = new THREE.InstancedMesh(finGeo, paperMat, paperIdx.length);
  const copperMesh = new THREE.InstancedMesh(finGeo, copperMat, copperIdx.length);
  paperMesh.name = 'fins-paper';
  copperMesh.name = 'fins-copper';

  const writeInstances = (spread: number) => {
    const place = (mesh: THREE_NS.InstancedMesh, indices: number[]) => {
      indices.forEach((i, k) => {
        const tr = finTransforms[i]!;
        dummy.position.set(tr.pos.x, tr.pos.y, tr.pos.z * spread);
        dummy.rotation.set(Math.PI / 2, 0, tr.rotZ);
        dummy.scale.setScalar(tr.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(paperMesh, paperIdx);
    place(copperMesh, copperIdx);
  };
  writeInstances(1);
  knot.scale.setScalar(1.14);
  knot.add(paperMesh, copperMesh);

  let lastSpread = 1;

  return {
    object: knot,
    update(channels) {
      if (Math.abs(channels.spread - lastSpread) > 0.004) {
        writeInstances(channels.spread);
        lastSpread = channels.spread;
      }
    },
    applyTheme(paper, signal) {
      paperMat.color.set(paper);
      copperMat.color.set(signal);
      copperMat.emissive.set(signal);
    },
    setEmissive(intensity) {
      copperMat.emissiveIntensity = intensity;
    },
    dispose() {
      finGeo.dispose();
      paperMat.dispose();
      copperMat.dispose();
    },
  };
}
