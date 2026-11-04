/**
 * R334 2-c — toast queue contract (colocated with the component).
 *
 * Proves the upgrade WITHOUT breaking the R326 surface: every legacy call
 * signature still pushes, and the new engine — one visible toast, queue
 * behind it, per-item timers, manual hide, the onShow slot — behaves.
 */
import { act, render } from "@testing-library/react-native";
import { ToastHost, toast, TOAST_DURATION_MS, useToast, type ToastItem } from "./toast";

describe("toast queue (R334)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    toast.hideAll();
    toast.onShow(null);
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("legacy signatures still work: info/success/error with (message, title?)", async () => {
    toast.info("معلومة");
    toast.success("تمّ الحفظ", "عنوان");
    toast.error("خطأ", "عنوان");
    const legacy = useToast();
    expect(typeof legacy.info).toBe("function");
    expect(typeof legacy.success).toBe("function");
    expect(typeof legacy.error).toBe("function");
    const view = await render(<ToastHost />);
    // Only the FIRST toast is visible (queue, max 1 on screen).
    expect(view.getByText("معلومة")).toBeTruthy();
    expect(view.queryByText("تمّ الحفظ")).toBeNull();
  });

  test("max 1 visible: second toast waits, then takes over after the duration", async () => {
    const view = await render(<ToastHost />);
    await act(async () => {
      toast.success("الأولى");
      toast.error("الثانية", "خطأ");
    });
    expect(view.getByText("الأولى")).toBeTruthy();
    expect(view.queryByText("الثانية")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(view.queryByText("الأولى")).toBeNull();
    expect(view.getByText("الثانية")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(view.queryByText("الثانية")).toBeNull();
  });

  test("manual hide: toast.hide() advances the queue immediately", async () => {
    const view = await render(<ToastHost />);
    await act(async () => {
      toast.info("الأولى");
      toast.info("الثانية");
    });
    await act(async () => {
      toast.hide();
    });
    expect(view.queryByText("الأولى")).toBeNull();
    expect(view.getByText("الثانية")).toBeTruthy();
  });

  test("custom duration is honored", async () => {
    const view = await render(<ToastHost />);
    await act(async () => {
      toast.info("سريعة", undefined, 100);
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(view.queryByText("سريعة")).toBeNull();
  });

  test("warning variant renders (new, additive)", async () => {
    const view = await render(<ToastHost />);
    await act(async () => {
      toast.warning("تحذير", "انتبه");
    });
    expect(view.getByText("تحذير")).toBeTruthy();
    expect(view.getByText("انتبه")).toBeTruthy();
  });

  test("onShow slot fires per visible toast (the haptics hook point)", async () => {
    const shown: ToastItem[] = [];
    toast.onShow((t) => shown.push(t));
    await render(<ToastHost />);
    await act(async () => {
      toast.success("الأولى");
      toast.success("الثانية");
    });
    expect(shown.map((t) => t.message)).toEqual(["الأولى"]);
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(shown.map((t) => t.message)).toEqual(["الأولى", "الثانية"]);
    // Clearing the slot stops the callbacks.
    toast.onShow(null);
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
      toast.info("الثالثة");
    });
    expect(shown).toHaveLength(2);
  });

  test("queue is bounded (a burst lines up, never floods)", async () => {
    const shown: string[] = [];
    toast.onShow((t) => shown.push(t.message));
    const view = await render(<ToastHost />);
    // 8 pushes → MAX_QUEUE (4) slots: the four oldest are dropped as the
    // queue slides (heads 0–3 flash their onShow then fall off), the screen
    // never stacks more than ONE toast, and the burst drains in exactly
    // cap × duration.
    await act(async () => {
      for (let i = 0; i < 8; i++) toast.info(`رسالة ${i}`);
    });
    expect(view.getByText("رسالة 4")).toBeTruthy();
    expect(shown).toEqual(["رسالة 0", "رسالة 1", "رسالة 2", "رسالة 3", "رسالة 4"]);
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS * 4);
    });
    expect(view.queryByText("رسالة 4")).toBeNull();
    expect(view.queryByText("رسالة 7")).toBeNull();
    expect(shown[shown.length - 1]).toBe("رسالة 7");
  });
});
