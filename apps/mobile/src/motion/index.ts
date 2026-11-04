/**
 * R334 2-a — the mobile motion system barrel.
 *
 * One import for the whole Heron motion vocabulary:
 *
 *   import { PressableScale, fadeInUp, Skeleton, CountUp, RingProgress } from "@/motion";
 *
 * `useReduceMotion` is re-exported for convenience — the gate every
 * consumer needs — but stays owned by src/hooks (it is app-level, not
 * motion-specific; non-motion screens may read it too).
 */
export { durations, easings, springs, timing, pressFeedback, clamp } from "./presets";
export type { EasingFn } from "./presets";

export {
  fadeIn,
  fadeInUp,
  fadeInDown,
  slideInFromStart,
  slideInFromEnd,
  fadeOut,
  heronLayout,
  staggerDelay,
  enterStagger,
  useEntrance,
  useStaggerEntrance,
} from "./entrance";
export type { EntranceOptions, StaggerOptions } from "./entrance";

export { PressableScale } from "./PressableScale";
export type { PressableScaleProps } from "./PressableScale";

export { Skeleton, SkeletonText } from "./Skeleton";
export type { SkeletonProps, SkeletonTextProps } from "./Skeleton";

export { CountUp } from "./CountUp";
export type { CountUpProps } from "./CountUp";

export { RingProgress } from "./RingProgress";
export type { RingProgressProps } from "./RingProgress";

export { useReduceMotion } from "@/hooks/useReduceMotion";
