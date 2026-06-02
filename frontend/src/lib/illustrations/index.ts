/**
 * Illustration scene registry — populated incrementally per
 * specs/012-design-graphics-uplift/contracts/illustration-system.md.
 *
 * V1 ships nine names (six surfaces; the onboarding sequence counts
 * as four frames within that set):
 *   - homepage-hero
 *   - error-404
 *   - empty-notifs
 *   - empty-search
 *   - milestone-section
 *   - onboarding-frame-1
 *   - onboarding-frame-2
 *   - onboarding-frame-3
 *   - onboarding-role-intro
 *
 * Tasks T080..T088 wire the lazy resolver and individual scene
 * modules. Until then, this file holds the union type only.
 */

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
