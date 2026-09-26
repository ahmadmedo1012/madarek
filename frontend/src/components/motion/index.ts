// Motion primitives barrel export.
// Populated incrementally — see specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
export { useReducedMotion } from './useReducedMotion';
export { PageTransition } from './PageTransition';
export { Skeleton, SkeletonGroup } from './Skeleton';
export type { SkeletonVariant } from './Skeleton';
export { Reveal, RevealGroup } from './Reveal';
// 5-B2: landing journey-rail signature move («سجلّ الرحلة»).
export { JourneyRail, JOURNEY_STAGES } from './JourneyRail';
export type { JourneyStage } from './JourneyRail';
// Immersive redesign (docs/immersive-redesign-plan.md §8): the scrub
// foundation + Arabic-safe word masks + sequential timeline + hero scene.
export { useScrollProgress } from './useScrollProgress';
export type { UseScrollProgressOptions } from './useScrollProgress';
export { MaskReveal } from './MaskReveal';
export { SequentialHighlight } from './SequentialHighlight';
export type { SequentialItem } from './SequentialHighlight';
export { ConstellationCanvas } from './ConstellationCanvas';
export type { ConstellationCanvasProps } from './ConstellationCanvas';
