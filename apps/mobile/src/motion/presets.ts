/**
 * R334 2-a — the Heron motion presets (reanimated 4.7 / worklets 0.13).
 *
 * The DURATION scale is the shared one from @/design/tokens (generated from
 * shared/design-tokens.json — micro 80 · fast 200 · base 400 · slow 500 ·
 * slower 650 · cinema 900, plus the mobile-added durationPress 120 /
 * durationNav 240). Everything here imports those numbers; the few values
 * the shared scale doesn't model (shimmer sweep, indeterminate spin, exit
 * fade, stagger step) are defined BELOW as mobile-only motion tokens and
 * flagged in the round report for the lead.
 *
 * Rules this module encodes (the motion-system contract):
 *   · only transform/opacity are ever animated — never layout properties;
 *   · every consumer degrades under prefers-reduced-motion (B2 rule);
 *   · springs for interaction, timings for state — one easing curve (the
 *     Heron cubic-bezier 0.23 1 0.32 1) for both.
 */
import { Easing } from "react-native-reanimated";
import type {
  EasingFunction,
  EasingFunctionFactory,
  WithSpringConfig,
  WithTimingConfig,
} from "react-native-reanimated";
import { heronEase, motion } from "@/design/tokens";

/** Duration scale — ms. Shared tokens where they exist, mobile-only rest. */
export const durations = {
  /** 80 — micro feedback ticks (a11y focus flash). */
  micro: motion.micro,
  /** 120 — press-in settle (token durationPress). */
  press: motion.durationPress,
  /** 200 — quick state change (token fast). */
  fast: motion.fast,
  /** 240 — slide/navigation entrances (token durationNav). */
  entrance: motion.durationNav,
  /** 150 — exits always beat entrances (mobile-only). */
  exit: 150,
  /** 400 — the base rhythm (token base). */
  base: motion.base,
  /** 500 — slow reveal (token slow). */
  slow: motion.slow,
  /** 650 — count-ups (token slower). */
  countUp: motion.slower,
  /** 1400 — one shimmer sweep across a skeleton (mobile-only). */
  shimmer: 1400,
  /** 300 — idle beat between shimmer sweeps (mobile-only). */
  shimmerPause: 300,
  /** 900 — one indeterminate-ring revolution (mobile-only). */
  spin: 900,
  /** 60 — per-child stagger step (mobile-only). */
  staggerStep: 60,
} as const;

/** Anything a reanimated config accepts as `easing`. */
export type EasingFn = EasingFunction | EasingFunctionFactory;

/** The single easing family — the Heron curve leads everywhere. */
export const easings = {
  /** cubic-bezier(0.23, 1, 0.32, 1) — the shared heronEase token. */
  heron: Easing.bezier(heronEase[0], heronEase[1], heronEase[2], heronEase[3]),
  /** for content that settles into place. */
  outCubic: Easing.out(Easing.cubic),
  /** symmetric — rare; reserved for cross-fades. */
  inOutCubic: Easing.inOut(Easing.cubic),
  /** mechanical loops only (shimmer, indeterminate spin). */
  linear: Easing.linear,
} as const satisfies Record<string, EasingFn>;

/**
 * Spring configs — interaction physics. Physical parameters (mass/damping/
 * stiffness), not duration+ratio: press feedback must feel the same whether
 * it travels 2% or 10%.
 */
export const springs = {
  /** touch feedback — settles ≈120ms, no visible overshoot on small scales. */
  snappy: { mass: 0.7, damping: 22, stiffness: 420, overshootClamping: false },
  /** the general-purpose spring — cards, sheets, values. */
  default: { mass: 1, damping: 26, stiffness: 260, overshootClamping: false },
  /** large surfaces and hero moves — heavy, unhurried. */
  gentle: { mass: 1.1, damping: 30, stiffness: 170, overshootClamping: false },
} as const satisfies Record<string, WithSpringConfig>;

/** Timing config builder — the default curve is the Heron ease. */
export function timing(duration: number, easingFn: EasingFn = easings.heron): WithTimingConfig {
  return { duration, easing: easingFn };
}

/** The Heron press state — scale ≈0.98 · opacity ≈0.9 (spec defaults). */
export const pressFeedback = {
  scale: 0.98,
  opacity: 0.9,
} as const;

/** Local clamp (reanimated's `clamp` is a worklet util — jest-mocked to a
 *  no-op, so components keep their own plain-JS one for render paths). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
