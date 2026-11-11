/**
 * R334 2-a — CountUp: the animated number (KPI counters, XP, scores).
 * R349 M1.3 — the worklet-law hardening (the iOS crash class, fixed).
 *
 * THE LAW (react-native-worklets 0.13): a closure that executes on the
 * UI runtime may NEVER CALL a captured plain-JS function — the call
 * throws on the UI runtime, the exception surfaces inside an
 * animation-frame batchinator with no JS handler, and the process
 * aborts (the owner's iPhone .ips: SIGABRT ~15s after login, exactly
 * when the dashboard KPIs start counting — `formatter` was exactly such
 * a captured plain function).
 *
 * Three faces, chosen per formatter at render time by RUNTIME TRUTH
 * (`isWorkletFunction` — worklet-transformed functions carry
 * `__workletHash`; a wrong guess here is the crash, so the component
 * checks, it does not trust the caller's promise):
 *
 *   · WORKLET formatter (a module-level function carrying the
 *     `'worklet'` directive — e.g. the default face and `pctFace`) on
 *     native → the FAST PATH: the derived string is computed on the UI
 *     thread and pushed to the `text` prop of an uncontrolled Animated
 *     TextInput via useAnimatedProps. Zero JS-thread frames.
 *
 *   · JS formatter on native — hook-bound closures such as
 *     `useNumerals().formatNumber` can NEVER be worklets (they close
 *     over React state) → the MIRROR PATH: the progress shared value
 *     rides useAnimatedReaction → `scheduleOnRN` (worklets 0.13's
 *     `runOnJS` successor) back to JS state; a plain TextInput renders
 *     it. A few JS ticks for the ~650ms count — the honest price of
 *     arbitrary formatters, and the branch that makes the component
 *     safe for EVERY caller without demanding worklet discipline.
 *
 *   · web — always the mirror path (react-native-web's TextInput has
 *     no `text` native prop; reanimated on web drives updates from the
 *     same frame loop, so fidelity is identical — no separate UI
 *     thread there).
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
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { isWorkletFunction, scheduleOnRN } from "react-native-worklets";
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

/** Latin digits, rounded — the default face. A WORKLET: the UI-thread
 * derivation below calls it, so it must carry the directive (M1.3). */
const defaultFormatter = (n: number): string => {
  "worklet";
  return String(Math.round(n));
};

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
   *  Arabic-Indic numeral formatter for عربية output.
   *
   *  M1.3 contract: a formatter carrying the `'worklet'` directive rides
   *  the zero-JS-frames UI-thread fast path on native; any other function
   *  (e.g. a hook-bound closure) is executed on the JS thread via the
   *  mirror path — never on the UI runtime. Both render identically. */
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

  // M1.3 — the fast path is chosen by runtime truth, not convention.
  const formatterIsWorklet = isWorkletFunction(formatter);

  // The UI-thread derived string. Its closure may only call a
  // PROVEN-worklet function: when the caller's formatter is plain JS
  // (hook-bound), the derived face falls back to the worklet default —
  // its output is unused on the mirror path, and the closure stays
  // lawful no matter what the caller passed.
  const derivedFace = formatterIsWorklet ? formatter : defaultFormatter;
  const text = useDerivedValue(() => derivedFace(progress.value));

  // The mirror path — web always; native when the formatter is a JS
  // function that can never execute on the UI runtime.
  const needsMirror = Platform.OS === "web" || !formatterIsWorklet;
  const [mirror, setMirror] = useState(() => formatter(0));

  // A stable JS callback scheduled from the UI reaction — the successor
  // of the deprecated `runOnJS(setMirror)(next)` shape (worklets 0.13).
  const onMirrorTick = (n: number): void => {
    setMirror((prev) => {
      const next = formatter(n);
      return next === prev ? prev : next;
    });
  };

  useAnimatedReaction(
    () => (needsMirror ? progress.value : Number.NaN),
    (next) => {
      if (!Number.isNaN(next)) {
        scheduleOnRN(onMirrorTick, next);
      }
    },
  );

  // native fast path — UI-thread text updates through the animated
  // `text` prop. (Declared unconditionally — the render branches below
  // may early-return.)
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

  if (needsMirror) {
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
