/**
 * R334 2-a — RingProgress net (RNTL).
 *
 * Real react-native-svg subtree + the reanimated mock (createAnimatedComponent
 * is identity): the arc Circle's geometry serializes fully — r/cx/cy,
 * stroke colors (processed), the dash array spanning the circumference, the
 * -90° start-rotation matrix, and (indeterminate) the static 25% arc offset.
 * The determinate dash-offset/progress motion is UI-thread work driven
 * through animatedProps, which the mock evaluates but the svg host does not
 * serialize — NOT observable here (HONESTY: jest + mocks, no device).
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { heron } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { RingProgress } from "./RingProgress";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

/** svg serializes colour props as { payload: 0xAARRGGBB, type: 0 } (see Logo.test). */
const processed = (hex: string) => ({ payload: 0xff000000 + Number.parseInt(hex.slice(1), 16), type: 0 });

type JsonNode = string | null | { props?: Record<string, unknown>; children?: unknown[] };

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

const SIZE = 48;
const THICKNESS = 4;
const RADIUS = (SIZE - THICKNESS) / 2; // 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Every circle host — pinned by the r prop. */
const circles = (json: unknown) => collectProps(json as JsonNode, (p) => p.r === RADIUS);
/** The drawn arc — the only circle with a dash array. */
const arcCircle = (json: unknown) => circles(json).find((c) => Array.isArray(c.strokeDasharray));

describe("RingProgress — determinate", () => {
  it("renders track + arc with the right geometry and theme colors", async () => {
    const { toJSON } = await render(<RingProgress progress={0.5} size={SIZE} thickness={THICKNESS} testID="ring" />);
    expect(screen.getByTestId("ring").props.accessibilityRole).toBe("progressbar");
    const all = circles(toJSON());
    expect(all).toHaveLength(2); // track + arc
    // light theme: hairline track, accent arc
    const strokes = all.map((c) => c.stroke);
    expect(strokes).toContainEqual(processed(heron.light.border));
    expect(strokes).toContainEqual(processed(heron.light.accent));
    // every circle: centered, hairline stroke, hollow, arc starts at 12 o'clock
    for (const c of all) {
      expect(c.cx).toBe(SIZE / 2);
      expect(c.cy).toBe(SIZE / 2);
      expect(c.strokeWidth).toBe(THICKNESS);
      expect(c.fill).toBeNull(); // "none"
      // svg serializes transform="rotate(-90 24 24)" as its rotation matrix
      const m = c.matrix as number[];
      expect(m[1]).toBeCloseTo(-1, 6);
      expect(m[2]).toBeCloseTo(1, 6);
      expect(m[4]).toBeCloseTo(0, 6);
      expect(m[5]).toBeCloseTo(SIZE, 6);
    }
  });

  it("the arc dash array spans the full circumference (offset motion is UI-thread)", async () => {
    const { toJSON } = await render(<RingProgress progress={0.5} size={SIZE} thickness={THICKNESS} />);
    const arc = arcCircle(toJSON());
    expect(arc).toBeTruthy();
    const dash = arc?.strokeDasharray as string[];
    expect(Number(dash[0])).toBeCloseTo(CIRCUMFERENCE, 6);
    expect(Number(dash[1])).toBeCloseTo(CIRCUMFERENCE, 6);
  });

  it("centers children inside the ring", async () => {
    await render(
      <RingProgress progress={0.5} size={SIZE} thickness={THICKNESS} testID="ring">
        <Text>٥٠٪</Text>
      </RingProgress>,
    );
    expect(screen.getByText("٥٠٪")).toBeTruthy();
  });

  it("renders without crashing under reduced motion (instant final value)", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<RingProgress progress={0.75} size={SIZE} thickness={THICKNESS} />);
    expect(circles(toJSON())).toHaveLength(2);
  });
});

describe("RingProgress — indeterminate", () => {
  it("draws the fixed 25% arc (dash offset = 75% of the circumference)", async () => {
    const { toJSON } = await render(<RingProgress progress={0} indeterminate size={SIZE} thickness={THICKNESS} testID="ring" />);
    const arc = arcCircle(toJSON());
    expect(arc?.strokeDashoffset).toBeCloseTo(CIRCUMFERENCE * 0.75, 6);
    expect(screen.getByTestId("ring").props.accessibilityLabel).toBe("جارٍ التحميل…");
  });

  it("mounts the spin transform (rotate loop) when motion is allowed", async () => {
    const { toJSON } = await render(<RingProgress progress={0} indeterminate size={SIZE} thickness={THICKNESS} />);
    // the spin style's first frame: rotate 0deg
    expect(JSON.stringify(toJSON())).toContain('"rotate":"0deg"');
  });

  it("reduced motion freezes the ring — no spin transform (B2 rule)", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<RingProgress progress={0} indeterminate size={SIZE} thickness={THICKNESS} />);
    expect(JSON.stringify(toJSON())).not.toContain('"rotate":"0deg"');
  });
});

describe("RingProgress — custom colors", () => {
  it("honours color/trackColor overrides", async () => {
    const { toJSON } = await render(
      <RingProgress progress={1} size={SIZE} thickness={THICKNESS} color="#123456" trackColor="#654321" />,
    );
    const strokes = circles(toJSON()).map((c) => c.stroke);
    expect(strokes).toContainEqual(processed("#123456"));
    expect(strokes).toContainEqual(processed("#654321"));
  });
});
