/**
 * boot.tsx — R327 B2 «منظّم المحمّلات» — the ONE loader system.
 *
 * Rules (enforced app-wide by LoadingScreen/InlineBusy routing here):
 *   · ONE loader vocabulary: the brand mark converging (Heron rhythm) —
 *     no generic spinners anywhere in the app.
 *   · <Boot> is the boot/transition state: the mark at the SAME size and
 *     position as the native splash (120 · centred) so the splash → app
 *     handoff is a cross-fade with zero jump.
 *   · honest slow state: after 6s the label becomes «الخادم يستيقظ…»
 *     (the Render free tier sleeps; the user deserves the truth) with an
 *     optional retry.
 *   · respect prefers-reduced-motion: static mark, no animation.
 *   · <InlineBusy> — the small inline variant for buttons and rows; pair
 *     with useStableFlag(busy) for the ≥300ms anti-flicker hold.
 *
 * R327 C4: the animations ride React Native's built-in Animated (native
 * driver — UI thread, the same 60fps path) instead of react-native-
 * reanimated. These loops are plain transform/opacity cycles; the whole
 * reanimated+worklets runtime (~420kB of mapped JS ≈ 0.95MB of .hbc) was
 * riding the bundle for three pulse loops. Core Animated ships with RN —
 * zero marginal bytes.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  View,
  type EasingFunction,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { heronEase } from "@/design/tokens.generated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "./text";
import { Button } from "./pressables";

const EASE = Easing.bezier(heronEase[0], heronEase[1], heronEase[2], heronEase[3]);
const CYCLE = 520;

/* ── core-Animated helpers ──────────────────────────────────────────── */

/**
 * A value looping between two targets forever (paper rhythm). The loop
 * runs on the native driver — transform/opacity only, which is exactly
 * the loader vocabulary. Stops on unmount; returns the value so it can
 * seat in an Animated.View style.
 */
function usePulseLoop(
  from: number,
  to: number,
  duration: number,
  easing: EasingFunction,
  enabled: boolean,
): Animated.Value {
  // lazily-created, identity-stable — useState initializer instead of a
  // ref read during render (react-compiler clean). Never set → no re-renders.
  const [v] = useState(() => new Animated.Value(from));
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: true }),
        Animated.timing(v, { toValue: from, duration, easing, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, from, to, duration, easing, enabled]);
  return v;
}

/** One-time phase offset for staggered loops (starts after `delay` ms). */
function useDelayedPulseLoop(
  from: number,
  to: number,
  duration: number,
  easing: EasingFunction,
  delay: number,
  enabled: boolean,
): Animated.Value {
  const [v] = useState(() => new Animated.Value(from));
  useEffect(() => {
    if (!enabled) return;
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: true }),
          Animated.timing(v, { toValue: from, duration, easing, useNativeDriver: true }),
        ]),
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [v, from, to, duration, easing, delay, enabled]);
  return v;
}

/* ── BootMark — the two squares + the point, converging ─────────────── */

/**
 * The canonical mark as a live loader (the 32-grid construction from
 * mark.ts): the axis square and the rotated square pulse in counter-phase
 * — «المربعان يتجمعان» — the point breathes. `size` 120 = the splash
 * icon size → identical position on the splash → app cross-fade.
 */
export function BootMark({ size = 120 }: { size?: number }) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const u = size / 32;
  const stroke = 1.5; // the mark's non-scaling hairline (mark.ts)
  const diamondSide = 15.556; // the √2-snapped rotated square (mark.ts)

  // counter-phase: the axis eases in while the diamond eases out
  const axisScale = usePulseLoop(1, 0.88, CYCLE, EASE, !reduced);
  const diamondScale = usePulseLoop(1, 1.09, CYCLE, EASE, !reduced);
  const pointOpacity = usePulseLoop(1, 0.35, CYCLE, EASE, !reduced);

  const axis = {
    position: "absolute" as const,
    left: 8 * u,
    top: 8 * u,
    width: 16 * u,
    height: 16 * u,
    borderWidth: stroke,
    borderColor: p.text,
  };
  const diamond = {
    position: "absolute" as const,
    left: ((32 - diamondSide) / 2) * u,
    top: ((32 - diamondSide) / 2) * u,
    width: diamondSide * u,
    height: diamondSide * u,
    borderWidth: stroke,
    borderColor: p.text,
  };
  const point = {
    position: "absolute" as const,
    left: 22 * u,
    top: 6 * u,
    width: 4 * u,
    height: 4 * u,
    backgroundColor: p.accent,
  };

  if (reduced) {
    return (
      <View style={{ width: size, height: size }}>
        <View style={axis} />
        <View style={[diamond, { transform: [{ rotate: "45deg" }] }]} />
        <View style={point} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[axis, { transform: [{ scale: axisScale }] }]} />
      <Animated.View
        style={[diamond, { transform: [{ rotate: "45deg" }, { scale: diamondScale }] }]}
      />
      <Animated.View style={[point, { opacity: pointOpacity }]} />
    </View>
  );
}

/* ── Boot — the full-screen boot/transition state ───────────────────── */

const SLOW_AFTER_MS = 6000;

export function Boot({
  label = "جارٍ التحميل…",
  slowLabel = "الخادم يستيقظ… قد يستغرق لحظات ثم يبدأ العمل.",
  onRetry,
  size = 120,
}: {
  label?: string;
  slowLabel?: string | null;
  onRetry?: () => void;
  size?: number;
}) {
  const p = usePalette();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.bg,
        gap: sp[20],
        paddingHorizontal: sp[24],
      }}
    >
      <BootMark size={size} />
      <View style={{ alignItems: "center", gap: sp[8], maxWidth: 320 }}>
        <T variant="sm" color="muted" align="center">
          {slow && slowLabel ? slowLabel : label}
        </T>
        {slow && onRetry ? (
          <Button label="إعادة المحاولة" kind="ghost" small onPress={onRetry} />
        ) : null}
      </View>
    </View>
  );
}

/* ── InlineBusy — the small inline variant (buttons, rows) ──────────── */

/** Three hairline squares stepping — the tiny sibling of BootMark. */
export function InlineBusy({ size = 14, color }: { size?: number; color?: string }) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const c = color ?? p.text;
  const gap = Math.max(3, Math.round(size / 3));

  const a = usePulseLoop(1, 0.25, 260, EASE, !reduced);
  const b = useDelayedPulseLoop(1, 0.25, 260, EASE, 170, !reduced);
  const c2 = useDelayedPulseLoop(1, 0.25, 260, EASE, 340, !reduced);

  if (reduced) {
    return (
      <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
        <View style={{ width: size, height: size, backgroundColor: c }} />
        <View style={{ width: size, height: size, backgroundColor: c }} />
        <View style={{ width: size, height: size, backgroundColor: c }} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, { opacity: a }]} />
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, { opacity: b }]} />
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, { opacity: c2 }]} />
    </View>
  );
}

/* ── shared motion ──────────────────────────────────────────────────── */

/**
 * The drafting-table pulse for skeletons (paper rhythm, ~1.3s cycle).
 * Returns the opacity style seat for an Animated.View (static opacity
 * when reduced — the caller's plain View path renders instead).
 */
export function usePulseStyle(reduced: boolean): Animated.WithAnimatedValue<StyleProp<ViewStyle>> {
  const quad = Easing.inOut(Easing.quad);
  const v = usePulseLoop(0.85, 0.35, 640, quad, !reduced);
  return reduced ? {} : { opacity: v };
}

/** A busy flag that, once raised, holds ≥ `minMs` after it drops (anti-flicker). */
export function useStableFlag(flag: boolean, minMs = 300): boolean {
  const [holding, setHolding] = useState(false);
  const raisedAt = useRef<number | null>(null);
  useEffect(() => {
    if (flag) {
      raisedAt.current = Date.now();
      return;
    }
    if (raisedAt.current !== null) {
      const remaining = minMs - (Date.now() - raisedAt.current);
      if (remaining > 0) {
        setHolding(true);
        const t = setTimeout(() => {
          raisedAt.current = null;
          setHolding(false);
        }, remaining);
        return () => clearTimeout(t);
      }
      raisedAt.current = null;
    }
  }, [flag, minMs]);
  return flag || holding;
}
