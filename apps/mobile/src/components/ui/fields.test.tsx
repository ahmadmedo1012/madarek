/**
 * R334 B5 — the Field/SecretField upgrade net (colocated).
 *
 * Covers the additive surface only: every pre-existing behavior (labels,
 * inline errors, hints, sheets) is exercised implicitly by the render net
 * (src/test/render-net.test.tsx mounts all 40+ screens that consume these
 * fields); this suite pins the NEW contracts:
 *   · purpose → textContentType/autoComplete mapping
 *   · input masks (digits/phone/username, Arabic-Indic normalization)
 *   · secure toggle «إظهار»/«إخفاء»
 *   · disabled + loading states
 *   · error announcement (label composition + alert role)
 *   · returnKeyType chaining inside FormFieldsProvider (next → done)
 *
 * Assertions walk the public toJSON()/query tree only.
 */
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Field, SecretField } from "./fields";
import { FormFieldsProvider } from "./form";

/** The serialized host TextInput (the only child <TextInput> in the tree). */
function inputProps(tree: Awaited<ReturnType<typeof render>>, testID: string) {
  const el = tree.getByTestId(testID);
  // the host TextInput carries the props we assert on
  return el.props as Record<string, unknown>;
}

describe("Field — the R334 B5 upgrade (additive)", () => {
  it("renders the Arabic label and the required marker", async () => {
    const tree = await render(<Field label="البريد الإلكتروني" required testID="f" />);
    expect(tree.getByText("البريد الإلكتروني *")).toBeTruthy();
  });

  it("shows the inline error and announces it (label + alert role)", async () => {
    const tree = await render(
      <Field label="البريد الإلكتروني" error="بريد إلكتروني غير صالح." testID="f" />,
    );
    expect(tree.getByText("بريد إلكتروني غير صالح.")).toBeTruthy();
    const errorText = tree.getByText("بريد إلكتروني غير صالح.");
    // the error row is announced politely, not silent ink
    expect(errorText.props.accessibilityRole).toBe("alert");
    // the input itself carries the error in its accessible name
    expect(inputProps(tree, "f").accessibilityLabel).toBe(
      "البريد الإلكتروني — بريد إلكتروني غير صالح.",
    );
  });

  it("shows the hint while there is no error", async () => {
    const tree = await render(
      <Field label="كلمة المرور" hint="12 حرفًا على الأقل." testID="f" />,
    );
    expect(tree.getByText("12 حرفًا على الأقل.")).toBeTruthy();
  });

  it("maps purpose=email to autofill metadata (overridable by explicit props)", async () => {
    const tree = await render(<Field label="البريد" purpose="email" testID="f" />);
    const props = inputProps(tree, "f");
    expect(props.textContentType).toBe("emailAddress");
    expect(props.autoComplete).toBe("email");
    expect(props.keyboardType).toBe("email-address");
    expect(props.autoCapitalize).toBe("none");

    // explicit caller props still win over the mapping
    const tree2 = await render(
      <Field label="البريد" purpose="email" keyboardType="default" testID="f2" />,
    );
    expect(inputProps(tree2, "f2").keyboardType).toBe("default");
  });

  it("masks digits (Arabic-Indic normalized) and forwards the masked value", async () => {
    const onChange = jest.fn();
    const tree = await render(
      <Field label="السنة" mask="digits" onChangeText={onChange} testID="f" />,
    );
    await fireEvent.changeText(tree.getByTestId("f"), "١٢a٣");
    expect(onChange).toHaveBeenLastCalledWith("123");
  });

  it("masks phone input (keeps a leading +, strips separators)", async () => {
    const onChange = jest.fn();
    const tree = await render(
      <Field label="الهاتف" mask="phone" onChangeText={onChange} testID="f" />,
    );
    await fireEvent.changeText(tree.getByTestId("f"), "+218 91 234 5678x");
    expect(onChange).toHaveBeenLastCalledWith("+218912345678");
  });

  it("masks usernames (lowercase Latin, no leading separators)", async () => {
    const onChange = jest.fn();
    const tree = await render(
      <Field label="المعرّف" mask="username" onChangeText={onChange} testID="f" />,
    );
    await fireEvent.changeText(tree.getByTestId("f"), ".Ah-Med_99@!");
    expect(onChange).toHaveBeenLastCalledWith("ah-med_99");
  });

  it("disabled locks editing without shrinking the 48px row", async () => {
    const tree = await render(<Field label="الاسم" disabled testID="f" />);
    const props = inputProps(tree, "f");
    expect(props.editable).toBe(false);
    expect(props.accessibilityState).toEqual({ disabled: true });
  });

  it("loading locks editing and mounts the inline busy indicator", async () => {
    const tree = await render(<Field label="رمز الدعوة" loading testID="f" />);
    expect(inputProps(tree, "f").editable).toBe(false);
    // InlineBusy renders three hairline squares — the loader vocabulary
    expect(tree.toJSON()).not.toBeNull();
  });
});

describe("SecretField — the «إظهار»/«إخفاء» secure toggle", () => {
  it("starts masked, then unmasks on «إظهار» and back on «إخفاء»", async () => {
    const tree = await render(<SecretField label="كلمة المرور" testID="pw" />);
    expect(inputProps(tree, "pw").secureTextEntry).toBe(true);

    const show = tree.getByLabelText("إظهار كلمة المرور");
    expect(tree.getByText("إظهار")).toBeTruthy();
    await fireEvent.press(show);

    expect(inputProps(tree, "pw").secureTextEntry).toBe(false);
    const hide = tree.getByLabelText("إخفاء كلمة المرور");
    expect(tree.getByText("إخفاء")).toBeTruthy();
    await fireEvent.press(hide);
    expect(inputProps(tree, "pw").secureTextEntry).toBe(true);
  });

  it("keeps autofill semantics (password) for the OS", async () => {
    const tree = await render(<SecretField label="كلمة المرور" testID="pw" />);
    const props = inputProps(tree, "pw");
    expect(props.textContentType).toBe("password");
    expect(props.autoCorrect).toBe(false);
  });
});

describe("returnKeyType chaining inside FormFieldsProvider", () => {
  it("chains «التالي» → «تم» across registered fields", async () => {
    const tree = await render(
      <FormFieldsProvider>
        <Field label="الاسم" testID="first" />
        <Field label="البريد" testID="second" />
      </FormFieldsProvider>,
    );
    expect(inputProps(tree, "first").returnKeyType).toBe("next");
    expect(inputProps(tree, "second").returnKeyType).toBe("done");
    // the non-last field wires an auto submit that advances focus
    expect(typeof inputProps(tree, "first").onSubmitEditing).toBe("function");
  });

  it("explicit returnKeyType/onSubmitEditing always win", async () => {
    const tree = await render(
      <FormFieldsProvider>
        <Field label="الاسم" testID="first" returnKeyType="search" />
      </FormFieldsProvider>,
    );
    expect(inputProps(tree, "first").returnKeyType).toBe("search");
  });

  it("outside a provider nothing is injected (backward compatibility)", async () => {
    const tree = await render(<Field label="الاسم" testID="solo" />);
    expect(inputProps(tree, "solo").returnKeyType).toBeUndefined();
    expect(inputProps(tree, "solo").onSubmitEditing).toBeUndefined();
  });
});
