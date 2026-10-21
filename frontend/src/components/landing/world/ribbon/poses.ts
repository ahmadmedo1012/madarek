/**
 * ribbon/poses — the authored chapter ledger of the artwork.
 *
 * Nine poses, one per landing chapter (hero → statement → chapters →
 * live → roles → colleges → vision → cta → footer), matching the r303
 * world's `data-cam` anchors 1:1. Adjacent poses blend with a
 * smootherstep on the chapter's local progress, then the factory damps
 * toward the blended pose — scroll stays cinematic even when the
 * conductor snaps.
 *
 * Channels:
 *   turn      holder yaw across the journey (footer lands on 2π — seamless)
 *   tilt      holder pitch
 *   roll      barrel roll about the viewing axis — the big "twist" read;
 *             with the baked half-twist this re-distributes the ribbon's
 *             twist without ever re-baking geometry
 *   fan       lamella stretch along the path (slits open and close)
 *   lift      vertical drift
 *   spread    uniform scale
 *   sashSpin  free sash orbit (radians)
 *   sashTilt  sash orbital-plane tilt (radians, ≤ 0.6 — keeps the sash
 *             clear of the band at every spin angle)
 */

export interface RibbonPose {
  turn: number;
  tilt: number;
  roll: number;
  fan: number;
  lift: number;
  spread: number;
  sashSpin: number;
  sashTilt: number;
}

export const RIBBON_POSES: RibbonPose[] = [
  { turn: 0.0, tilt: 0.16, roll: 0.0, fan: 1.0, lift: 0.0, spread: 1.0, sashSpin: 0.0, sashTilt: 0.3 },
  { turn: 0.55, tilt: 0.2, roll: 0.18, fan: 1.06, lift: 0.04, spread: 1.02, sashSpin: 0.9, sashTilt: 0.26 },
  { turn: 1.4, tilt: 0.28, roll: 0.42, fan: 0.93, lift: -0.04, spread: 0.98, sashSpin: 2.0, sashTilt: 0.38 },
  { turn: 2.3, tilt: 0.36, roll: 0.75, fan: 1.08, lift: 0.05, spread: 1.05, sashSpin: 3.4, sashTilt: 0.22 },
  { turn: 3.1, tilt: 0.52, roll: 0.55, fan: 0.87, lift: -0.05, spread: 0.96, sashSpin: 4.6, sashTilt: 0.46 },
  { turn: 3.9, tilt: 0.3, roll: 0.95, fan: 1.03, lift: 0.02, spread: 1.0, sashSpin: 5.6, sashTilt: 0.32 },
  { turn: 4.8, tilt: 0.6, roll: 1.35, fan: 1.12, lift: 0.08, spread: 1.06, sashSpin: 7.2, sashTilt: 0.18 },
  { turn: 5.6, tilt: 0.42, roll: 1.05, fan: 0.94, lift: 0.01, spread: 1.0, sashSpin: 8.4, sashTilt: 0.38 },
  { turn: Math.PI * 2, tilt: 0.2, roll: Math.PI * 0.4, fan: 1.0, lift: 0.0, spread: 0.98, sashSpin: Math.PI * 3, sashTilt: 0.3 },
];

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Blend the pose ledger at (chapterIndex + localProgress).
 * `out` is mutated and returned.
 */
export function samplePose(
  out: RibbonPose,
  chapterIndex: number,
  localProgress: number,
): RibbonPose {
  const last = RIBBON_POSES.length - 1;
  const i = Math.min(Math.max(Math.floor(chapterIndex), 0), last);
  const j = Math.min(i + 1, last);
  const t = smootherstep(clamp01(localProgress));
  const a = RIBBON_POSES[i]!;
  const b = RIBBON_POSES[j]!;

  out.turn = a.turn + (b.turn - a.turn) * t;
  out.tilt = a.tilt + (b.tilt - a.tilt) * t;
  out.roll = a.roll + (b.roll - a.roll) * t;
  out.fan = a.fan + (b.fan - a.fan) * t;
  out.lift = a.lift + (b.lift - a.lift) * t;
  out.spread = a.spread + (b.spread - a.spread) * t;
  out.sashSpin = a.sashSpin + (b.sashSpin - a.sashSpin) * t;
  out.sashTilt = a.sashTilt + (b.sashTilt - a.sashTilt) * t;
  return out;
}

/** Frame-rate-independent damping factor for a given rate and dt. */
export function dampFactor(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * Math.max(dt, 0.0001));
}
