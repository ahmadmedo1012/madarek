/**
 * landing-story/types.ts — the R304 scroll-runtime contract.
 *
 * One story, one truth: every consumer (camera rig, DOM choreography, the
 * Agent-1 artwork module, Agent-3 semantic content) reads the same
 * `StoryFrame` published by `lib/scroll-conductor.ts`.
 */

/** The nine authored chapters — the DOM's own `data-cam` anchors. */
export type StoryChapterId =
  | 'hero'
  | 'statement'
  | 'chapters'
  | 'live'
  | 'roles'
  | 'colleges'
  | 'vision'
  | 'cta'
  | 'footer';

export const STORY_CHAPTERS: readonly StoryChapterId[] = [
  'hero', 'statement', 'chapters', 'live', 'roles', 'colleges', 'vision', 'cta', 'footer',
] as const;

/** Per-frame world channels — continuous physical change, no asset swaps. */
export interface WorldChannels {
  /** Fin-depth spread of the knowledge sculpt (1 = at rest). */
  spread: number;
  /** Idle rotation rate (rad/s-equivalent, applied only while rendering). */
  spin: number;
  /** Copper emissive intensity — the signal's voice. */
  emissive: number;
  /** Dust-mote opacity. */
  dust: number;
  /** FogExp2 density. */
  fogD: number;
  /** Key light intensity. */
  key: number;
  /** Key light azimuth (rad) — the studio sun drifts across the journey. */
  keyAz: number;
  /** Key light elevation (y). */
  keyEl: number;
  /** Camera roll (rad) — restrained, ≤ ~3° except the vision passage. */
  roll: number;
}

/** Authored camera endpoint for one chapter (desktop composition). */
export interface CameraPose {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
}

/** Responsive override — authored per chapter, not a global crop fudge. */
export interface MobilePoseOverride {
  /** Position multiplier (pull-back on small viewports). Default 1.18. */
  posMul?: number;
  /** FOV addition (open the lens). Default 8. */
  fovAdd?: number;
  /** Optional distinct look-at target for mobile composition. */
  target?: readonly [number, number, number];
}

export interface ChapterLedgerEntry {
  id: StoryChapterId;
  camera: CameraPose;
  world: WorldChannels;
  mobile: MobilePoseOverride;
}

/**
 * The single story state. `chapter*` fields derive from EXACT progress
 * (navigation/accessibility truth); `smooth` is the cinematic render state.
 */
export interface StoryFrame {
  /** Exact fractional chapter progress, 0..N-1 (reproducible from scrollY). */
  exact: number;
  /** Damped fractional chapter progress (render state; ≡ exact under RM). */
  smooth: number;
  /** 0..1 across the whole journey (exact). */
  storyProgress: number;
  /** Current chapter id (from exact). */
  chapter: StoryChapterId;
  /** Current chapter index (from exact). */
  chapterIndex: number;
  /** Progress within the current chapter, 0..1 (exact). */
  chapterProgress: number;
  /** Last scroll direction: 1 down, -1 up, 0 idle. */
  direction: 1 | -1 | 0;
  reducedMotion: boolean;
  /** Current poster theme (from `data-theme`), for theme-reactive consumers. */
  theme: 'light' | 'dark';
}

/** Detail payload of the typed `madarek:story-progress` CustomEvent. */
export type StoryProgressDetail = StoryFrame;

declare global {
  interface WindowEventMap {
    'madarek:story-progress': CustomEvent<StoryProgressDetail>;
  }
}

/* ── R304 artwork bridge contract (final, typed) ───────────────────────
 * The bridge (ribbon-bridge.ts) adapts the runtime's call shape onto the
 * artwork factory `createKnowledgeRibbon(THREE, { renderer, quality,
 * mobile })` and wraps its `{ group, update, dispose }` handle in the
 * runtime's `{ object, update(frame, channels), applyTheme, dispose }`
 * contract below. The renderer is forwarded so the artwork's private
 * PMREM studio environment lights the metals. */
export interface KnowledgeRibbonOptions {
  scene: unknown; // THREE.Scene — typed loosely to avoid importing three here
  host: HTMLElement;
  isMobile: boolean;
  reducedMotion: boolean;
  quality: 'high' | 'standard';
  channels: WorldChannels;
  /** The live WebGLRenderer — drives the artwork's PMREM environment. */
  renderer?: unknown;
}

export interface KnowledgeRibbonHandle {
  object?: unknown; // THREE.Object3D
  update?: (frame: StoryFrame, channels: WorldChannels) => void;
  applyTheme?: (tokens: { paper: string; ink: string; signal: string }) => void;
  dispose?: () => void;
}

export type KnowledgeRibbonFactory = (
  THREE: unknown,
  options: KnowledgeRibbonOptions,
) => unknown; // Object3D | KnowledgeRibbonHandle

/** Resolved subject behind the camera — fallback knot or Agent-1 ribbon. */
export interface WorldSubject {
  object: unknown; // THREE.Object3D
  update?: (frame: StoryFrame, channels: WorldChannels) => void;
  applyTheme?: (tokens: { paper: string; ink: string; signal: string }) => void;
  dispose?: () => void;
}
