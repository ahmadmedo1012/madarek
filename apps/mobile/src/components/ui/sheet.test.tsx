/**
 * R334 2-c — sheet presets contract (colocated with the component).
 *
 * WHAT IS MOCKED AND WHY (jest-expo environment, R334):
 *   · `@gorhom/bottom-sheet` is faked below. The REAL v5 engine cannot boot
 *     under the repo's reanimated jest mock: the mock's `makeMutable` is the
 *     identity function, so `useAnimatedLayout`'s layout state is a plain
 *     object and `useAnimatedDetents` dies on `layoutState.get(...)`. The
 *     fake reproduces exactly the surface AppSheet programs against — a
 *     ref-driven `present/dismiss` modal that mounts children only when
 *     presented, a passthrough provider, view/scroll-view/text-input shells,
 *     and the footerComponent slot. What the suite proves against the REAL
 *     presets: the controlled open/onClose wiring, the preset copy, and the
 *     a11y marks.
 *   · `react-native-gesture-handler` is faked down to GestureHandlerRootView
 *     (the only export the sheet uses): RNGH v3 schedules a native
 *     `installUIRuntimeBindings` task that crashes the suite under jest.
 *
 * NOT CLAIMED (honesty table, no emulator): pixel snap positions, gesture
 * tracking, keyboard tracking, portal layering — those need a device
 * (see docs/mobile/foundations/sheets.md).
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    GestureHandlerRootView: ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
      React.createElement(View, { style, pointerEvents: "box-none" }, children),
  };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, TextInput, ScrollView } = require("react-native");

  /** The ref contract AppSheet drives (present/dismiss + no-op nav). */
  const BottomSheetModal = React.forwardRef(function BottomSheetModal(props: any, ref: any) {
    const [presented, setPresented] = React.useState(false);
    React.useImperativeHandle(ref, () => ({
      present: () => setPresented(true),
      dismiss: () => setPresented(false),
      snapToIndex: () => undefined,
      snapToPosition: () => undefined,
      expand: () => undefined,
      collapse: () => undefined,
      close: () => setPresented(false),
      forceClose: () => setPresented(false),
    }));
    if (!presented) return null;
    const Footer = props.footerComponent;
    return React.createElement(
      View,
      { accessibilityLabel: props.accessibilityLabel },
      props.handleComponent === null ? null : React.createElement(View, { testID: "sheet-handle" }),
      props.children,
      Footer ? React.createElement(Footer, {}) : null,
    );
  });

  const BottomSheetModalProvider = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const BottomSheetView = (props: any) => React.createElement(View, props);
  const BottomSheetScrollView = (props: any) => React.createElement(ScrollView, props);
  const BottomSheetTextInput = (props: any) => React.createElement(TextInput, props);
  const BottomSheetBackdrop = (props: any) => React.createElement(View, props);

  return {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetView,
    BottomSheetScrollView,
    BottomSheetTextInput,
    BottomSheetBackdrop,
  };
});

import {
  ActionSheet,
  ConfirmSheet,
  FilterSheet,
  PickerSheet,
  SHEET_ANIMATION,
} from "./sheet";
import { T } from "./text";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ConfirmSheet", () => {
  test("open renders title, message, and both actions; confirm fires", async () => {
    const onConfirm = jest.fn();
    const view = await render(
      <ConfirmSheet
        open
        onClose={jest.fn()}
        title="حذف الإشعار"
        message="لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        onConfirm={onConfirm}
        destructive
      />,
    );
    await waitFor(() => view.getByText("حذف الإشعار"));
    expect(view.getByText("لا يمكن التراجع عن هذا الإجراء.")).toBeTruthy();
    // The header close affordance is labeled in Arabic.
    expect(view.getByLabelText("إغلاق")).toBeTruthy();
    fireEvent.press(view.getByText("حذف"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("closed presents no sheet content (the modal mounts on present only)", async () => {
    const view = await render(
      <ConfirmSheet open={false} onClose={jest.fn()} title="حذف الإشعار" onConfirm={jest.fn()} />,
    );
    await flush();
    expect(view.queryByText("حذف الإشعار")).toBeNull();
    expect(view.queryByText("تأكيد")).toBeNull();
    expect(view.queryByLabelText("إغلاق")).toBeNull();
  });

  test("defaults: «تأكيد» / «إلغاء»", async () => {
    const view = await render(
      <ConfirmSheet open onClose={jest.fn()} title="تأكيد الإجراء" onConfirm={jest.fn()} />,
    );
    await waitFor(() => view.getByText("تأكيد"));
    expect(view.getByText("إلغاء")).toBeTruthy();
  });
});

describe("PickerSheet", () => {
  const options = [
    { id: "cs", label: "علوم الحاسب", sub: "الكلية الأولى" },
    { id: "eng", label: "الهندسة" },
  ];

  test("renders options, marks the selected row, and selects on press", async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const view = await render(
      <PickerSheet
        open
        onClose={onClose}
        title="اختر التخصص"
        options={options}
        selectedId="eng"
        onSelect={onSelect}
      />,
    );
    await waitFor(() => view.getByText("علوم الحاسب"));
    expect(view.getByText("الهندسة")).toBeTruthy();
    // The selected row announces its state…
    const selected = view.getByLabelText("الهندسة");
    expect(selected.props.accessibilityState).toMatchObject({ selected: true });
    // …and the unselected one does not.
    expect(view.getByLabelText("علوم الحاسب").props.accessibilityState).toMatchObject({
      selected: false,
    });
    fireEvent.press(selected);
    expect(onSelect).toHaveBeenCalledWith("eng");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("empty options render the honest empty label", async () => {
    const view = await render(
      <PickerSheet open onClose={jest.fn()} title="اختر" options={[]} onSelect={jest.fn()} />,
    );
    await waitFor(() => view.getByText("لا توجد خيارات"));
  });

  test("loading state renders before options arrive", async () => {
    const view = await render(
      <PickerSheet
        open
        onClose={jest.fn()}
        title="اختر"
        options={options}
        onSelect={jest.fn()}
        loading
      />,
    );
    await waitFor(() => view.getByText("جارٍ التحميل…"));
    expect(view.queryByText("علوم الحاسب")).toBeNull();
  });
});

describe("ActionSheet", () => {
  test("renders every action + «إلغاء»; an action closes then runs", async () => {
    const onClose = jest.fn();
    const act = jest.fn();
    const view = await render(
      <ActionSheet
        open
        onClose={onClose}
        title="إجراءات المقرر"
        actions={[
          { label: "مشاركة", onPress: act },
          { label: "حذف", onPress: jest.fn(), destructive: true },
        ]}
      />,
    );
    await waitFor(() => view.getByText("إجراءات المقرر"));
    expect(view.getByLabelText("مشاركة")).toBeTruthy();
    expect(view.getByLabelText("حذف")).toBeTruthy();
    fireEvent.press(view.getByLabelText("مشاركة"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(act).toHaveBeenCalledTimes(1);
    expect(view.getByText("إلغاء")).toBeTruthy();
  });
});

describe("FilterSheet", () => {
  test("scrollable body + sticky «تطبيق» / «إعادة تعيين» footer", async () => {
    const onApply = jest.fn();
    const onReset = jest.fn();
    const view = await render(
      <FilterSheet open onClose={jest.fn()} onApply={onApply} onReset={onReset}>
        <T variant="body">محتوى التصفية</T>
      </FilterSheet>,
    );
    await waitFor(() => view.getByText("تصفية"));
    expect(view.getByText("محتوى التصفية")).toBeTruthy();
    fireEvent.press(view.getByText("تطبيق"));
    expect(onApply).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByText("إعادة تعيين"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("SHEET_ANIMATION (reduced-motion fast path)", () => {
  test("exposes the Heron cadence + a faster reduced path", () => {
    expect(SHEET_ANIMATION.durationMs).toBeGreaterThan(SHEET_ANIMATION.reducedDurationMs);
    expect(SHEET_ANIMATION.easing).toBeTruthy();
  });
});
