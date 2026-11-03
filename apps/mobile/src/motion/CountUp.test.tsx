/**
 * R334 2-a — CountUp net (RNTL).
 *
 * jest runs on the native platform branch (Platform.OS === "ios" under
 * jest-expo): the reanimated mock evaluates useAnimatedProps once with the
 * shared value at rest (0), so the serialized TextInput carries the FIRST
 * FRAME ("0") while the a11y label carries the FINAL value — the exact
 * contract: sighted users see the count, screen-reader users get the result
 * instantly. Reduced motion renders the final value synchronously.
 *
 * HONESTY: jest + mocks — UI-thread frame fidelity is not observable here.
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { CountUp } from "./CountUp";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

/** Arabic-Indic numerals — the user-facing face for عربية screens. */
const arabicDigits = (n: number): string => new Intl.NumberFormat("ar-EG").format(Math.round(n));

describe("CountUp", () => {
  it("mounts the animated-counter branch with the final value as its a11y name", async () => {
    await render(<CountUp value={42} testID="count" />);
    const el = screen.getByTestId("count");
    // a11y never sits through the count — the label is the FINAL value
    expect(el.props.accessibilityLabel).toBe("42");
    // native branch: the first frame renders formatter(0)
    if (Platform.OS !== "web") {
      expect(el.props.defaultValue).toBe("0");
    }
  });

  it("reduced motion renders the final value instantly, as plain text", async () => {
    mockReduced.mockReturnValue(true);
    await render(<CountUp value={42} testID="count" />);
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByTestId("count").props.accessibilityLabel).toBe("42");
  });

  it("shapes output through the formatter (Arabic-Indic numerals)", async () => {
    mockReduced.mockReturnValue(true);
    await render(<CountUp value={42} formatter={arabicDigits} testID="count" />);
    expect(screen.getByText("٤٢")).toBeTruthy();
    expect(screen.getByTestId("count").props.accessibilityLabel).toBe("٤٢");
  });

  it("respects a custom accessibilityLabel (user-facing العربية)", async () => {
    mockReduced.mockReturnValue(true);
    await render(<CountUp value={42} accessibilityLabel="اثنان وأربعون درسًا" testID="count" />);
    expect(screen.getByTestId("count").props.accessibilityLabel).toBe("اثنان وأربعون درسًا");
  });

  it("rounds with the default formatter", async () => {
    mockReduced.mockReturnValue(true);
    await render(<CountUp value={41.6} testID="count" />);
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders zero and clamped-up negative values without crashing", async () => {
    mockReduced.mockReturnValue(true);
    const { rerender } = await render(<CountUp value={0} testID="count" />);
    expect(screen.getByText("0")).toBeTruthy();
    await rerender(<CountUp value={-7} testID="count" />);
    expect(screen.getByText("-7")).toBeTruthy();
  });
});
