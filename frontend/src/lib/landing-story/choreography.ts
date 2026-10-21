/**
 * landing-story/choreography.ts — the authored camera timeline.
 *
 * A real paused `gsap.timeline()` holds the whole journey as `fromTo`
 * segments (one per chapter transition), labeled with the chapter ids and
 * eased with the authored SEGMENT_EASES. `fromTo` (never chained `.to`)
 * makes every pose a pure function of timeline progress — forward, reverse,
 * after a fast jump, after reload: the same progress always reconstructs
 * the same composition.
 *
 * The conductor scrubs this timeline with the DAMPED chapter-space progress
 * (`frame.smooth`, 0..N-1 → timeline 0..1). ScrollTrigger owns the scroll
 * reading; the timeline owns the poses; the conductor's damping warps time
 * cinematically. Nothing else touches the camera.
 *
 * Chapter space (not scroll space) is the timeline's unit: segments are 1s
 * long at positions 0..N-2. Uneven section heights are absorbed by the
 * conductor's anchor mapping — the timeline itself never needs rebuilding
 * on resize.
 */
import { gsap } from 'gsap';
import { CHAPTER_LEDGER, SEGMENT_EASES } from './chapters';
import type { MobilePoseOverride, StoryFrame, WorldChannels } from './types';

/** Flat numeric pose the timeline tweens — one object, all channels. */
interface PoseProxy {
  px: number; py: number; pz: number;
  tx: number; ty: number; tz: number;
  fov: number;
  roll: number;
  spread: number; spin: number; emissive: number; dust: number;
  fogD: number; key: number; keyAz: number; keyEl: number;
}

export interface PoseSnapshot {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  roll: number;
  channels: WorldChannels;
  /** Chapter the scrub is inside or leaving from (from smooth progress). */
  chapter: StoryFrame['chapter'];
  chapterIndex: number;
}

export interface Choreography {
  /** The authored timeline (labels = chapter ids). For inspection/debug. */
  timeline: gsap.core.Timeline;
  /** Scrub to the frame's smooth progress and read the current snapshot. */
  sample: (frame: StoryFrame, isMobile: boolean) => PoseSnapshot;
  destroy: () => void;
}

const LAST = CHAPTER_LEDGER.length - 1;

function flattenPose(entry: (typeof CHAPTER_LEDGER)[number]): PoseProxy {
  return {
    px: entry.camera.position[0],
    py: entry.camera.position[1],
    pz: entry.camera.position[2],
    tx: entry.camera.target[0],
    ty: entry.camera.target[1],
    tz: entry.camera.target[2],
    fov: entry.camera.fov,
    roll: entry.world.roll,
    spread: entry.world.spread,
    spin: entry.world.spin,
    emissive: entry.world.emissive,
    dust: entry.world.dust,
    fogD: entry.world.fogD,
    key: entry.world.key,
    keyAz: entry.world.keyAz,
    keyEl: entry.world.keyEl,
  };
}

export function createChoreography(): Choreography {
  /* The pose is computed as a PURE FUNCTION of smooth progress — segment
   * endpoints from the ledger, blended with the authored per-segment ease.
   *
   * WHY NOT gsap.fromTo on one shared proxy (the previous implementation):
   * eight overlapping fromTo tweens writing ONE mutable proxy made the
   * written value depend on GSAP's seek/immediateRender order — at
   * progress 0 the proxy held the LAST segment's start values (ledger[7]),
   * so the world rendered CTA framing behind the hero and arbitrary
   * poses elsewhere (verified live via a camera probe: smooth=0 →
   * camera at the cta pose). A pure sampler is deterministic in both
   * scrub directions, after jumps and after reload — the exact contract
   * the old docstring promised but the tween graph could not keep.
   *
   * The paused timeline below stays as the reviewable ledger artifact
   * (labels = chapter ids, same from→to data) tweening a DUMMY target,
   * so DevTools inspection keeps working without ever touching the
   * camera pose. */
  const ledgerDummy = { __ledger: 0 };
  const timeline = gsap.timeline({ paused: true });
  CHAPTER_LEDGER.forEach((entry, i) => {
    timeline.addLabel(entry.id, i);
    if (i === LAST) return;
    timeline.fromTo(
      ledgerDummy,
      { __ledger: i },
      { __ledger: i + 1, duration: 1, ease: 'none' },
      i,
    );
  });

  const eases = SEGMENT_EASES.map((e) => gsap.parseEase(e ?? 'sine.inOut'));
  const blendPose = (smooth: number): PoseProxy => {
    const a = CHAPTER_LEDGER[0]!;
    const out = flattenPose(a);
    if (smooth <= 0) return out;
    if (smooth >= LAST) return flattenPose(CHAPTER_LEDGER[LAST]!);
    const i = Math.floor(smooth);
    const t = eases[i]!(smooth - i);
    const from = flattenPose(CHAPTER_LEDGER[i]!);
    const to = flattenPose(CHAPTER_LEDGER[i + 1]!);
    for (const k of Object.keys(out) as (keyof PoseProxy)[]) {
      out[k] = from[k] + (to[k] - from[k]) * t;
    }
    return out;
  };

  const sample = (frame: StoryFrame, isMobile: boolean): PoseSnapshot => {
    const pose = blendPose(frame.smooth);

    // The scrub sits inside segment i..i+1 (or exactly on a boundary).
    const idx = Math.min(Math.floor(frame.smooth), LAST);
    const entry = CHAPTER_LEDGER[idx]!;
    const override: MobilePoseOverride = entry.mobile;

    const posMul = isMobile ? (override.posMul ?? 1.18) : 1;
    const fovAdd = isMobile ? (override.fovAdd ?? 8) : 0;
    const target = isMobile && override.target ? override.target : null;

    return {
      position: { x: pose.px * posMul, y: pose.py * posMul, z: pose.pz * posMul },
      target: target
        ? { x: target[0], y: target[1], z: target[2] }
        : { x: pose.tx, y: pose.ty, z: pose.tz },
      fov: pose.fov + fovAdd,
      roll: pose.roll,
      channels: {
        spread: pose.spread,
        spin: pose.spin,
        emissive: pose.emissive,
        dust: pose.dust,
        fogD: pose.fogD,
        key: pose.key,
        keyAz: pose.keyAz,
        keyEl: pose.keyEl,
        roll: pose.roll,
      },
      chapter: entry.id,
      chapterIndex: idx,
    };
  };

  const destroy = () => {
    timeline.kill();
  };

  return { timeline, sample, destroy };
}
