/**
 * R334 2-a — PressableScale net (RNTL).
 *
 * Runs under the reanimated jest mock (setup.ts): createAnimatedComponent is
 * identity and useAnimatedStyle evaluates once with the shared values at
 * rest, so the serialized tree carries the REST state of the animated style
 * (identity scale/opacity) — exactly the no-op contract reduced motion and
 * disabled must preserve. Press interaction goes through RNTL userEvent,
 * which drives RN's real pressability responder chain.
 *
 * HONESTY: this is jest + mocks — it proves prop forwarding, handler
 * forwarding and the rest-frame style contract. Frame-accurate UI-thread
 * animation is NOT verifiable here (no device/emulator in this workspace).
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { render, userEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ReactNode } from "react";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { PressableScale } from "./PressableScale";

jest.mock("@/hooks/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduced = useReduceMotion as jest.Mock;

beforeEach(() => {
  mockReduced.mockReturnValue(false);
});

function Fixture(props: { children?: ReactNode; label?: string }): ReactNode {
  return (
    <PressableScale testID="scale" accessibilityRole="button" accessibilityLabel="افتح الدرس" {...props}>
      {props.children}
    </PressableScale>
  );
}

const content = <Text>محتوى</Text>;

describe("PressableScale", () => {
  it("renders children and forwards Pressable props (role, label)", async () => {
    await render(<Fixture>{content}</Fixture>);
    expect(screen.getByRole("button", { name: "افتح الدرس" })).toBeTruthy();
    expect(screen.getByText("محتوى")).toBeTruthy();
  });

  it("rests at identity — scale 1, opacity 1 (the no-op baseline)", async () => {
    const { toJSON } = await render(<Fixture>{content}</Fixture>);
    const styles = JSON.stringify(toJSON());
    // the evaluated animated style carries scale 1 / opacity 1 at rest
    expect(styles).toContain('"scale":1');
    expect(styles).toContain('"opacity":1');
  });

  it("drives the full press cycle through RN pressability (in → out → press)", async () => {
    const onPress = jest.fn();
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    const { getByTestId } = await render(
      <PressableScale testID="scale" onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <></>
      </PressableScale>,
    );
    const user = userEvent.setup();
    await user.press(getByTestId("scale"));
    expect(onPressIn).toHaveBeenCalled();
    expect(onPressOut).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });

  it("still rests at identity under reduced motion (B2 rule)", async () => {
    mockReduced.mockReturnValue(true);
    const { toJSON } = await render(<Fixture>{content}</Fixture>);
    const styles = JSON.stringify(toJSON());
    expect(styles).toContain('"scale":1');
    expect(styles).toContain('"opacity":1');
  });

  it("forwards user handlers under reduced motion (motion degrades, taps never do)", async () => {
    mockReduced.mockReturnValue(true);
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <PressableScale testID="scale" onPress={onPress}>
        <></>
      </PressableScale>,
    );
    const user = userEvent.setup();
    await user.press(getByTestId("scale"));
    expect(onPress).toHaveBeenCalled();
  });

  it("disabled presses never fire onPress (and render identity)", async () => {
    const onPress = jest.fn();
    const { getByTestId, toJSON } = await render(
      <PressableScale testID="scale" disabled onPress={onPress}>
        <></>
      </PressableScale>,
    );
    const user = userEvent.setup();
    await user.press(getByTestId("scale"));
    expect(onPress).not.toHaveBeenCalled();
    expect(JSON.stringify(toJSON())).toContain('"scale":1');
  });
});
