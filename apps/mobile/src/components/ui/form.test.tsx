/**
 * R334 B5 — the FormScreen pattern net (colocated).
 *
 * Pins the new ./form.tsx contracts:
 *   · FormScreen renders children + the primary action, keyboard-aware
 *     (react-native-keyboard-controller mocked as pass-throughs — the
 *     render net proves screens don't crash, not that pixels track);
 *   · the async submit flow: single-flight while busy, thrown Arabic
 *     errors surface in the summary banner (alert role);
 *   · the accessory toolbar renders the Arabic labels «السابق/التالي/تم»;
 *   · useFormValidation: Arabic zod messages, touched/onBlur semantics,
 *     handleSubmit gating;
 *   · react-hook-form compatibility: a Controller-driven <Field> submits.
 *
 * Assertions walk the public query tree only.
 */
import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormScreen, ar, useFormValidation } from "./form";
import { Field, SecretField } from "./fields";
import { T } from "./text";

/* ── keyboard-controller: full pass-through mock (supersedes the setup
      stub for this suite — adds KeyboardAwareScrollView/StickyView) ── */
jest.mock("react-native-keyboard-controller", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load React lazily (jest hoists the mock above real imports)
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load RN primitives lazily (jest hoists the mock above real imports)
  const RN = require("react-native");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children ?? null);
  return {
    KeyboardProvider: Passthrough,
    KeyboardAvoidingView: Passthrough,
    // the real component forwards ScrollViewProps to an animated ScrollView
    KeyboardAwareScrollView: (props: Record<string, unknown>) =>
      React.createElement(RN.ScrollView, props),
    KeyboardStickyView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      React.createElement(RN.View, rest, children),
    KeyboardToolbar: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(RN.View, { testID: "kb-toolbar" }, children ?? null),
      {
        Background: () => null,
        Content: ({ children }: { children?: React.ReactNode }) => children ?? null,
        Prev: ({ children }: { children?: React.ReactNode }) =>
          React.createElement(RN.View, { testID: "kb-prev" }, children ?? null),
        Next: ({ children }: { children?: React.ReactNode }) =>
          React.createElement(RN.View, { testID: "kb-next" }, children ?? null),
        Done: ({ text }: { text?: React.ReactNode }) =>
          React.createElement(RN.View, { testID: "kb-done" }, text ?? null),
        Group: () => null,
      },
    ),
    useKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }),
    useKeyboardState: () => ({ isVisible: false, height: 0 }),
  };
});

const SCHEMA = z.object({
  email: ar.email(),
  password: ar.required(),
});

describe("FormScreen — the keyboard-aware form container", () => {
  it("renders children, the primary action, and the Arabic toolbar labels", async () => {
    const tree = await render(
      <FormScreen onSubmit={() => undefined} submitLabel="دخول">
        <Field label="البريد الإلكتروني" purpose="email" testID="email" />
        <SecretField label="كلمة المرور" testID="pw" />
      </FormScreen>,
    );
    expect(tree.getByText("دخول")).toBeTruthy();
    expect(tree.getByTestId("email")).toBeTruthy();
    // the accessory toolbar vocabulary
    expect(tree.getByText("السابق")).toBeTruthy();
    expect(tree.getByText("التالي")).toBeTruthy();
    expect(tree.getByText("تم")).toBeTruthy();
  });

  it("single-flights the async submit while busy", async () => {
    let release: (() => void) | undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const tree = await render(
      <FormScreen onSubmit={onSubmit} submitLabel="حفظ">
        <Field label="الاسم" testID="name" />
      </FormScreen>,
    );
    const button = tree.getByRole("button", { name: "حفظ" });
    await fireEvent.press(button);
    await fireEvent.press(button); // still busy — must not double-submit
    expect(onSubmit).toHaveBeenCalledTimes(1);
    release!();
    await waitFor(() => expect(tree.getByRole("button", { name: "حفظ" })).toBeTruthy());
  });

  it("surfaces a thrown Arabic error in the alert-role summary banner", async () => {
    const onSubmit = jest.fn(() => Promise.reject(new Error("تعذّر الاتصال بالخادم.")));
    const tree = await render(
      <FormScreen onSubmit={onSubmit} submitLabel="إرسال">
        <Field label="الملاحظة" testID="note" />
      </FormScreen>,
    );
    await fireEvent.press(tree.getByRole("button", { name: "إرسال" }));
    await waitFor(() => expect(tree.getByText("تعذّر الاتصال بالخادم.")).toBeTruthy());
    // the alert role sits on the banner row wrapping the message
    expect(tree.getByText("تعذّر الاتصال بالخادم.").parent?.props.accessibilityRole).toBe("alert");
  });

  it("renders a prop-driven error and success note", async () => {
    const errTree = await render(
      <FormScreen onSubmit={() => undefined} submitLabel="دخول" error="محاولات دخول كثيرة — انتظر قليلًا.">
        <Field label="البريد" testID="e" />
      </FormScreen>,
    );
    expect(errTree.getByText("محاولات دخول كثيرة — انتظر قليلًا.")).toBeTruthy();

    const okTree = await render(
      <FormScreen onSubmit={() => undefined} submitLabel="حفظ" success="تم الحفظ.">
        <Field label="البريد" testID="e" />
      </FormScreen>,
    );
    expect(okTree.getByText("تم الحفظ.")).toBeTruthy();
  });
});

describe("useFormValidation — the Arabic zod adapter", () => {
  it("produces the shared Arabic messages", async () => {
    const { result } = await renderHook(() => useFormValidation({ schema: SCHEMA }));
    // empty submit → per-field Arabic errors (act flushes the state writes)
    let ok = true;
    await act(async () => {
      ok = result.current.validateAll();
    });
    expect(ok).toBe(false);
    expect(result.current.errors.email).toBe("هذا الحقل مطلوب");
    expect(result.current.errors.password).toBe("هذا الحقل مطلوب");

    // bad email → format message; valid email clears (separate act ticks —
    // a blur validates the value from the last committed render, exactly
    // like the real event order: type, render, then blur)
    await act(async () => {
      result.current.setValue("email", "not-an-email");
    });
    await act(async () => {
      result.current.blur("email");
    });
    expect(result.current.errorFor("email")).toBe("بريد إلكتروني غير صالح");
    await act(async () => {
      result.current.setValue("email", "student@test.ly");
    });
    expect(result.current.errorFor("email")).toBeUndefined();
  });

  it("hides field errors until the field is touched or submitted", async () => {
    const { result } = await renderHook(() => useFormValidation({ schema: SCHEMA }));
    await act(async () => {
      result.current.setValue("email", "not-an-email");
    });
    // typed but never blurred → silent
    expect(result.current.errorFor("email")).toBeUndefined();
    await act(async () => {
      result.current.blur("email");
    });
    expect(result.current.errorFor("email")).toBe("بريد إلكتروني غير صالح");
  });

  it("min/max fallbacks arabize plain zod schemas", async () => {
    const schema = z.object({ name: z.string().min(3), age: z.number().min(12) });
    const { result } = await renderHook(() => useFormValidation({ schema }));
    await act(async () => {
      result.current.setValue("name", "ab");
    });
    await act(async () => {
      result.current.blur("name");
    });
    expect(result.current.errorFor("name")).toBe("يجب أن يكون 3 حرفًا على الأقل");

    // a below-min number (not a missing one) reads the numeric min message
    await act(async () => {
      result.current.setValue("age", 5);
    });
    let ok = true;
    await act(async () => {
      ok = result.current.validateAll();
    });
    expect(ok).toBe(false);
    expect(result.current.errors.age).toBe("يجب أن يكون 12 على الأقل");
  });

  it("handleSubmit gates the callback on validity", async () => {
    const { result } = await renderHook(() => useFormValidation({ schema: SCHEMA }));
    const fn = jest.fn<(values: Record<string, unknown>) => void>();
    await act(async () => {
      await result.current.handleSubmit(fn)(); // invalid → not called
    });
    expect(fn).not.toHaveBeenCalled();

    await act(async () => {
      result.current.setValue("email", "student@test.ly");
      result.current.setValue("password", "12345678");
    });
    await act(async () => {
      await result.current.handleSubmit(fn)();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toEqual({ email: "student@test.ly", password: "12345678" });
  });
});

describe("FormScreen × react-hook-form (Controller — the RN pattern)", () => {
  it("binds a Controller-driven <Field> and submits the typed value", async () => {
    function Harness() {
      const { control, handleSubmit } = useForm<{ email: string }>();
      const [out, setOut] = useState<string | null>(null);
      return (
        <FormScreen
          onSubmit={handleSubmit((v) => setOut(v.email))}
          submitLabel="أرسل"
        >
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Field
                label="البريد الإلكتروني"
                testID="rhf-email"
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {out ? <T testID="rhf-out">{out}</T> : null}
        </FormScreen>
      );
    }
    const tree = await render(<Harness />);
    await fireEvent.changeText(tree.getByTestId("rhf-email"), "student@test.ly");
    await fireEvent.press(tree.getByRole("button", { name: "أرسل" }));
    await waitFor(() => expect(tree.getByTestId("rhf-out").props.children).toBe("student@test.ly"));
  });
});
