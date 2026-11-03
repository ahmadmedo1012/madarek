/**
 * R334 B8 — states render net: the upgraded state seats.
 *
 * Covers: EmptyState room variants (blueprint plan art + Arabic copy),
 * the additive ErrorState «إبلاغ عن مشكلة» action, OfflineState,
 * LoadingState — AND the backward-compat seats (legacy EmptyState props,
 * OfflineBanner) so every pre-R334 call site keeps rendering.
 */
import { describe, expect, it } from "@jest/globals";
import { render, act } from "@testing-library/react-native";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineBanner,
  OfflineState,
} from "./states";

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

describe("EmptyState (R334 room variants)", () => {
  it("stages the exam hall: plan sheet + «لا توجد امتحانات بعد»", async () => {
    const { getByText, toJSON } = await render(<EmptyState room="exam-hall" />);
    expect(getByText("لا توجد امتحانات بعد")).toBeTruthy();
    // the R330 plan sheet is in the tree — react-native-svg serializes the
    // shared 320×220 drafting viewBox as vbWidth/vbHeight host props.
    expect(collectProp(toJSON(), "vbWidth")).toContain(320);
    expect(collectProp(toJSON(), "vbHeight")).toContain(220);
    expect(collectProp(toJSON(), "accessibilityLabel")).toContain("مخطط قاعة اختبار فارغة");
  });

  it("stages the library: «لا توجد ملفات»", async () => {
    const { getByText } = await render(<EmptyState room="library" />);
    expect(getByText("لا توجد ملفات")).toBeTruthy();
  });

  it("stages the lecture hall: «لا توجد محاضرات»", async () => {
    const { getByText } = await render(<EmptyState room="lecture-hall" />);
    expect(getByText("لا توجد محاضرات")).toBeTruthy();
  });

  it("stages the building: «لا يوجد محتوى»", async () => {
    const { getByText } = await render(<EmptyState room="building" />);
    expect(getByText("لا يوجد محتوى")).toBeTruthy();
  });

  it("explicit title/message override the room defaults", async () => {
    const { getByText, queryByText } = await render(
      <EmptyState room="library" title="رفّك خالٍ" message="لم تُرفع مواد بعد." />,
    );
    expect(getByText("رفّك خالٍ")).toBeTruthy();
    expect(queryByText("لا توجد ملفات")).toBeNull();
    expect(getByText("لم تُرفع مواد بعد.")).toBeTruthy();
  });

  it("BACKWARD COMPAT: legacy props render unchanged (no room)", async () => {
    const { getByText, toJSON } = await render(
      <EmptyState title="لا إشعارات" message="ستظهر الإشعارات هنا." />,
    );
    expect(getByText("لا إشعارات")).toBeTruthy();
    expect(getByText("ستظهر الإشعارات هنا.")).toBeTruthy();
    // no plan sheet sneaks in for legacy call sites
    expect(collectProp(toJSON(), "vbWidth")).toHaveLength(0);
  });
});

describe("ErrorState (R334 report action)", () => {
  it("renders retry + «إبلاغ عن مشكلة» when onReport is given", async () => {
    const { getByText } = await render(
      <ErrorState onRetry={() => undefined} onReport={() => undefined} />,
    );
    expect(getByText("إعادة المحاولة")).toBeTruthy();
    expect(getByText("إبلاغ عن مشكلة")).toBeTruthy();
  });

  it("BACKWARD COMPAT: without onReport only the retry seat renders", async () => {
    const { getByText, queryByText } = await render(<ErrorState onRetry={() => undefined} />);
    expect(getByText("إعادة المحاولة")).toBeTruthy();
    expect(queryByText("إبلاغ عن مشكلة")).toBeNull();
  });
});

describe("OfflineState", () => {
  it("renders the honest no-cache-offline copy", async () => {
    const { getByText } = await render(<OfflineState />);
    expect(getByText("أنت غير متصل بالإنترنت")).toBeTruthy();
    expect(
      getByText("لا توجد نسخة محفوظة من هذه الصفحة — سيتم تحميلها عند عودة الاتصال."),
    ).toBeTruthy();
  });

  it("surfaces «إعادة المحاولة» when a retry handler is given", async () => {
    const { getByText } = await render(<OfflineState onRetry={() => undefined} />);
    expect(getByText("إعادة المحاولة")).toBeTruthy();
  });
});

describe("LoadingState (compact seat)", () => {
  it("renders an honest busy row with an Arabic label", async () => {
    const { getByText, toJSON } = await render(<LoadingState label="جارٍ تحميل الدرجات…" />);
    expect(getByText("جارٍ تحميل الدرجات…")).toBeTruthy();
    expect(collectProp(toJSON(), "accessibilityRole")).toContain("progressbar");
    expect(collectProp(toJSON(), "accessibilityState")).toContainEqual({ busy: true });
  });
});

describe("OfflineBanner (backward compat)", () => {
  it("renders when visible, null when not", async () => {
    const { getByText, toJSON, rerender } = await render(<OfflineBanner visible />);
    expect(getByText(/لا يوجد اتصال/)).toBeTruthy();
    await act(async () => {
      rerender(<OfflineBanner visible={false} />);
    });
    expect(toJSON()).toBeNull();
  });
});
