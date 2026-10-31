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
 */
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type AnimatedStyle,
} from "react-native-reanimated";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { heronEase } from "@/design/tokens.generated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "./text";
import { Button } from "./pressables";

const EASE = Easing.bezier(heronEase[0], heronEase[1], heronEase[2], heronEase[3]);
const CYCLE = 520;

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

  const axisStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withRepeat(
          withSequence(
            withTiming(0.88, { duration: CYCLE, easing: EASE }),
            withTiming(1, { duration: CYCLE, easing: EASE }),
          ),
          -1,
          false,
        ),
      },
    ],
  }));
  const diamondStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: "45deg" },
      {
        scale: withRepeat(
          withSequence(
            withTiming(1.09, { duration: CYCLE, easing: EASE }),
            withTiming(1, { duration: CYCLE, easing: EASE }),
          ),
          -1,
          false,
        ),
      },
    ],
  }));
  const pointStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withTiming(0.35, { duration: CYCLE, easing: EASE }),
        withTiming(1, { duration: CYCLE, easing: EASE }),
      ),
      -1,
      false,
    ),
  }));

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
      <Animated.View style={[axis, axisStyle]} />
      <Animated.View style={[diamond, diamondStyle]} />
      <Animated.View style={[point, pointStyle]} />
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

  const seq = () =>
    withSequence(
      withTiming(0.25, { duration: 260, easing: EASE }),
      withTiming(1, { duration: 260, easing: EASE }),
    );
  const a = useAnimatedStyle(() => ({ opacity: withRepeat(seq(), -1, false) }));
  const b = useAnimatedStyle(() => ({ opacity: withDelay(170, withRepeat(seq(), -1, false)) }));
  const c2 = useAnimatedStyle(() => ({ opacity: withDelay(340, withRepeat(seq(), -1, false)) }));

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
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, a]} />
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, b]} />
      <Animated.View style={[{ width: size, height: size, backgroundColor: c }, c2]} />
    </View>
  );
}

/* ── shared motion ──────────────────────────────────────────────────── */

/** The drafting-table pulse for skeletons (paper rhythm, ~1.3s cycle). */
export function usePulseStyle(reduced: boolean): AnimatedStyle<{ opacity: number }> {
  return useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withTiming(0.35, { duration: 640, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: 640, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    ),
  }));
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
