/**
 * Illustration scene registry.
 *
 * Per specs/012-design-graphics-uplift/contracts/illustration-system.md.
 *
 * Scene inventory (wave 8-c audit — every V1 scene is consumed):
 *   homepage-hero        → LandingPage hero (eager, first paint)
 *   error-404            → NotFoundPage via ErrorState illustration=
 *   empty-notifs         → NotificationDropdown empty state (the
 *                          notifications panel's inbox)
 *   empty-search         → LibraryPage filtered/book empty states
 *   milestone-section    → MilestoneScene celebration + LandingPage
 *                          pilot-study anchor (decorative reuse)
 *   onboarding-frame-1..3 → OnboardingFlow frames 0–2
 *   onboarding-role-intro → OnboardingFlow frame 3 (5 role motifs)
 *
 * Deviation from the contract (documented, audit 0-f P3-26): scenes
 * are statically imported rather than React.lazy — each is ≤ ~6KB, the
 * registry is one chunk, and every consumer mounts inside an already-
 * code-split surface, so lazy boundaries would add complexity for a
 * negligible payload win.
 *
 * The registry maps a scene name to a React component. Scene components
 * read CSS variables (--ill-hue-1..6, --ill-stroke, --ill-paper,
 * --ill-shadow) so theme + prefers-contrast adaptation happen via the
 * existing token cascade — no per-scene logic.
 */
import type { ComponentType, ReactElement } from 'react';
import type { AppRole } from '../../stores/auth.store';
import { SceneEmptyNotifs } from './scenes/empty-notifs';
import { SceneEmptySearch } from './scenes/empty-search';
import { SceneError404 } from './scenes/error-404';
import { SceneHomepageHero } from './scenes/homepage-hero';
import { SceneMilestoneSection } from './scenes/milestone-section';
import { SceneOnboardingFrame1 } from './scenes/onboarding/frame-1';
import { SceneOnboardingFrame2 } from './scenes/onboarding/frame-2';
import { SceneOnboardingFrame3 } from './scenes/onboarding/frame-3';
import { SceneOnboardingRoleIntro } from './scenes/onboarding/role-intro';

export type IllustrationName =
  | 'homepage-hero'
  | 'error-404'
  | 'empty-notifs'
  | 'empty-search'
  | 'milestone-section'
  | 'onboarding-frame-1'
  | 'onboarding-frame-2'
  | 'onboarding-frame-3'
  | 'onboarding-role-intro';

export const V1_ILLUSTRATION_NAMES: ReadonlyArray<IllustrationName> = [
  'homepage-hero',
  'error-404',
  'empty-notifs',
  'empty-search',
  'milestone-section',
  'onboarding-frame-1',
  'onboarding-frame-2',
  'onboarding-frame-3',
  'onboarding-role-intro',
];

export interface SceneProps {
  /** Layout direction passed by the <Illustration> wrapper. */
  dir?: 'ltr' | 'rtl';
  /**
   * Authenticated role, forwarded by the <Illustration> wrapper.
   * Consumed by role-keyed scenes (`onboarding-role-intro` selects its
   * per-role motif from it); every other scene ignores it.
   */
  role?: AppRole;
}

type SceneComponent = ComponentType<SceneProps>;

export type { SceneComponent };

/**
 * Registry of scene components. Names not yet implemented map to `null`
 * — the <Illustration> wrapper falls back to its empty-state placeholder
 * for those.
 */
export const SCENE_REGISTRY: Record<IllustrationName, SceneComponent | null> = {
  'homepage-hero': SceneHomepageHero as SceneComponent,
  'error-404': SceneError404 as SceneComponent,
  'empty-notifs': SceneEmptyNotifs as SceneComponent,
  'empty-search': SceneEmptySearch as SceneComponent,
  'milestone-section': SceneMilestoneSection as SceneComponent,
  'onboarding-frame-1': SceneOnboardingFrame1 as SceneComponent,
  'onboarding-frame-2': SceneOnboardingFrame2 as SceneComponent,
  'onboarding-frame-3': SceneOnboardingFrame3 as SceneComponent,
  'onboarding-role-intro': SceneOnboardingRoleIntro as SceneComponent,
};

export function loadScene(name: IllustrationName): SceneComponent | null {
  return SCENE_REGISTRY[name] ?? null;
}

/**
 * Marker component used as a within-family fallback when a scene is
 * requested by name but is not yet wired in the registry. Renders a
 * neutral, family-compliant icon-shape backdrop instead of nothing.
 */
export function SceneFallback(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <circle cx="100" cy="100" r="64" fill="var(--ill-paper)" />
      <circle
        cx="100"
        cy="100"
        r="64"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
      />
    </svg>
  );
}
