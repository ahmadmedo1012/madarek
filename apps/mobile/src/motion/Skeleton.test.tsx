/**
 * R334 2-a — Skeleton / SkeletonText net (RNTL).
 *
 * Real react-native-svg subtree + the reanimated mock (useAnimatedStyle
 * evaluates once with sweep=0), so the serialized tree carries the band's
 * REST position — fully clipped past the reading-start edge (LTR: -band px)
 * — plus the processed gradient geometry. That pins the geometry contract;
 * the looping sweep itself is UI-thread work this workspace cannot observe
 * (HONESTY: no device/emulator — jest + mocks only).
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { heron } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { Skeleton, SkeletonText } from "./Skeleton";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

type JsonNode = string | null | { props?: Record<string, unknown>; children?: unknown[] };

/** Every props object in the tree that satisfies `pred`. */
function collectProps(node: JsonNode | JsonNode[], pred: (p: Record<string, unknown>) => boolean): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (n: JsonNode | JsonNode[]) => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n == null || typeof n === "string") return;
    if (n.props && pred(n.props)) out.push(n.props);
    if (Array.isArray(n.children)) n.children.forEach((c) => walk(c as JsonNode));
  };
  walk(node);
  return out;
}

/** First style entry of every node whose style array carries geometry. */
const boneGeometries = (json: unknown) =>
  collectProps(json as JsonNode, (p) => {
    const style = p.style as unknown[] | undefined;
    return Array.isArray(style) && style[0] != null && typeof style[0] === "object" && "height" in (style[0] as object);
  }).map((p) => (p.style as unknown[])[0] as Record<string, unknown>);

const hexToInt = (hex: string) => Number.parseInt(hex.slice(1), 16);

describe("Skeleton", () => {
  it("renders the bone (testID pins the host) with custom radius", async () => {
    const { toJSON } = await render(<Skeleton testID="bone" width={200} height={16} radius={2} />);
    expect(screen.getByTestId("bone")).toBeTruthy();
    const [geo] = boneGeometries(toJSON());
    expect(geo).toBeTruthy();
    expect(geo.width).toBe(200);
    expect(geo.height).toBe(16);
    expect(geo.borderRadius).toBe(2);
  });

  it("numeric width mounts the shimmer sweep (gradient band, clipped off-edge at rest)", async () => {
    const { toJSON } = await render(<Skeleton width={200} height={16} />);
    const geometries = boneGeometries(toJSON());
    expect(geometries).toHaveLength(1); // the bone (the sweep View has no height)
    expect(geometries[0].width).toBe(200);
    expect(geometries[0].height).toBe(16);
    expect(geometries[0].borderRadius).toBe(0);
    // light theme default bone — the hairline tier under paper
    expect(geometries[0].backgroundColor).toBe(heron.light.border);

    // band = max(200 × 0.4, 24) = 80px; at sweep=0 it rests fully clipped
    // past the reading-start edge (LTR under jest): translateX = -80
    expect(JSON.stringify(toJSON())).toContain('"translateX":-80');

    // the sweep highlight is paper (light theme): gradient stops are
    // [offset, color, …] — 0 and 1 carry the paper, 0.5 the 0.9-alpha paper
    const gradients = collectProps(toJSON(), (p) => Array.isArray(p.gradient));
    expect(gradients).toHaveLength(1);
    const gradient = gradients[0].gradient as number[];
    expect(gradient[1]).toBe(hexToInt(heron.light.bg));
    expect(gradient[2]).toBeCloseTo(0.5, 6);
    expect(gradient[5]).toBe(hexToInt(heron.light.bg));
  });

  it("gives every instance a unique gradient id (svg resolves url(#id) globally)", async () => {
    const first = await render(<Skeleton width={100} height={10} />);
    const second = await render(<Skeleton width={100} height={10} />);
    const nameOf = (json: unknown) =>
      collectProps(json as JsonNode, (p) => typeof p.name === "string" && (p.name as string).startsWith("mdrk-skel-")).map((p) => p.name as string);
    const names = [...nameOf(first.toJSON()), ...nameOf(second.toJSON())];
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
  });

  it("static=true drops the sweep entirely (flat, honest bone)", async () => {
    const { toJSON } = await render(<Skeleton width={200} height={16} static />);
    expect(JSON.stringify(toJSON())).not.toContain("RNSVGLinearGradient");
  });

  it("reduced motion drops the sweep too (B2 rule)", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<Skeleton width={200} height={16} />);
    expect(JSON.stringify(toJSON())).not.toContain("RNSVGLinearGradient");
  });
});

describe("SkeletonText", () => {
  it("renders the requested number of lines with a shortened last line", async () => {
    const { toJSON } = await render(<SkeletonText testID="text" lines={3} lineHeight={12} />);
    const bones = boneGeometries(toJSON()).filter((g) => g.height === 12 && g.width !== undefined);
    expect(bones).toHaveLength(3);
    expect(bones[0].width).toBe("100%");
    expect(bones[2].width).toBe("60%"); // lastLineRatio default 0.6
    expect(screen.getByTestId("text")).toBeTruthy();
  });

  it("clamps lines to 1–6 (geometry prop, not a suggestion)", async () => {
    const many = await render(<SkeletonText lines={9} lineHeight={10} />);
    expect(boneGeometries(many.toJSON()).filter((g) => g.height === 10 && g.width !== undefined)).toHaveLength(6);
    const one = await render(<SkeletonText lines={0} lineHeight={10} />);
    expect(boneGeometries(one.toJSON()).filter((g) => g.height === 10 && g.width !== undefined)).toHaveLength(1);
  });

  it("forwards static to every line", async () => {
    const { toJSON } = await render(<SkeletonText lines={2} lineHeight={10} static />);
    expect(JSON.stringify(toJSON())).not.toContain("RNSVGLinearGradient");
  });
});
