/**
 * R334 2-a — PressableScale: the Heron press feedback primitive.
 *
 * A NEW sibling of ui/pressables (that file stays untouched — its Button /
 * IconButton own their own pressed styles). This one wraps ANY pressable
 * content with the spec press state — scale ≈0.98 · opacity ≈0.9 — driven
 * on the UI thread by reanimated, so feedback lands on the frame the finger
 * lands, regardless of JS-thread load.
 *
 * Contract:
 *   · only transform/opacity animate (never layout);
 *   · `disabled` and prefers-reduced-motion are full no-ops (identity
 *     style, no shared-value churn);
 *   · every Pressable prop forwards untouched — accessibility included;
 *   · no ref mutation during render (React-Compiler-safe).
 */
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { durations, easings, pressFeedback, springs } from "./presets";

/** Animated Pressable — module scope so the component type is stable. */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** scale while pressed (default 0.98 — the Heron press). */
  pressedScale?: number;
  /** opacity while pressed (default 0.9). */
  pressedOpacity?: number;
  /**
   * Static style only. (Pressable's function form isn't needed here — this
   * primitive IS the pressed-style function.)
   */
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({
  pressedScale = pressFeedback.scale,
  pressedOpacity = pressFeedback.opacity,
  disabled = false,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: PressableScaleProps) {
  const reduced = useReduceMotion();
  /** 0 → identity, 1 → full press state. */
  const pressed = useSharedValue(0);
  const animates = !disabled && !reduced;

  const animatedStyle = useAnimatedStyle(() => {
    const p = pressed.value;
    return {
      transform: [{ scale: 1 + (pressedScale - 1) * p }],
      opacity: 1 + (pressedOpacity - 1) * p,
    };
  });

  const handlePressIn = (event: GestureResponderEvent) => {
    if (animates) {
      // deterministic down-beat: 120ms to the pressed state
      pressed.value = withTiming(1, { duration: durations.press, easing: easings.outCubic });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (animates) {
      // organic release: the snappy spring back to identity
      pressed.value = withSpring(0, springs.snappy);
    }
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    />
  );
}
