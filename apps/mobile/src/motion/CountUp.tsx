/**
 * R334 2-a — CountUp: the animated number (KPI counters, XP, scores).
 *
 * Platform split (the robust RN + web approach):
 *   · native — the UI-thread TextInput trick: the shared progress drives a
 *     derived string, pushed to the `text` prop of an uncontrolled
 *     Animated TextInput via useAnimatedProps. Zero JS-thread frames.
 *   · web — react-native-web's TextInput has no `text` native prop, so the
 *     same derived value mirrors through state via useAnimatedReaction +
 *     runOnJS (reanimated on web drives updates from the same frame loop,
 *     so the fidelity is identical — there is no separate UI thread there).
 *
 * Reduced motion → instant: a plain Text at the final value, no hooks
 * churn, no animation. `formatter` shapes the output — Latin digits by
 * default, Arabic-Indic numerals by passing a formatter.
 */
import { useEffect, useState } from "react";
import {
  Platform,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import type { ComponentType } from "react";
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { durations, easings } from "./presets";

/**
 * RN's TextInput type has no `text` prop, but the native component accepts
 * one — that's the documented reanimated UI-thread text trick. Typing the
 * animated wrapper with it keeps useAnimatedProps fully checked instead of
 * casting the value at the JSX site.
 */
type AnimatedTextInputProps = TextInputProps & { text?: string };

const AnimatedTextInput = Animated.createAnimatedComponent(
  TextInput as unknown as ComponentType<AnimatedTextInputProps>,
);

/** Latin digits, rounded — the default face. */
const defaultFormatter = (n: number): string => String(Math.round(n));

/**
 * Input-neutralizing defaults — a bare TextInput carries intrinsic
 * padding/border/background AND an intrinsic width that overflows narrow
 * stat cells on RN-web at wide layouts (R334 review finding on the 768dp
 * capture). Merged BEFORE the caller's style so it stays overridable.
 */
const inputBaseStyle: TextStyle = {
  padding: 0,
  borderWidth: 0,
  backgroundColor: "transparent",
  textAlign: "center",
  width: "100%",
};

export interface CountUpProps {
  /** the number to count to (changes re-animate from the current value). */
  value: number;
  /** animation duration in ms (default 650 — durations.countUp). */
  duration?: number;
  /** shape the output: `String(Math.round(n))` by default; pass an
   *  Arabic-Indic numeral formatter for عربية output. */
  formatter?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  /** announced to screen readers — defaults to the FINAL formatted value,
   *  so a11y users never sit through the count. */
  accessibilityLabel?: string;
  testID?: string;
}

export function CountUp({
  value,
  duration = durations.countUp,
  formatter = defaultFormatter,
  style,
  accessibilityLabel,
  testID,
}: CountUpProps) {
  const reduced = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = value; // instant set
    } else {
      progress.value = withTiming(value, { duration, easing: easings.heron });
    }
  }, [value, duration, reduced, progress]);

  const text = useDerivedValue(() => formatter(progress.value));

  // web mirror — native never enters this path (prepare returns null there)
  const shouldMirror = Platform.OS === "web";
  const [mirror, setMirror] = useState(() => formatter(0));
  useAnimatedReaction(
    () => (shouldMirror ? text.value : null),
    (next, prev) => {
      if (next != null && next !== prev) {
        runOnJS(setMirror)(next);
      }
    },
  );

  // native — UI-thread text updates through the animated `text` prop.
  // (Declared unconditionally — the render branches below may early-return.)
  const animatedProps = useAnimatedProps<AnimatedTextInputProps>(() => ({
    text: text.value,
  }));

  const label = accessibilityLabel ?? formatter(value);

  if (reduced) {
    // reduced motion → the final value, immediately
    return (
      <Text testID={testID} accessibilityLabel={label} style={style}>
        {formatter(value)}
      </Text>
    );
  }

  if (shouldMirror) {
    return (
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        editable={false}
        pointerEvents="none"
        value={mirror}
        style={[inputBaseStyle, style]}
      />
    );
  }

  const inputProps: TextInputProps = {
    testID,
    accessibilityLabel: label,
    editable: false,
    pointerEvents: "none",
    style: [inputBaseStyle, style],
  };

  return (
    <AnimatedTextInput
      {...inputProps}
      defaultValue={formatter(0)}
      animatedProps={animatedProps}
    />
  );
}
