/**
 * master-B2 — the ui/brand.tsx render net (BrandMark).
 *
 * The chrome mark's geometry is pinned to @/brand/mark (the R323 single
 * source of truth, the same constants <Logo> renders). This suite
 * catches the two geometry bugs the ad-hoc port shipped with:
 *  · double-scaling — coordinates pre-multiplied by size/32 ON TOP of
 *    the viewBox mapping, shrinking the mark toward the top-left corner
 *    and clipping it at the 72 px launch seat;
 *  · the skewed diamond — the path template scaled only the extremes
 *    while the centre coords stayed literal, rendering a ~2:1 rhombus
 *    at every size ≠ 32;
 * plus the optical stroke ramp (the fixed strokeWidth={1} that ignored
 * the X11 taper).
 *
 * Assertions walk the public toJSON() tree only (RNTL 14's async
 * render + the serialized host props) — no RNTL internals, mirroring
 * src/brand/Logo.test.tsx.
 */
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { BrandLockup, BrandMark } from "./brand";
import {
  MARK_AXIS,
  MARK_DIAMOND_PATH,
  MARK_POINT,
  MARK_VIEWBOX,
  markStrokePx,
} from "@/brand/mark";

/** A toJSON() node (string | null | { props, children }). */
type JsonNode = string | null | { props?: Record<string, unknown>; children?: unknown[] };

/** Collect a prop from every node in the serialized tree. */
function collectProp(node: JsonNode | JsonNode[], prop: string): unknown[] {
  const out: unknown[] = [];
  const walk = (n: JsonNode | JsonNode[]) => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n == null || typeof n === "string") return;
    const value = n.props?.[prop];
    if (value !== undefined) out.push(value);
    if (Array.isArray(n.children)) n.children.forEach((c) => walk(c as JsonNode));
  };
  walk(node);
  return out;
}

/** True when some node in the tree satisfies the predicate over its props. */
function hasNode(node: JsonNode | JsonNode[], pred: (props: Record<string, unknown>) => boolean): boolean {
  const walk = (n: JsonNode | JsonNode[]): boolean => {
    if (Array.isArray(n)) return n.some(walk);
    if (n == null || typeof n === "string") return false;
    if (n.props && pred(n.props)) return true;
    return Array.isArray(n.children) && n.children.some((c) => walk(c as JsonNode));
  };
  return walk(node);
}

/**
 * react-native-svg serializes colour props in the test tree as processed
 * colour objects ({ payload: 0xAARRGGBB, type: 0 }) — assert against the
 * same processed form so the pin stays exact (see Logo.test.tsx).
 */
const processed = (hex: string) => ({ payload: 0xff000000 + Number.parseInt(hex.slice(1), 16), type: 0 });

/** The live chrome seats (AppTopBar 26 · auth 20/40/48 · select-institution 32 · owner 44 · not-found 56 · launch 72). */
const SEATS = [20, 26, 32, 72] as const;

describe("BrandMark (the chrome mark pinned to @/brand/mark)", () => {
  it.each(SEATS)("renders the 32-grid verbatim at size %i (no scale multiplication)", async (size) => {
    const { toJSON } = await render(<BrandMark size={size} />);
    const tree = toJSON();
    expect(tree).not.toBeNull();

    // the canvas rides the shared viewBox (MARK_VIEWBOX) — react-native-svg
    // serializes it onto the host as minX/minY/vbWidth/vbHeight
    // (src/lib/extract/extractViewBox.ts), so the pin is exact.
    const [minX, minY, vbW, vbH] = MARK_VIEWBOX.trim().split(/\s+/).map(Number);
    expect(collectProp(tree, "minX")).toContain(minX);
    expect(collectProp(tree, "minY")).toContain(minY);
    expect(collectProp(tree, "vbWidth")).toContain(vbW);
    expect(collectProp(tree, "vbHeight")).toContain(vbH);
    expect(collectProp(tree, "width")).toContain(size); // px canvas = size

    // the diamond is MARK_DIAMOND_PATH verbatim — a pre-scaled copy
    // would distort the string at every size ≠ 32 (the rhombus bug).
    expect(collectProp(tree, "d")).toContain(MARK_DIAMOND_PATH);

    // the axis square and the point sit at their grid seats, in grid units.
    expect(
      hasNode(
        tree,
        (props) =>
          props.x === MARK_AXIS.x && props.y === MARK_AXIS.y &&
          props.width === MARK_AXIS.size && props.height === MARK_AXIS.size,
      ),
    ).toBe(true);
    expect(
      hasNode(
        tree,
        (props) =>
          props.x === MARK_POINT.x && props.y === MARK_POINT.y &&
          props.width === MARK_POINT.size && props.height === MARK_POINT.size,
      ),
    ).toBe(true);

    // NO scale artifact: every coordinate prop stays inside the 32-grid
    // (the old size/32 multiplication pushed the 72 px seat to 18..36+).
    for (const axis of ["x", "y"] as const) {
      for (const value of collectProp(tree, axis)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(32);
      }
    }
  });

  it.each(SEATS)("rides the X11 optical ramp at size %i (viewBox-units hairline)", async (size) => {
    const { toJSON } = await render(<BrandMark size={size} />);
    // RN svg has no vector-effect:non-scaling-stroke — the screen-px ramp
    // converts to viewBox units exactly the way <Logo> does it.
    expect(collectProp(toJSON(), "strokeWidth")).toContain(
      +((markStrokePx(size) * 32) / size).toFixed(3),
    );
  });

  it("hairlines: miter joins, no fills except the point", async () => {
    const { toJSON } = await render(<BrandMark size={32} />);
    const tree = toJSON();
    // react-native-svg serializes strokeLinejoin onto the host as the
    // numeric enum (miter=0 · round=1 · bevel=2).
    const joins = collectProp(tree, "strokeLinejoin");
    expect(joins).toContain(0);
    expect(joins).not.toContain(1);
    expect(joins).not.toContain(2);
    // the accent is painted EXACTLY once — on the point, at its grid seat.
    // Every other fill in the serialized tree is a hairline placeholder
    // (react-native-svg renders G fill="none" as a null/default brush the
    // group's propList overrides at native draw time — see extractFill).
    const accentFill = processed("#FA3600");
    const isFill = (v: unknown, payload: number) =>
      typeof v === "object" && v !== null && (v as { payload?: number }).payload === payload;
    expect(collectProp(tree, "fill").filter((v) => isFill(v, accentFill.payload))).toHaveLength(1);
    expect(
      hasNode(
        tree,
        (props) =>
          props.x === MARK_POINT.x && props.y === MARK_POINT.y &&
          props.width === MARK_POINT.size && props.height === MARK_POINT.size &&
          isFill(props.fill, accentFill.payload),
      ),
    ).toBe(true);
  });

  it("auto tone rides the live palette (light default: ink hairlines · orange point)", async () => {
    const { toJSON } = await render(<BrandMark size={32} />);
    expect(collectProp(toJSON(), "stroke")).toContainEqual(processed("#282828"));
    expect(collectProp(toJSON(), "fill")).toContainEqual(processed("#FA3600"));
  });

  it("keeps the ink/orange override props (the same color derivation contract)", async () => {
    const { toJSON } = await render(<BrandMark size={32} ink="#123456" orange="#654321" />);
    expect(collectProp(toJSON(), "stroke")).toContainEqual(processed("#123456"));
    expect(collectProp(toJSON(), "fill")).toContainEqual(processed("#654321"));
  });

  it("forwards testID to the svg canvas", async () => {
    const { getByTestId } = await render(<BrandMark size={32} testID="brand-mark" />);
    expect(getByTestId("brand-mark")).toBeTruthy();
  });
});

describe("BrandLockup (mark + wordmark row)", () => {
  it("composes the mark with «مدارك» without crashing", async () => {
    const { toJSON, getByText } = await render(<BrandLockup size={28} />);
    expect(toJSON()).not.toBeNull();
    expect(getByText("مدارك")).toBeTruthy();
  });
});
