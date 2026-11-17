/**
 * R366 A5 — the responsive content column (Screen/FormScreen).
 *
 * On ≥600dp windows the body column centres at CONTENT_MAX_WIDTH so Arabic
 * prose keeps its reading measure; `wide` opts out for full-bleed
 * compositions. The paper background stays full-bleed in every mode — only
 * the CONTENT container is capped, which is exactly what these tests pin
 * (the outer View must never receive the cap).
 */
import { render } from "@testing-library/react-native";
import { Dimensions, StyleSheet, Text as RNText } from "react-native";
import { Screen, FormScreen } from "./screen";
import { T } from "./text";

/**
 * RN exports useWindowDimensions through a re-requiring getter, so a
 * jest.spyOn cannot intercept it. The RN jest mock's Dimensions.set IS
 * the injection point the hook reads (probe-verified: 390×844 → compact).
 */
function setWindow(width: number, height: number) {
  Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 } });
}

interface JsonNode {
  type?: string;
  props?: Record<string, unknown>;
  children?: (JsonNode | null)[];
}

/** Collect every node in the rendered tree (host JSON) matching a predicate. */
function collect(root: JsonNode | null, match: (n: JsonNode) => boolean): JsonNode[] {
  const out: JsonNode[] = [];
  const walk = (node: JsonNode | null) => {
    if (!node) return;
    if (match(node)) out.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(root);
  return out;
}

/** Flatten a (possibly array/nested) style prop to a plain object. */
function flat(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
}

describe("Screen — the responsive content column", () => {
  test("compact phones keep the full-width column (no cap, no centering)", async () => {
    setWindow(390, 844);
    const tree = await render(
      <Screen>
        <T>محتوى</T>
      </Screen>,
    );
    const scrolls = collect(tree.toJSON(), (n) => n.type === "RCTScrollView");
    expect(scrolls).toHaveLength(1);
    const style = flat(scrolls[0].props?.contentContainerStyle);
    expect(style.maxWidth).toBeUndefined();
    expect(style.alignSelf).toBeUndefined();
  });

  test("wide windows cap the scroll column at CONTENT_MAX_WIDTH and centre it", async () => {
    setWindow(900, 1280);
    const tree = await render(
      <Screen>
        <T>محتوى</T>
      </Screen>,
    );
    const scrolls = collect(tree.toJSON(), (n) => n.type === "RCTScrollView");
    expect(scrolls).toHaveLength(1);
    const style = flat(scrolls[0].props?.contentContainerStyle);
    expect(style.maxWidth).toBe(640);
    expect(style.alignSelf).toBe("center");
    expect(style.width).toBe("100%");
  });

  test("`wide` opts out of the cap (full-bleed compositions)", async () => {
    setWindow(900, 1280);
    const tree = await render(
      <Screen wide>
        <T>محتوى</T>
      </Screen>,
    );
    const scrolls = collect(tree.toJSON(), (n) => n.type === "RCTScrollView");
    const style = flat(scrolls[0].props?.contentContainerStyle);
    expect(style.maxWidth).toBeUndefined();
  });

  test("the paper ground (root) never carries the cap — only the column does", async () => {
    setWindow(900, 1280);
    const tree = await render(
      <Screen>
        <T>محتوى</T>
      </Screen>,
    );
    const root = tree.toJSON() as JsonNode;
    expect(flat(root.props?.style).maxWidth).toBeUndefined();
    const scroll = collect(root, (n) => n.type === "RCTScrollView")[0];
    expect(flat(scroll.props?.contentContainerStyle).maxWidth).toBe(640);
  });

  test("non-scroll Screens cap the padded column too", async () => {
    setWindow(717, 512); // foldable open
    const tree = await render(
      <Screen scroll={false}>
        <T>محتوى</T>
      </Screen>,
    );
    const root = tree.toJSON() as JsonNode;
    expect(flat(root.props?.style).maxWidth).toBeUndefined();
    const capped = collect(root, (n) => flat(n.props?.style).maxWidth === 640);
    expect(capped).toHaveLength(1);
    expect(flat(capped[0].props?.style).alignSelf).toBe("center");
  });

  test("FormScreen centres the form column on wide windows", async () => {
    setWindow(960, 600); // tablet landscape, short height
    const tree = await render(
      <FormScreen>
        <RNText>نموذج</RNText>
      </FormScreen>,
    );
    const capped = collect(
      tree.toJSON() as JsonNode,
      (n) => flat(n.props?.style).maxWidth === 640,
    );
    expect(capped).toHaveLength(1);
    expect(flat(capped[0].props?.style).alignSelf).toBe("center");
  });

  test("compact phones keep FormScreen full-width", async () => {
    setWindow(360, 640);
    const tree = await render(
      <FormScreen>
        <RNText>نموذج</RNText>
      </FormScreen>,
    );
    const capped = collect(
      tree.toJSON() as JsonNode,
      (n) => flat(n.props?.style).maxWidth === 640,
    );
    expect(capped).toHaveLength(0);
  });
});
