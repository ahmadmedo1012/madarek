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
 *  · per-chapter mobile overrides replace the global 1.18× crop fudge — the
 *    vision passage keeps its tunnel intimacy on phones instead of being
 *    pushed out of it.
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
    mobile: { posMul: 1.15, fovAdd: 9 },
  },
  {
    id: 'statement',
    // Close-up approach from above-right; the sculpt drifts to the
    // reading-end third while the statement paragraph owns its column.
    camera: { position: [3.6, 1.15, 6.4], target: [-0.7, 0.05, 0], fov: 38 },
    world: { spread: 1.04, spin: 0.3, emissive: 0.4, dust: 0.55, fogD: 0.026, key: 1.5, keyAz: -0.2, keyEl: 5.0, roll: 0.008 },
    mobile: { posMul: 1.18, fovAdd: 8 },
  },
  {
    id: 'chapters',
    // Lateral travel — the camera has crossed to the far side; the
    // chapter spreads own the opposite column, knot on the horizon edge.
    camera: { position: [-3.3, 1.7, 6.7], target: [0.6, 0.05, 0], fov: 36 },
    world: { spread: 1.1, spin: 0.34, emissive: 0.5, dust: 0.5, fogD: 0.026, key: 1.5, keyAz: -0.9, keyEl: 4.6, roll: -0.01 },
    mobile: { posMul: 1.2, fovAdd: 8 },
  },
  {
    id: 'live',
    // The close-up: intimate dolly onto the copper signal fins —
    // «documented capabilities» — the emissive speaks for the first time.
    camera: { position: [-0.85, 0.55, 2.9], target: [0.3, 0.22, 0], fov: 42 },
    world: { spread: 1.16, spin: 0.42, emissive: 0.95, dust: 0.42, fogD: 0.024, key: 1.7, keyAz: 0.4, keyEl: 3.4, roll: 0.018 },
    mobile: { posMul: 1.12, fovAdd: 10 },
  },
  {
    id: 'roles',
    // The release: wide pullback + crane up; the five-role panorama
    // flattens (narrow FOV) with the knot as a distant landmark.
    camera: { position: [0.4, 2.7, 10.8], target: [0, 0.25, 0], fov: 34 },
    world: { spread: 1.1, spin: 0.26, emissive: 0.45, dust: 0.6, fogD: 0.03, key: 1.35, keyAz: -0.55, keyEl: 5.4, roll: 0 },
    mobile: { posMul: 1.22, fovAdd: 6 },
  },
  {
    id: 'colleges',
    // Descent + lateral orbit back to the right side; the sculpt settles
    // behind the panel column, constellation nodes take the foreground.
    camera: { position: [4.0, 0.7, 6.0], target: [-0.5, 0.05, 0], fov: 38 },
    world: { spread: 1.06, spin: 0.3, emissive: 0.5, dust: 0.5, fogD: 0.026, key: 1.5, keyAz: 0.15, keyEl: 4.2, roll: 0.008 },
    mobile: { posMul: 1.2, fovAdd: 8 },
  },
  {
    id: 'vision',
    // THE PASSAGE — the camera enters the knot; fins spread open around
    // the lens; the OPTIKKA immersion moment. Roll and wide FOV carry it.
    camera: { position: [0, 0.15, 1.5], target: [0, 0, -2.2], fov: 54 },
    world: { spread: 1.62, spin: 0.5, emissive: 0.8, dust: 0.3, fogD: 0.02, key: 1.2, keyAz: -0.3, keyEl: 3.0, roll: 0.055 },
    mobile: { posMul: 1.05, fovAdd: 12 },
  },
  {
    id: 'cta',
    // The resolve: emerge onto a confident diagonal; the copper signal
    // peaks — the world's full stop behind the conversion band.
    camera: { position: [2.7, 1.9, 5.4], target: [0.7, 0.1, 0], fov: 38 },
    world: { spread: 1.12, spin: 0.24, emissive: 1.5, dust: 0.55, fogD: 0.026, key: 1.6, keyAz: 0.35, keyEl: 5.2, roll: -0.012 },
    mobile: { posMul: 1.16, fovAdd: 9 },
  },
  {
    id: 'footer',
    // The departure: high wide recede, the sculpt small on the horizon;
    // dust rises, the colophon closes the poster.
    camera: { position: [0, 3.5, 13.0], target: [0, 0.45, 0], fov: 32 },
    world: { spread: 1, spin: 0.18, emissive: 0.55, dust: 0.65, fogD: 0.034, key: 1.3, keyAz: -0.7, keyEl: 6.0, roll: 0 },
    mobile: { posMul: 1.22, fovAdd: 6 },
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
  'power2.in',    // colleges → vision    — the passage: accelerate INTO the knot
  'power2.out',   // vision → cta         — the resolve: emerge and settle
  'sine.inOut',   // cta → footer         — the departure: slow recede
] as const;

/** Narrative label per segment — documentation-as-data for reviewers. */
export const SEGMENT_INTENTS: readonly string[] = [
  'close-up tilt-in',
  'lateral travel',
  'dolly to the signal',
  'the release',
  'descent orbit',
  'the passage',
  'the resolve',
  'the departure',
] as const;
