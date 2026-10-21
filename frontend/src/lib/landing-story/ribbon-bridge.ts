/**
 * landing-story/ribbon-bridge.ts — the R304 artwork integration contract.
 *
 * The artwork module (`components/landing/world/knowledgeRibbon.ts`) and
 * the scroll runtime were authored on separate branches with different
 * expectations. This file is the SINGLE EXPLICIT, TYPED ADAPTER between
 * them — no runtime glob discovery, no defensive guessing:
 *
 *   · DISCOVERY — a direct lazy `import()` of the artwork module path.
 *     The module injects THREE (it never imports three at runtime), so
 *     the dynamic import stays cheap and the world chunk stays lazy.
 *   · OPTIONS — the runtime's `KnowledgeRibbonOptions` (scene/host/
 *     quality/channels) is mapped onto the artwork's factory options:
 *     quality tier `'standard' → 'medium'`, `isMobile → mobile`, and the
 *     live `WebGLRenderer` is forwarded so the artwork's private PMREM
 *     studio environment lights the metals.
 *   · HANDLE — the artwork returns `{ group, update, dispose }`; the
 *     runtime consumes `{ object, update(frame, channels), applyTheme,
 *     dispose }`. The adapter wraps the artwork's per-frame state:
 *     pose time derives from the conductor's damped `smooth` progress so
 *     the sculpture and the camera share one cinematic clock, and the
 *     theme is tracked through `applyTheme`/`data-theme`.
 *   · NO LEGACY PATH — if this import fails there is NO fallback knot:
 *     the world reports `unavailable` and the semantic DOM story stands
 *     alone (the r303 220-ring renderer was retired from the tree).
 */

import type {
  KnowledgeRibbonFactory,
  KnowledgeRibbonHandle,
  KnowledgeRibbonOptions,
  StoryFrame,
} from './types';

import type * as THREE_NS from 'three';
import type {
  KnowledgeRibbon as MeridianHandle,
  RibbonUpdateState,
} from '../../components/landing/world/knowledgeRibbon';

/* The real artwork factory (types only here; loaded lazily at runtime). */
type MeridianFactory = typeof import('../../components/landing/world/knowledgeRibbon').createKnowledgeRibbon;

/** Read the poster theme straight from the document attribute. */
const currentTheme = (): 'light' | 'dark' =>
  typeof document !== 'undefined' &&
  document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';

/** The runtime's pose clock is the damped fractional chapter progress. */
const poseClockOf = (frame: StoryFrame): { index: number; local: number; smooth: number } => {
  const smooth = Number.isFinite(frame.smooth)
    ? frame.smooth
    : Number.isFinite(frame.chapterIndex)
      ? frame.chapterIndex
      : 0;
  const index = Math.floor(smooth);
  return { index, local: smooth - index, smooth };
};

export async function loadKnowledgeRibbon(): Promise<KnowledgeRibbonFactory | null> {
  let createMeridian: MeridianFactory;
  try {
    /* Explicit module path — the artwork is a first-class dependency of
     * the story now, discovered by the import graph, not by glob luck. */
    const mod = await import('../../components/landing/world/knowledgeRibbon');
    createMeridian = mod.createKnowledgeRibbon;
  } catch {
    /* A broken artwork import must never take the poster down. */
    return null;
  }
  if (typeof createMeridian !== 'function') return null;

  /* The adapter: runtime options in, runtime handle out. */
  const factory: KnowledgeRibbonFactory = (
    THREE: unknown,
    options: KnowledgeRibbonOptions,
  ): KnowledgeRibbonHandle => {
    const ribbon = createMeridian(THREE as typeof THREE_NS, {
      renderer: (options.renderer ?? undefined) as THREE_NS.WebGLRenderer | undefined,
      quality: options.quality === 'standard' ? 'medium' : 'high',
      mobile: options.isMobile,
    }) as MeridianHandle;

    let theme: 'light' | 'dark' = currentTheme();

    return {
      object: ribbon.group,
      update: (frame: StoryFrame) => {
        const clock = poseClockOf(frame);
        const state: RibbonUpdateState = {
          progress: clock.smooth,
          chapterIndex: clock.index,
          localProgress: clock.local,
          direction: frame.direction,
          theme,
          mobile: options.isMobile,
        };
        ribbon.update(state);
      },
      applyTheme: () => {
        /* Theme change without a scroll event — record it; the world
         * re-renders its last frame so the flip is visible at once. */
        theme = currentTheme();
      },
      dispose: () => ribbon.dispose(),
    };
  };

  return factory;
}
