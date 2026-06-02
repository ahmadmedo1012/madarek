/**
 * Illustration scene registry.
 *
 * Per specs/012-design-graphics-uplift/contracts/illustration-system.md.
 *
 * V1 ships two surfaces eagerly (homepage-hero is critical first-paint;
 * empty-notifs and empty-search are tiny). The remaining V1 scenes are
 * lazy-loaded as their owning surfaces ship in subsequent slices.
 *
 * The registry maps a scene name to a React component. Scene components
 * read CSS variables (--ill-hue-1..6, --ill-stroke, --ill-paper,
 * --ill-shadow) so theme + prefers-contrast adaptation happen via the
 * existing token cascade — no per-scene logic.
 */
import type { ComponentType, ReactElement } from 'react';
import { SceneEmptyNotifs } from './scenes/empty-notifs';
import { SceneEmptySearch } from './scenes/empty-search';
import { SceneError404 } from './scenes/error-404';
import { SceneMilestoneSection } from './scenes/milestone-section';

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
}

type SceneComponent = ComponentType<SceneProps>;

/**
 * Registry of scene components. Names not yet implemented map to `null`
 * — the <Illustration> wrapper falls back to its empty-state placeholder
 * for those.
 */
export const SCENE_REGISTRY: Record<IllustrationName, SceneComponent | null> = {
  'homepage-hero': null,
  'error-404': SceneError404 as SceneComponent,
  'empty-notifs': SceneEmptyNotifs as SceneComponent,
  'empty-search': SceneEmptySearch as SceneComponent,
  'milestone-section': SceneMilestoneSection as SceneComponent,
  'onboarding-frame-1': null,
  'onboarding-frame-2': null,
  'onboarding-frame-3': null,
  'onboarding-role-intro': null,
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
