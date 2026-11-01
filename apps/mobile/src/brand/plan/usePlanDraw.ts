/**
 * usePlanDraw — the ONE progressive-draw engine of the plan library.
 *
 * A single Animated.Value 0→1 drives every stroke reveal through
 * strokeDasharray/strokeDashoffset. The value is consumed three ways:
 *   · `dash(len, phase)` — dash props that draw a shape of path length
 *     `len` across the clamped sub-range `seg(a, b)` — this is how the
 *     sheet composes (ground first, masses, then windows, then the
 *     orange signal).
 *   · `seg(a, b)` — also an opacity, for detail layers that FADE in
 *     (hatch, dimension chains, furniture) instead of drawing.
 *   · `t` — the full-range value for whole-sheet fades.
 *
 * Modes:
 *   · `progress` given          → controlled, static (no animation).
 *   · `autoplay` true           → one 0→1 run on mount (motion.cinema
 *     ≈ 900ms, the Heron ease-out), honouring reduce-motion (jumps to
 *     the finished drawing).
 *   · neither                   → fully drawn, static.
 *
 * Interpolations are cached per (phase, length) so grids of repeated
 * elements (windows, desks) share a single animated node.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { heronEase, motion } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import type { PlanDash, PlanDrawHandle, PlanProgress } from "./types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const heronBezier = Easing.bezier(heronEase[0], heronEase[1], heronEase[2], heronEase[3]);

export function usePlanDraw(
  progress?: number,
  autoplay = false,
  durationMs: number = motion.cinema,
): PlanDrawHandle {
  const reduced = useReduceMotion();
  const controlled = progress != null;

  // Resolve the starting value at FIRST render so static sheets never
  // flash empty before the effect runs.
  const initial = useRef<number | null>(null);
  if (initial.current == null) {
    initial.current = controlled
      ? clamp01(progress as number)
      : autoplay && !reduced
        ? 0
        : 1;
  }
  const value = useRef(new Animated.Value(initial.current)).current;

  useEffect(() => {
    if (controlled) {
      value.setValue(clamp01(progress as number));
      return;
    }
    if (!autoplay || reduced) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const anim = Animated.timing(value, {
      toValue: 1,
      duration: durationMs,
      easing: heronBezier,
      useNativeDriver: false, // svg paint props — JS driver on purpose
    });
    anim.start();
    return () => anim.stop();
  }, [controlled, progress, autoplay, reduced, durationMs, value]);

  // seg(a,b) cache — keyed by the sub-range.
  const segCache = useRef(new Map<string, Animated.AnimatedInterpolation<number>>()).current;
  // dash cache — keyed by (phase node → length), so every phase owns
  // its own offset interpolations and repeated lengths share them.
  const dashCache = useRef(
    new WeakMap<Animated.AnimatedInterpolation<number>, Map<number, Animated.AnimatedInterpolation<number>>>(),
  ).current;

  const seg = (a: number, b: number): PlanProgress => {
    if (controlled || !autoplay || reduced) return 1;
    const key = `${a}-${b}`;
    let v = segCache.get(key);
    if (!v) {
      v = value.interpolate({ inputRange: [a, b], outputRange: [0, 1], extrapolate: "clamp" });
      segCache.set(key, v);
    }
    return v;
  };

  const dash = (len: number, phase?: PlanProgress): PlanDash => {
    const p = phase ?? seg(0, 1);
    if (typeof p === "number") {
      return { strokeDasharray: len, strokeDashoffset: len * (1 - p) };
    }
    let byLen = dashCache.get(p);
    if (!byLen) {
      byLen = new Map();
      dashCache.set(p, byLen);
    }
    let offset = byLen.get(len);
    if (!offset) {
      offset = p.interpolate({ inputRange: [0, 1], outputRange: [len, 0] });
      byLen.set(len, offset);
    }
    return { strokeDasharray: len, strokeDashoffset: offset };
  };

  return { t: seg(0, 1), seg, dash };
}
