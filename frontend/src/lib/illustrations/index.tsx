/**
 * Illustration scene registry — the legacy 012 scenes that survive the
 * r280 mk-ill migration.
 *
 * Per specs/012-design-graphics-uplift/contracts/illustration-system.md
 * (the original contract) and the Agent I wiring guide
 * (docs/redesign/handoff/illustrations.md §4 Option B).
 *
 * r280 scene inventory (post-migration — every surviving scene consumed):
 *   milestone-section      → MilestoneScene celebration modal
 *   onboarding-frame-2..3 → OnboardingFlow frames 1–2
 *   onboarding-role-intro → OnboardingFlow frame 3 (5 role motifs)
 *
 * Retired in r280 (all consumers moved to the mk-ill kit,
 * `components/illustrations`): `homepage-hero` (the r198 landing
 * stopped mounting it), `error-404` (→ kit `not-found`),
 * `empty-notifs` (→ kit `empty-notifications`), `empty-search`
 * (→ kit `empty-search`/`empty-list` per-surface), `empty-constellation`
 * (→ kit `empty-list`), `onboarding-frame-1` (→ kit `welcome-first-run`).
 *
 * Deviation kept from the original contract (documented, audit 0-f
 * P3-26): scenes are statically imported rather than React.lazy —
 * each is ≤ ~6KB, the registry is one chunk, and every consumer mounts
 * inside an already code-split surface.
 *
 * Scene components read CSS variables (--ill-hue-1..6, --ill-stroke,
 * --ill-paper, --ill-shadow) so theme + prefers-contrast adaptation
 * happen via the token cascade — no per-scene logic.
 */
import type { ComponentType, ReactElement } from 'react';
import type { AppRole } from '../../stores/auth.store';
import { SceneMilestoneSection } from './scenes/milestone-section';
import { SceneOnboardingFrame2 } from './scenes/onboarding/frame-2';
import { SceneOnboardingFrame3 } from './scenes/onboarding/frame-3';
import { SceneOnboardingRoleIntro } from './scenes/onboarding/role-intro';

export type IllustrationName =
  | 'milestone-section'
  | 'onboarding-frame-2'
  | 'onboarding-frame-3'
  | 'onboarding-role-intro';

export const V1_ILLUSTRATION_NAMES: ReadonlyArray<IllustrationName> = [
  'milestone-section',
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
  'milestone-section': SceneMilestoneSection as SceneComponent,
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
        cx="100" cy="100" r="64"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
      />
    </svg>
  );
}
