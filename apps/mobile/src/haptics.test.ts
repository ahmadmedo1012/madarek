/**
 * R334 2-b — the haptics unit net (colocated). Pins the three policies
 * the module centralizes — toggle gate · anti-spam throttle · platform
 * honesty — with expo-haptics mocked and clock/platform injected through
 * __hapticsInternals (no fake timers, no Platform mutation).
 *
 * Honesty: this net proves LOGIC, not hardware. Real-device haptics is
 * inherently unverified from this sandbox — labels live in
 * docs/mobile/foundations/haptics.md.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { haptics, __hapticsInternals } from "@/haptics";

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  // Real expo-haptics 58 enum VALUES (string enums) — the assertions
  // below pin the mapping against exactly these.
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy", Soft: "soft", Rigid: "rigid" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

const mockSelection = Haptics.selectionAsync as unknown as jest.Mock;
const mockImpact = Haptics.impactAsync as unknown as jest.Mock;
const mockNotify = Haptics.notificationAsync as unknown as jest.Mock;
const storageGet = AsyncStorage.getItem as unknown as jest.Mock;

const STORAGE_KEY = "mdrk-mobile-haptics-enabled";

/* ── deterministic clock (injected via __hapticsInternals.setClock) ──── */

let now = 0;
function installClock() {
  now = 0;
  __hapticsInternals.setClock(() => now);
}
const tick = (ms: number) => {
  now += ms;
};

/** Let fire-and-forget promises (emits, persist writes) settle. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  mockSelection.mockReset().mockImplementation(() => Promise.resolve());
  mockImpact.mockReset().mockImplementation(() => Promise.resolve());
  mockNotify.mockReset().mockImplementation(() => Promise.resolve());
  __hapticsInternals.reset();
  installClock();
  await AsyncStorage.clear();
});

/* ── 1. the toggle gate ──────────────────────────────────────────────── */

describe("haptics — toggle gate", () => {
  it("defaults ON and stays ON when storage is empty", async () => {
    __hapticsInternals.setPlatform("ios");
    expect(haptics.isEnabled()).toBe(true);
    await haptics.hydrate();
    expect(haptics.isEnabled()).toBe(true);
  });

  it("setEnabled(false) silences every kind immediately", async () => {
    __hapticsInternals.setPlatform("ios");
    haptics.setEnabled(false);
    expect(haptics.isEnabled()).toBe(false);
    haptics.selection();
    haptics.impact("light");
    haptics.notify("success");
    await flush();
    expect(mockSelection).not.toHaveBeenCalled();
    expect(mockImpact).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("re-enabling un-silences feedback", async () => {
    __hapticsInternals.setPlatform("ios");
    haptics.setEnabled(false);
    haptics.setEnabled(true);
    haptics.selection();
    await flush();
    expect(mockSelection).toHaveBeenCalledTimes(1);
  });
});

/* ── 2. persistence (mdrk-mobile-haptics-enabled, AsyncStorage) ──────── */

describe("haptics — persistence", () => {
  it("persists '0' / '1' through AsyncStorage", async () => {
    __hapticsInternals.setPlatform("ios");
    haptics.setEnabled(false);
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("0");
    haptics.setEnabled(true);
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("hydrate() restores a persisted OFF across restarts", async () => {
    __hapticsInternals.setPlatform("ios");
    await AsyncStorage.setItem(STORAGE_KEY, "0");
    await haptics.hydrate();
    expect(haptics.isEnabled()).toBe(false);
    haptics.selection();
    expect(mockSelection).not.toHaveBeenCalled();
  });

  it("a stored '1' hydrates ON", async () => {
    __hapticsInternals.setPlatform("ios");
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    await haptics.hydrate();
    expect(haptics.isEnabled()).toBe(true);
  });

  it("a failing storage read never disables feedback (default ON)", async () => {
    __hapticsInternals.setPlatform("ios");
    storageGet.mockImplementationOnce(() => Promise.reject(new Error("disk gone")));
    await haptics.hydrate();
    expect(haptics.isEnabled()).toBe(true);
  });

  it("a setEnabled during an in-flight hydrate wins the race", async () => {
    __hapticsInternals.setPlatform("ios");
    // Stale ON read, still pending when the user flips the switch.
    storageGet.mockImplementationOnce(() => Promise.resolve("1"));
    const pending = haptics.hydrate();
    haptics.setEnabled(false);
    await pending;
    expect(haptics.isEnabled()).toBe(false); // the flip survived the race
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("0");
  });

  it("hydrate() is idempotent — one storage read for many calls", async () => {
    __hapticsInternals.setPlatform("ios");
    const before = storageGet.mock.calls.length;
    await haptics.hydrate();
    await haptics.hydrate();
    expect(storageGet.mock.calls.length - before).toBe(1);
  });
});

/* ── 3. the anti-spam throttle ───────────────────────────────────────── */

describe("haptics — anti-spam throttle", () => {
  it("the global 60ms floor blocks a second feedback of ANY kind", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.selection(); // t=0 — fires
    tick(30);
    haptics.impact("light"); // t=30 — inside the global floor (light never fired)
    expect(mockSelection).toHaveBeenCalledTimes(1);
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it("selection cooldown (150ms) outlives the global floor", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.selection(); // t=0
    tick(60);
    haptics.selection(); // global ok (60), selection cooldown no (60 < 150)
    expect(mockSelection).toHaveBeenCalledTimes(1);
    tick(90); // t=150 — both gates pass
    haptics.selection();
    expect(mockSelection).toHaveBeenCalledTimes(2);
  });

  it("per-kind cooldowns are independent", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.impact("heavy"); // t=0
    tick(100);
    haptics.impact("light"); // t=100 — light never fired; global 100 ≥ 60
    expect(mockImpact).toHaveBeenCalledTimes(2);
    expect(mockImpact).toHaveBeenNthCalledWith(1, "heavy");
    expect(mockImpact).toHaveBeenNthCalledWith(2, "light");
  });

  it("impact:heavy cooldown (200ms) holds past the global floor", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.impact("heavy"); // t=0
    tick(150);
    haptics.impact("heavy"); // 150 < 200 — blocked
    expect(mockImpact).toHaveBeenCalledTimes(1);
    tick(50); // t=200
    haptics.impact("heavy");
    expect(mockImpact).toHaveBeenCalledTimes(2);
  });

  it("a blocked attempt never extends the cooldown window", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.selection(); // t=0 — fires
    tick(50);
    haptics.selection(); // blocked — must NOT re-stamp the window
    tick(100); // t=150 — fires only if the blocked call stamped nothing
    haptics.selection();
    expect(mockSelection).toHaveBeenCalledTimes(2);
  });

  it("notify cooldowns (250ms) gate each outcome kind", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.notify("success"); // t=0
    tick(100);
    haptics.notify("success"); // 100 < 250 — blocked
    expect(mockNotify).toHaveBeenCalledTimes(1);
    tick(150); // t=250
    haptics.notify("success");
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });
});

/* ── 4. platform honesty ─────────────────────────────────────────────── */

describe("haptics — platform honesty", () => {
  it("web: full no-op — the engine is never touched, even when enabled", async () => {
    __hapticsInternals.setPlatform("web");
    expect(haptics.isEnabled()).toBe(true);
    haptics.selection();
    tick(300);
    haptics.impact("medium");
    tick(300);
    haptics.notify("error");
    await flush();
    expect(mockSelection).not.toHaveBeenCalled();
    expect(mockImpact).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("iOS: notify() uses the semantic UINotificationFeedbackType", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.notify("success"); // t=0
    tick(250);
    haptics.notify("warning"); // t=250
    tick(250);
    haptics.notify("error"); // t=500
    expect(mockNotify.mock.calls.map((c) => c[0])).toEqual(["success", "warning", "error"]);
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it("iOS: selection/impact use the cross-platform primitives", () => {
    __hapticsInternals.setPlatform("ios");
    haptics.selection();
    tick(150);
    haptics.impact("medium");
    expect(mockSelection).toHaveBeenCalledTimes(1);
    expect(mockImpact).toHaveBeenCalledWith("medium");
  });

  it("Android: notify() escalates through impacts (NotificationFeedbackType is iOS-only)", () => {
    __hapticsInternals.setPlatform("android");
    haptics.notify("success"); // → light
    tick(250);
    haptics.notify("warning"); // → medium
    tick(250);
    haptics.notify("error"); // → heavy
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockImpact.mock.calls.map((c) => c[0])).toEqual(["light", "medium", "heavy"]);
  });

  it("Android: selection/impact stay on the cross-platform primitives", () => {
    __hapticsInternals.setPlatform("android");
    haptics.selection();
    tick(150);
    haptics.impact("heavy");
    expect(mockSelection).toHaveBeenCalledTimes(1);
    expect(mockImpact).toHaveBeenCalledWith("heavy");
  });

  it("Android: notify's cooldown keys the public kind, not the mapped primitive", () => {
    __hapticsInternals.setPlatform("android");
    haptics.notify("success"); // t=0 — vibrates like impact:light
    tick(100); // past impact:light's own cooldown + the global floor
    haptics.impact("light"); // must fire — light never spent its budget
    expect(mockImpact).toHaveBeenCalledTimes(2);
  });
});

/* ── 5. engine failures ──────────────────────────────────────────────── */

describe("haptics — engine failures", () => {
  it("a rejecting engine (UnavailabilityError) never crashes the caller", async () => {
    __hapticsInternals.setPlatform("ios");
    mockSelection.mockImplementation(() =>
      Promise.reject(new Error("UnavailabilityError: Haptics.selectionAsync")),
    );
    expect(() => haptics.selection()).not.toThrow();
    await flush(); // the swallowed rejection must not surface either
  });

  it("the throttle spends its slot even when the engine fails (no refund)", () => {
    __hapticsInternals.setPlatform("ios");
    mockImpact.mockImplementationOnce(() => Promise.reject(new Error("engine gone")));
    haptics.impact("light"); // t=0 — emitted, engine rejected
    tick(50);
    haptics.impact("light"); // 50 < 100 cooldown — still blocked
    expect(mockImpact).toHaveBeenCalledTimes(1);
    tick(50); // t=100
    haptics.impact("light");
    expect(mockImpact).toHaveBeenCalledTimes(2);
  });

  it("tolerates a non-promise engine return (mock honesty)", () => {
    __hapticsInternals.setPlatform("ios");
    mockImpact.mockImplementation(() => undefined);
    expect(() => haptics.impact("light")).not.toThrow();
  });
});
