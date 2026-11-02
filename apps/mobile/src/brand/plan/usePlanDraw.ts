/**
 * usePlanDraw — the ONE progressive-draw engine of the plan library.
 *
 * A single plain progress number 0→1 drives every stroke reveal
 * through strokeDasharray/strokeDashoffset. The value is consumed
 * three ways:
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
 * The number is driven by requestAnimationFrame + React state on
 * purpose: react-native-svg's published types expose no Animated
 * member, and the draw is a one-shot 900ms reveal of a static sheet —
 * a per-frame state render of pure SVG props is the honest, typed
 * engine (no Animated seam to hold).
 */
import { useEffect, useState } from "react";
import { Easing } from "react-native";
import { heronEase, motion } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import type { PlanDash, PlanDrawHandle } from "./types";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** The Heron ease-out as a pure curve — the same solver RN's Animated driver runs. */
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
  const [value, setValue] = useState<number>(() =>
    controlled ? clamp01(progress as number) : autoplay && !reduced ? 0 : 1,
  );

  useEffect(() => {
    if (controlled) {
      setValue(clamp01(progress as number));
      return;
    }
    if (!autoplay || reduced) {
      setValue(1);
      return;
    }
    let raf = 0;
    let start = 0;
    setValue(0);
    const tick = (now: number) => {
      if (!start) start = now;
      const lin = clamp01((now - start) / durationMs);
      setValue(heronBezier(lin));
      if (lin < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controlled, progress, autoplay, reduced, durationMs]);

  /** Clamped sub-range of the eased progress — RN interpolate([a,b]→[0,1]) semantics. */
  const seg = (a: number, b: number): number => {
    if (b <= a) return value >= b ? 1 : 0;
    return clamp01((value - a) / (b - a));
  };

  const dash = (len: number, phase?: number): PlanDash => {
    const p = phase ?? seg(0, 1);
    return { strokeDasharray: len, strokeDashoffset: len * (1 - p) };
  };

  return { t: seg(0, 1), seg, dash };
}
