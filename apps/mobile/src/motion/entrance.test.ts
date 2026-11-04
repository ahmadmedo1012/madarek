/**
 * R334 2-a — entrance presets net.
 *
 * Runs under the reanimated jest mock (setup.ts): every builder is a
 * BaseAnimationMock instance that chains and returns itself, so the suite
 * pins WHICH builder each factory routes to (the RTL contract), the
 * stagger arithmetic, and the reduced-motion gates — the geometry itself
 * (offsets/easings) is reanimated's, not ours to re-test.
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { I18nManager } from "react-native";
import { FadeIn, FadeInDown, FadeInUp, FadeOut, LinearTransition, SlideInLeft, SlideInRight } from "react-native-reanimated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import {
  enterStagger,
  fadeIn,
  fadeInDown,
  fadeInUp,
  fadeOut,
  heronLayout,
  slideInFromEnd,
  slideInFromStart,
  staggerDelay,
  useEntrance,
  useStaggerEntrance,
} from "./entrance";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

/** Force the reading direction and restore it (I18nManager is module state). */
function withRTL(rtl: boolean, fn: () => void): void {
  const had = Object.getOwnPropertyDescriptor(I18nManager, "isRTL");
  Object.defineProperty(I18nManager, "isRTL", { value: rtl, configurable: true });
  try {
    fn();
  } finally {
    if (had) Object.defineProperty(I18nManager, "isRTL", had);
    else delete (I18nManager as { isRTL?: boolean }).isRTL;
  }
}

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

describe("stagger arithmetic", () => {
  it("steps 60ms per index by default (durations.staggerStep)", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(180);
  });

  it("honours base and step overrides", () => {
    expect(staggerDelay(2, { base: 80, step: 100 })).toBe(280);
  });
});

describe("factories route to the right builders (RTL-aware)", () => {
  it("fade family", () => {
    expect(fadeIn()).toBe(FadeIn);
    expect(fadeInUp()).toBe(FadeInUp);
    expect(fadeInDown()).toBe(FadeInDown);
    expect(fadeOut()).toBe(FadeOut);
  });

  it("heronLayout is the LinearTransition", () => {
    expect(heronLayout()).toBe(LinearTransition);
  });

  it("LTR: reading-start is the LEFT edge", () => {
    withRTL(false, () => {
      expect(slideInFromStart()).toBe(SlideInLeft);
      expect(slideInFromEnd()).toBe(SlideInRight);
    });
  });

  it("RTL (العربية): reading-start flips to the RIGHT edge", () => {
    withRTL(true, () => {
      expect(slideInFromStart()).toBe(SlideInRight);
      expect(slideInFromEnd()).toBe(SlideInLeft);
    });
  });

  it("enterStagger maps every preset name", () => {
    expect(enterStagger(0, { preset: "fade" })).toBe(FadeIn);
    expect(enterStagger(0, { preset: "fadeUp" })).toBe(FadeInUp);
    expect(enterStagger(0, { preset: "fadeDown" })).toBe(FadeInDown);
    withRTL(false, () => {
      expect(enterStagger(0, { preset: "slideStart" })).toBe(SlideInLeft);
    });
  });
});

describe("the reduced-motion gates", () => {
  it("useEntrance returns the builder when motion is allowed", async () => {
    const { result } = await renderHook(() => useEntrance(() => fadeInUp()));
    expect(result.current).toBe(FadeInUp);
  });

  it("useEntrance returns undefined under reduced motion (reanimated = no animation)", async () => {
    mockReduced.mockReturnValue(true);
    const { result } = await renderHook(() => useEntrance(() => fadeInUp()));
    expect(result.current).toBeUndefined();
  });

  it("useStaggerEntrance builds per-child entrances that gate on reduced motion", async () => {
    const { result } = await renderHook(() => useStaggerEntrance({ base: 40, step: 20 }));
    const childEntering = result.current;
    expect(childEntering(1)).toBe(FadeInUp);

    mockReduced.mockReturnValue(true);
    const gated = await renderHook(() => useStaggerEntrance({ base: 40, step: 20 }));
    expect(gated.result.current(1)).toBeUndefined();
  });
});
