/**
 * R326 M0.4 — the RN <Logo> render net.
 *
 * Geometry parity with the web (mark · lockups · wordmark) is enforced
 * BYTE-level by `npm run tokens:check` — this suite catches the RN
 * renderer, the only platform code: every variant mounts, the lockup
 * canvas math carries over, and the mark's optical hairline ramp (X11)
 * reproduces the web's non-scaling stroke in viewBox units.
 *
 * Assertions walk the public toJSON() tree only (RNTL 14's async
 * render + the serialized host props) — no RNTL internals.
 */
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Logo } from "./Logo";
import { LOCKUP } from "./lockups";
import { markStrokePx } from "./mark";

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

/**
 * react-native-svg serializes colour props in the test tree as processed
 * colour objects ({ payload: 0xAARRGGBB, type: 0 }) — the received run
 * proved it (payload 4280821800 = 0xFF282828). Assert against the same
 * processed form so the pin stays exact.
 */
const processed = (hex: string) => ({ payload: 0xff000000 + Number.parseInt(hex.slice(1), 16), type: 0 });

describe("Logo (the R326 M0.4 RN port)", () => {
  it.each(["lockup", "mark", "wordmark", "stacked"] as const)(
    "renders the %s variant without crashing",
    async (variant) => {
      const tree = await render(<Logo variant={variant} size={32} />);
      expect(tree.toJSON()).not.toBeNull();
    },
  );

  it("lockup width derives from the mark height (the web's LOCKUP canvas math)", async () => {
    const size = 40;
    const expected = +((size * LOCKUP.w) / 32).toFixed(2);
    const { getByTestId, toJSON } = await render(
      <Logo variant="lockup" size={size} testID="logo" />,
    );
    expect(getByTestId("logo")).toBeTruthy();
    // the rendered host carries the canvas dims the web implementation computes
    const widths = collectProp(toJSON(), "width");
    expect(widths).toContain(expected);
  });

  it("mark stroke reproduces the web's non-scaling hairline (X11 ramp, viewBox units)", async () => {
    // at the 32-grid design size the stroke IS the design weight 1.5;
    // at 16 it tapers (markStrokePx) and scales by 32/size in units.
    const at32 = await render(<Logo variant="mark" size={32} />);
    expect(collectProp(at32.toJSON(), "strokeWidth")).toContain(markStrokePx(32));

    const at16 = await render(<Logo variant="mark" size={16} />);
    expect(collectProp(at16.toJSON(), "strokeWidth")).toContain(
      +((markStrokePx(16) * 32) / 16).toFixed(3),
    );
  });

  it("auto tone rides the live palette (light default: charcoal ink · the orange point)", async () => {
    const { toJSON } = await render(<Logo variant="mark" size={32} />);
    expect(collectProp(toJSON(), "stroke")).toContainEqual(processed("#282828")); // the light palette ink
    expect(collectProp(toJSON(), "fill")).toContainEqual(processed("#FA3600")); // the light palette accent — the orange point
  });

  it("tone=ink pins BOTH slots to the brand ink (fixed-ground recipe)", async () => {
    const { toJSON } = await render(<Logo variant="mark" size={32} tone="ink" />);
    expect(collectProp(toJSON(), "stroke")).toContainEqual(processed("#282828"));
    const fills = collectProp(toJSON(), "fill");
    expect(fills).toContainEqual(processed("#282828")); // the point rides the ink too
    expect(fills).not.toContainEqual(processed("#FA3600"));
  });
});
