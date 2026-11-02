/**
 * plan/types — the shared contract of the R330 signature plan-drawing
 * library (توقيع مدارك البصري).
 *
 * The app's signature is the WEBSITE's drafted-architectural-plan
 * language, translated to native: hairline ink structures (stroke
 * 1–1.5), dashed axis scaffolds, dimension ticks, 45° hatch textures,
 * and exactly ONE orange signal per sheet. Every drawing shares the
 * same 320×220 drafting sheet and draws itself in progressively
 * (strokeDash reveal) through usePlanDraw.
 */
import type { StyleProp, ViewStyle } from "react-native";

/** The drafting sheet every plan drawing is drafted on. */
export const PLAN_VIEWBOX = "0 0 320 220" as const;

/** Sheet aspect (w/h) — wrappers keep this ratio around the Svg. */
export const PLAN_ASPECT = 320 / 220;

/**
 * A resolved draw value: a plain number (the rAF engine in usePlanDraw
 * resolves every frame — no Animated interpolation nodes).
 */
export type PlanProgress = number;

/** stroke-dash props that reveal a drawable of a known path length. */
export interface PlanDash {
  strokeDasharray: number;
  strokeDashoffset: number;
}

/** The handle usePlanDraw hands to each drawing. */
export interface PlanDrawHandle {
  /** Full-range eased 0..1 progress — for whole-sheet fades. */
  t: PlanProgress;
  /**
   * Clamped sub-range of the draw, e.g. seg(0.4, 0.7). Doubles as a
   * phase for dash() and as an opacity (0 → invisible, 1 → shown).
   */
  seg: (a: number, b: number) => PlanProgress;
  /**
   * Dash props revealing a drawable of `len` across `phase`
   * (defaults to the full draw).
   */
  dash: (len: number, phase?: PlanProgress) => PlanDash;
}

/** Props shared by every plan drawing. */
export interface PlanArtProps {
  /** Ink — defaults to the theme ink (palette.text). */
  color?: string;
  /** The ONE orange signal — defaults to palette.accent. */
  dotColor?: string;
  /** Controlled draw progress 0..1 (static — no animation). */
  progress?: number;
  /** Draw-in on mount (~900ms, heron ease-out). */
  autoplay?: boolean;
  /** Sheet width (height follows the 320:220 aspect). */
  width?: number | string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}
