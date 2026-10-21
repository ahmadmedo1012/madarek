/**
 * landing-story/chapters.ts — the authored chapter ledger (scene ledger,
 * per build-threejs-scroll-worlds §author-a-scene-ledger).
 *
 * Camera endpoints carry forward the r303 compositions that were tuned
 * against this exact DOM (`data-cam` anchors + landing.css column layout).
 * R304 upgrades the LEDGER, not the geography:
 *
 *  · every segment is named with its cinematographic intent — six dolly-ins
 *    aimed at one center are not six scenes (skill §author-the-camera);
 *  · `roll`, `keyAz`/`keyEl` join the world channels — lighting and horizon
 *    respond to the story, not just the knot;
 *  · per-chapter mobile overrides are authored compositions (explicit
 *    targets, pull-backs, lens) — not a global crop fudge.
 *
 * R304 FINAL (ribbon retune): every near-axis camera keeps the screen
 * mapping predictable — target.x>0 lands the sculpt screen-LEFT (clear
 * of the RTL reading column), target.x<0 lands it RIGHT. The sculpture
 * is never framed behind a heading, a capabilities slab, or a CTA.
 *
 * Topology: LAYERED REVEAL — one persistent sculpt; camera, spread, light,
 * fog and atmosphere author the chapters. No teleports: consecutive poses
 * share the interpolation space and every segment tween is continuous.
 */
import type { ChapterLedgerEntry } from './types';

export const CHAPTER_LEDGER: readonly ChapterLedgerEntry[] = [
  {
    id: 'hero',
    // Establishing wide — the knot centered under the editorial grid,
    // generous air around it; the page's first frame must be complete.
    camera: { position: [0, 0.3, 6.6], target: [0, -0.08, 0], fov: 37 },
    world: { spread: 1, spin: 0.22, emissive: 0.35, dust: 0.5, fogD: 0.028, key: 1.5, keyAz: -0.55, keyEl: 5.0, roll: 0 },
    mobile: { posMul: 1.5, fovAdd: 12, target: [0.3, 0.8, 0] },
  },
  {
    id: 'statement',
    // The statement owns its right-hand RTL column; the ribbon recedes
    // into the left third (near-axis camera: target.x>0 lands the sculpt
    // screen-left) — a supporting object at the reading-end gutter.
    camera: { position: [0.6, 1.0, 8.2], target: [2.1, 0.12, 0], fov: 35 },
    world: { spread: 1.04, spin: 0.3, emissive: 0.4, dust: 0.55, fogD: 0.026, key: 1.5, keyAz: -0.2, keyEl: 5.0, roll: 0.008 },
    mobile: { posMul: 1.3, fovAdd: 10, target: [1.1, 0.3, 0] },
  },
  {
    id: 'chapters',
    // Long chapter run with alternating spreads: the sculpt becomes a
    // small, low, far-left horizon landmark — the white demo cards and
    // the copy columns own the stage. Fog lifts it off the text plane.
    camera: { position: [0.3, 1.3, 10.5], target: [2.5, 0.55, 0], fov: 33 },
    world: { spread: 1.06, spin: 0.3, emissive: 0.45, dust: 0.6, fogD: 0.03, key: 1.4, keyAz: -0.7, keyEl: 4.8, roll: -0.006 },
    mobile: { posMul: 1.35, fovAdd: 10, target: [1.8, 0.7, 0] },
  },
  {
    id: 'live',
    // The signal window: the sculpt frames INSIDE the live drawing window
    // (left column) at a respectful distance — never behind the dark
    // capabilities slab, never filling the top band. Copper speaks.
    camera: { position: [0.8, 0.5, 9.5], target: [2.0, 0.2, 0], fov: 40 },
    world: { spread: 1.1, spin: 0.36, emissive: 0.95, dust: 0.45, fogD: 0.024, key: 1.7, keyAz: 0.4, keyEl: 3.4, roll: 0.012 },
    mobile: { posMul: 1.3, fovAdd: 9, target: [1.6, 0.5, 0] },
  },
  {
    id: 'roles',
    // The release: wide pullback + crane up; the five-role panorama owns
    // the full width, the ribbon a distant veiled landmark in the left
    // gutter (narrow FOV, raised fog).
    camera: { position: [0.7, 2.2, 12.8], target: [2.6, 0.5, 0], fov: 30 },
    world: { spread: 1.06, spin: 0.24, emissive: 0.45, dust: 0.62, fogD: 0.032, key: 1.35, keyAz: -0.55, keyEl: 5.4, roll: 0 },
    mobile: { posMul: 1.3, fovAdd: 8, target: [2.0, 0.6, 0] },
  },
  {
    id: 'colleges',
    // Descent to the left third: the sculpt settles behind the giant
    // numeral zone while the heading and college chips own the right.
    camera: { position: [0.5, 0.8, 9.0], target: [2.2, 0.2, 0], fov: 36 },
    world: { spread: 1.06, spin: 0.3, emissive: 0.5, dust: 0.5, fogD: 0.026, key: 1.5, keyAz: 0.15, keyEl: 4.2, roll: 0.008 },
    mobile: { posMul: 1.3, fovAdd: 9, target: [1.7, 0.3, 0] },
  },
  {
    id: 'vision',
    // The wide recede — the ribbon has NO traversable tunnel (a solid
    // Möbius band, not the old fin knot), so the old inside-the-knot
    // camera buried the roadmap in opaque lamellae. Authored instead as
    // the journey's quietest frame: the sculpt far, small and veiled at
    // the left horizon while the future roadmap owns the stage.
    camera: { position: [1.2, 0.9, 11.0], target: [4.4, 0.35, 0], fov: 32 },
    world: { spread: 1.25, spin: 0.4, emissive: 0.8, dust: 0.5, fogD: 0.03, key: 1.25, keyAz: -0.3, keyEl: 3.6, roll: 0.014 },
    mobile: { posMul: 1.25, fovAdd: 10, target: [2.2, 0.5, 0] },
  },
  {
    id: 'cta',
    // The resolve: the conversion band is centered, so the sculpt moves
    // OFF the axis to the right edge — the copper signal peaks as an
    // accent, not a competitor. Fog keeps the buttons pristine.
    camera: { position: [-0.7, 1.5, 9.8], target: [-2.6, 0.3, 0], fov: 34 },
    world: { spread: 1.08, spin: 0.22, emissive: 1.5, dust: 0.55, fogD: 0.028, key: 1.6, keyAz: 0.35, keyEl: 5.2, roll: -0.008 },
    mobile: { posMul: 1.3, fovAdd: 9, target: [-2.0, 0.4, 0] },
  },
  {
    id: 'footer',
    // The departure: high wide recede; the sculpt a small veiled mark in
    // the upper-left horizon above the colophon, dust rising.
    camera: { position: [0.4, 2.8, 14.0], target: [3.4, 1.1, 0], fov: 30 },
    world: { spread: 1, spin: 0.18, emissive: 0.55, dust: 0.65, fogD: 0.036, key: 1.3, keyAz: -0.7, keyEl: 6.0, roll: 0 },
    mobile: { posMul: 1.3, fovAdd: 7, target: [1.5, 1.0, 0] },
  },
] as const;

/**
 * Authored per-segment easing — the pacing of each transition.
 * Index i shapes the travel from chapter i to chapter i+1 while the user
 * scrubs through chapter i's own section span. Scrub keeps the scroll
 * position as the clock; the ease only sculpts camera velocity within it.
 */
export const SEGMENT_EASES: readonly string[] = [
  'power2.inOut', // hero → statement     — the tilt-in: calm, symmetric
  'sine.inOut',   // statement → chapters — the lateral travel: longest glide
  'power2.inOut', // chapters → live      — the close-up: deliberate dive
  'power2.inOut', // live → roles         — the release: biggest move, held shape
  'sine.inOut',   // roles → colleges     — the descent: weightless orbit
  'sine.inOut',   // colleges → vision    — the quiet recede to the horizon
  'power2.out',   // vision → cta         — the resolve: drift to the accent edge
  'sine.inOut',   // cta → footer         — the departure: slow recede
] as const;

/** Narrative label per segment — documentation-as-data for reviewers. */
export const SEGMENT_INTENTS: readonly string[] = [
  'close-up tilt-in',
  'lateral travel',
  'dolly to the signal',
  'the release',
  'descent orbit',
  'the quiet recede',
  'the resolve',
  'the departure',
] as const;
