/**
 * R334 2-a — RingProgress: the circular progress ring.
 *
 * react-native-svg Circle + reanimated useAnimatedProps: the arc is driven
 * by `strokeDashoffset` on the UI thread (an svg PAINT property set through
 * native props — no layout pass ever runs; the transform/opacity rule
 * targets Yoga layout, and the only Yoga-affecting motion here — the
 * indeterminate spin — is a plain rotate transform).
 *
 *   · determinate — `progress` (0..1) fills the ring; changes re-animate
 *     from the current position with the Heron curve;
 *   · indeterminate — a fixed 25% arc rotating once per `durations.spin`
 *     (linear, forever) — the busy ring for unknown-duration loads.
 *
 * Reduced motion: determinate jumps to the value instantly; indeterminate
 * freezes to an honest static arc. Web: react-native-svg + reanimated both
 * run their web builds — same component, no platform fork.
 */
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/design/theme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { clamp, durations, easings } from "./presets";

/** Module scope — the animated component type stays stable across renders. */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Share of the circumference the indeterminate arc covers. */
const INDETERMINATE_ARC = 0.25;

export interface RingProgressProps {
  /** target fill, 0..1 — clamped (ignored in indeterminate mode). */
  progress: number;
  /** outer diameter in px (default 48). */
  size?: number;
  /** stroke width in px (default 4 — the hairline tier). */
  thickness?: number;
  /** arc color (default the accent signal). */
  color?: string;
  /** full-circle track color (default the theme hairline). */
  trackColor?: string;
  /** busy mode — a fixed arc spins instead of a determinate fill. */
  indeterminate?: boolean;
  /** fill animation duration in ms (default 500 — durations.slow). */
  duration?: number;
  /** centered inside the ring (e.g. a percentage label). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** screen-reader name (user-facing — العربية). */
  accessibilityLabel?: string;
}

export function RingProgress({
  progress,
  size = 48,
  thickness = 4,
  color,
  trackColor,
  indeterminate = false,
  duration = durations.slow,
  children,
  style,
  testID,
  accessibilityLabel,
}: RingProgressProps) {
  const reduced = useReduceMotion();
  const { palette } = useTheme();

  const radius = Math.max((size - thickness) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const arcColor = color ?? palette.accent;
  const railColor = trackColor ?? palette.border;

  /* determinate fill — 0..1 on the UI thread */
  const fill = useSharedValue(0);
  useEffect(() => {
    if (indeterminate) return;
    const target = clamp(progress, 0, 1);
    if (reduced) {
      fill.value = target; // instant — no timing
    } else {
      fill.value = withTiming(target, { duration, easing: easings.heron });
    }
  }, [progress, duration, reduced, indeterminate, fill]);

  const circleProps = {
    cx: size / 2,
    cy: size / 2,
    r: radius,
    strokeWidth: thickness,
    fill: "none",
  };

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  /* indeterminate spin — rotate transform only, linear, forever */
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!indeterminate || reduced) return;
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(1, { duration: durations.spin, easing: easings.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(spin);
  }, [indeterminate, reduced, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  // the arc drawn in indeterminate mode (static geometry, the spin moves it)
  const indeterminateOffset = circumference * (1 - INDETERMINATE_ARC);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? (indeterminate ? "جارٍ التحميل…" : undefined)}
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[styles.fill, indeterminate && !reduced ? spinStyle : null]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            {...circleProps}
            stroke={railColor}
            // start the arc at 12 o'clock (svg circles start at 3)
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {indeterminate ? (
            <Circle
              {...circleProps}
              stroke={arcColor}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={indeterminateOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : (
            <AnimatedCircle
              {...circleProps}
              stroke={arcColor}
              strokeDasharray={`${circumference}`}
              animatedProps={animatedProps}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
      </Animated.View>
      {children != null ? (
        <View style={styles.center} pointerEvents="none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
