/**
 * T-50 — BidiText net: mixed-direction isolation (review-2 P0-1).
 *
 * Contracts:
 *   · Arabic prose passes through byte-identical (no wrapping).
 *   · Boundary Latin runs («SE301» after «· », «Use Case» after «—») seat
 *     in nested <Text> nodes carrying the ltrText island style.
 *   · Digit-only runs (times «10:30», percentages) stay inline — digits
 *     carry no strong direction (type.ts policy).
 *   · Non-string children render untouched.
 */
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { BidiText, isolateLatinRuns } from "./text";

type JsonNode = string | null | { props?: Record<string, unknown>; children?: unknown[] };

function stringsOf(node: JsonNode | JsonNode[], out: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((n) => stringsOf(n as JsonNode, out));
    return out;
  }
  if (node == null) return out;
  if (typeof node === "string") {
    out.push(node);
    return out;
  }
  // React elements (pre-serialization) keep text in props.children.
  if (node.props && node.props.children !== undefined) {
    stringsOf(node.props.children as unknown as JsonNode, out);
  }
  // Serialized JSON nodes keep text in a children array.
  stringsOf((node.children ?? []) as JsonNode[], out);
  return out;
}

/** Count nodes carrying the ltrText island style (writingDirection: "ltr"). */
function islandCount(node: JsonNode | JsonNode[]): number {
  return JSON.stringify(node).split('"writingDirection":"ltr"').length - 1;
}

/** Count island elements in an isolateLatinRuns result (objects, not strings). */
function islandElements(out: ReturnType<typeof isolateLatinRuns>): number {
  return out.filter((n) => typeof n !== "string").length;
}

describe("isolateLatinRuns", () => {
  it("keeps pure Arabic byte-identical (no islands)", () => {
    const out = isolateLatinRuns("د. سلام البوسعيدي");
    expect(stringsOf(out as unknown as JsonNode[]).join("")).toBe("د. سلام البوسعيدي");
    expect(islandElements(out)).toBe(0);
  });

  it("isolates a trailing Latin code after a neutral separator", () => {
    const out = isolateLatinRuns("د. سلام · SE301");
    expect(stringsOf(out as unknown as JsonNode[]).join("")).toBe("د. سلام · SE301");
    expect(islandElements(out)).toBe(1);
  });

  it("isolates a mid-string Latin pair around a dash", () => {
    const out = isolateLatinRuns("مخططات UML — Use Case");
    expect(stringsOf(out as unknown as JsonNode[]).join("")).toBe("مخططات UML — Use Case");
    expect(islandElements(out)).toBe(3); // UML · Use · Case (space breaks the run)
  });

  it("leaves digit-only runs inline (no strong direction)", () => {
    const out = isolateLatinRuns("المحاضرة 12 · 10:30–11:45");
    expect(islandElements(out)).toBe(0);
  });
});

describe("BidiText", () => {
  it("renders mixed copy verbatim with one LTR island", async () => {
    const { toJSON } = await render(<BidiText>{"د. سلام · SE301"}</BidiText>);
    const tree = toJSON();
    expect(tree).not.toBeNull();
    expect(stringsOf(tree!).join("")).toBe("د. سلام · SE301");
    expect(islandCount(tree!)).toBeGreaterThanOrEqual(1);
  });

  it("passes non-string children through untouched", async () => {
    const { toJSON } = await render(
      <BidiText>
        <Text>سلام</Text>
      </BidiText>,
    );
    const tree = toJSON();
    expect(stringsOf(tree!).join("")).toBe("سلام");
    expect(islandCount(tree!)).toBe(0); // nothing added by BidiText
  });
});
