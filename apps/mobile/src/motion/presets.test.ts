/**
 * R334 2-a — presets net (pure contract, no renderer).
 *
 * Pins the two layers that must never drift silently:
 *   · every duration that EXISTS in the shared token scale (@/design/tokens,
 *     generated from shared/design-tokens.json) is used verbatim — the
 *     mobile motion scale is a consumer of the shared scale, not a fork;
 *   · the mobile-only additions (exit, shimmer, spin, stagger) stay the
 *     documented values and are flagged in docs/mobile/foundations/motion.md.
 */
import { describe, expect, it } from "@jest/globals";
import { heronEase, motion } from "@/design/tokens";
import { clamp, durations, easings, pressFeedback, springs, timing } from "./presets";

describe("durations — shared token alignment", () => {
  it("uses the shared scale verbatim where it exists", () => {
    expect(durations.micro).toBe(motion.micro); // 80
    expect(durations.fast).toBe(motion.fast); // 200
    expect(durations.base).toBe(motion.base); // 400
    expect(durations.slow).toBe(motion.slow); // 500
    expect(durations.countUp).toBe(motion.slower); // 650
    expect(durations.press).toBe(motion.durationPress); // 120
    expect(durations.entrance).toBe(motion.durationNav); // 240
  });

  it("keeps the shared values the docs promise (guards the token source too)", () => {
    expect(motion.micro).toBe(80);
    expect(motion.fast).toBe(200);
    expect(motion.base).toBe(400);
    expect(motion.slow).toBe(500);
    expect(motion.slower).toBe(650);
  });

  it("defines the mobile-only additions at the documented values", () => {
    expect(durations.exit).toBe(150);
    expect(durations.shimmer).toBe(1400);
    expect(durations.shimmerPause).toBe(300);
    expect(durations.spin).toBe(900);
    expect(durations.staggerStep).toBe(60);
  });

  it("exits always beat entrances", () => {
    expect(durations.exit).toBeLessThan(durations.entrance);
  });
});

describe("easings", () => {
  it("carries the shared heronEase token as the lead curve", () => {
    // the shared source of truth (generated from shared/design-tokens.json)
    expect(heronEase).toEqual([0.23, 1, 0.32, 1]);
    // easings.heron is built from exactly those numbers (EasingFunctionFactory
    // shape — holds under both the real runtime and the jest mock)
    const heron = easings.heron as unknown as { factory?: unknown };
    expect(typeof heron.factory).toBe("function");
  });

  it("exposes the settle/crossfade/loop curves", () => {
    expect(easings.outCubic).toBeTruthy();
    expect(easings.inOutCubic).toBeTruthy();
    expect(easings.linear).toBeTruthy();
  });
});

describe("springs — physical parameters, one per feel", () => {
  it.each(["snappy", "default", "gentle"] as const)("%s is a valid reanimated spring config", (name) => {
    const s = springs[name];
    expect(s.mass).toBeGreaterThan(0);
    expect(s.damping).toBeGreaterThan(0);
    expect(s.stiffness).toBeGreaterThan(0);
    expect(s.overshootClamping).toBe(false);
  });

  it("orders snappy ≤ default ≤ gentle by settle time (damping ratio family)", () => {
    // a rough settle proxy: mass/stiffness × damping — snappy must be fastest
    const settle = (s: (typeof springs)[keyof typeof springs]) => (s.mass / s.stiffness) * s.damping;
    expect(settle(springs.snappy)).toBeLessThanOrEqual(settle(springs.default));
    expect(settle(springs.default)).toBeLessThanOrEqual(settle(springs.gentle));
  });
});

describe("timing / pressFeedback / clamp", () => {
  it("timing() bakes duration + the Heron ease by default", () => {
    const cfg = timing(durations.fast);
    expect(cfg.duration).toBe(200);
    expect(cfg.easing).toBe(easings.heron);
  });

  it("timing() accepts an explicit curve", () => {
    expect(timing(10, easings.linear).easing).toBe(easings.linear);
  });

  it("pressFeedback is the Heron press state (≈0.98 / ≈0.9)", () => {
    expect(pressFeedback.scale).toBeCloseTo(0.98);
    expect(pressFeedback.opacity).toBeCloseTo(0.9);
  });

  it("clamps without the worklet util", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
