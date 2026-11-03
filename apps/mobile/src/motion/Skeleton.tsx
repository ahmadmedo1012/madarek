/**
 * R334 2-a — Skeleton / SkeletonText: the shimmer loading primitive.
 *
 * A UI-thread looping translateX sweeps a soft paper highlight across the
 * bone (only `transform` animates — never layout). The gradient overlay is
 * react-native-svg (already a dependency — no expo-linear-gradient in the
 * tree, and none may be added), clipped by the bone's overflow.
 *
 * Theme-aware by default: light runs a paper sweep over the hairline bone,
 * dark an ink sweep over the raised surface. prefers-reduced-motion and
 * `static` both drop the sweep entirely — a flat, honest bone remains.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { I18nManager, StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { durations, easings } from "./presets";

/** Minimum sweep width (px) — a hairline bone still gets a visible band. */
const MIN_SWEEP = 24;

export interface SkeletonProps {
  /** bone width (default "100%"). */
  width?: DimensionValue;
  /** bone height in px (default 14 — one line of body text). */
  height?: number;
  /** corner radius (default 0 — the Heron radius discipline). */
  radius?: number;
  /** override the bone color (defaults are theme-aware). */
  color?: string;
  /** flat bone — no sweep (besides the reduced-motion gate). */
  static?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 0,
  color,
  static: isStatic = false,
  style,
  testID,
}: SkeletonProps) {
  const reduced = useReduceMotion();
  const { name, palette } = useTheme();
  // React 19 useId, sanitized — svg resolves url(#id) globally, so gradient
  // ids must be unique per instance.
  const gradientId = `mdrk-skel-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Sweep geometry needs a numeric width; percentage/auto bones measure once.
  const [measured, setMeasured] = useState<number | null>(typeof width === "number" ? width : null);
  const onLayout = (event: LayoutChangeEvent) => {
    const w = event.nativeEvent.layout.width;
    if (w > 0) setMeasured((prev) => (prev === w ? prev : w));
  };

  const sweep = useSharedValue(0);
  const showSweep = !isStatic && !reduced && measured != null && measured > 0;

  const band = measured != null ? Math.max(measured * 0.4, MIN_SWEEP) : 0;
  // the band starts fully clipped off one edge and ends fully clipped off
  // the other — the loop's wrap-around is never visible
  const fromX = I18nManager.isRTL ? (measured ?? 0) : -band;
  const toX = I18nManager.isRTL ? -band : measured ?? 0;

  useEffect(() => {
    if (!showSweep) return;
    sweep.value = 0;
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: durations.shimmer, easing: easings.linear }),
        // hold offscreen, then the repeat restarts from 0 (also offscreen)
        withDelay(durations.shimmerPause, withTiming(1, { duration: 1, easing: easings.linear })),
      ),
      -1, // forever
      false,
    );
    return () => cancelAnimation(sweep);
  }, [showSweep, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fromX + (toX - fromX) * sweep.value }],
  }));

  const bone =
    color ??
    // light: the hairline tier just under paper · dark: the raised surface
    (name === "light" ? palette.border : palette.surfaceHover);
  const highlight = name === "light" ? palette.bg : palette.surface;

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: bone,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {showSweep ? (
        <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
          <Svg width={band} height={height} viewBox={`0 0 ${band} ${height}`}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={highlight} stopOpacity={0} />
                <Stop offset="0.5" stopColor={highlight} stopOpacity={0.9} />
                <Stop offset="1" stopColor={highlight} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={band} height={height} fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ─── SkeletonText — 2–3 composed lines ───────────────────────────────── */

export interface SkeletonTextProps {
  /** number of lines (default 3; clamped to 1–6). */
  lines?: number;
  /** line height in px (default 12 — reads as one body-text line). */
  lineHeight?: number;
  /** vertical gap between lines (default sp[8]). */
  gap?: number;
  /** block width (default "100%"). */
  width?: DimensionValue;
  /** width of the last line as a share of `width` (default 0.6). */
  lastLineRatio?: number;
  radius?: number;
  color?: string;
  static?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

export function SkeletonText({
  lines = 3,
  lineHeight = 12,
  gap = sp[8],
  width = "100%",
  lastLineRatio = 0.6,
  radius,
  color,
  static: isStatic = false,
  style,
  testID,
}: SkeletonTextProps) {
  const count = Math.min(Math.max(Math.round(lines), 1), 6);
  const lastWidth = `${Math.round(Math.min(Math.max(lastLineRatio, 0.1), 1) * 100)}%` as `${number}%`;
  return (
    <View testID={testID} style={[{ width, gap }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === count - 1 && count > 1 ? lastWidth : "100%"}
          height={lineHeight}
          radius={radius}
          color={color}
          static={isStatic}
        />
      ))}
    </View>
  );
}
