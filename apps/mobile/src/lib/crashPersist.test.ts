/**
 * R349 M1.5 — crashPersist net (unit: plain async logic over mocked
 * storage/AppState/telemetry/toast).
 *
 * The contract under test:
 *   · an ACTIVE sentinel from the previous session (never backgrounded)
 *     → a synthesized `crash` report is sent + the user sees a toast;
 *   · a CLEAN sentinel (backgrounded alive) → no synthesized report;
 *   · queued reports (death races / non-OK answers) drain on init;
 *   · AppState background marks the session clean, active re-arms it.
 *
 * (mock-prefixed identifiers are the babel-plugin-jest-hoist allowance
 * for factory-referenced state.)
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type CrashPersist = typeof import("./crashPersist");
let cp: CrashPersist;

const mockStorage = new Map<string, string>();
const mockSentReports: Array<{ kind: string; message: string; route?: string }> = [];
const mockToasts: Array<{ title: string }> = [];
type AppStateCb = (state: string) => void;
let mockAppStateListeners: AppStateCb[] = [];

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStorage.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockStorage.set(k, v)),
    removeItem: jest.fn(async (k: string) => void mockStorage.delete(k)),
  },
}));

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn((_ev: string, cb: AppStateCb) => {
      mockAppStateListeners.push(cb);
      return { remove: () => {} };
    }),
  },
}));

jest.mock("./telemetry", () => ({
  reportClientError: jest.fn(async (r: { kind: string; message: string; route?: string }) => {
    mockSentReports.push(r);
  }),
  getTelemetryRoute: jest.fn(() => "/student/dashboard"),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: {
    error: jest.fn((title: string) => void mockToasts.push({ title })),
  },
}));

import { initCrashPersistence, enqueuePendingReport, touchSentinelRoute } from "./crashPersist";

const SENTINEL = "madarek.crash.sentinel";
const QUEUE = "madarek.crash.pending";

function setSentinel(v: unknown): void {
  mockStorage.set(SENTINEL, JSON.stringify(v));
}

/** Flush the module's async storage chains (read→write microtasks). */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe("crashPersist — the previous-session crash, persisted + surfaced", () => {
  beforeEach(async () => {
    mockStorage.clear();
    mockSentReports.length = 0;
    mockToasts.length = 0;
    mockAppStateListeners = [];
    // Fresh module per test — the `started` guard is module state and
    // init must be observable once per test. (requireActual respects
    // the jest.mock registrations above.)
    jest.resetModules();
    cp = jest.requireActual("./crashPersist") as CrashPersist;
  });

  it("an ACTIVE sentinel (previous session died) sends a synthesized crash + toasts the user", async () => {
    setSentinel({ active: true, at: "2026-11-11T00:00:00Z", route: "/student/dashboard" });
    await cp.initCrashPersistence();
    await flushAsync();
    expect(mockSentReports).toHaveLength(1);
    expect(mockSentReports[0].kind).toBe("crash");
    expect(mockSentReports[0].message).toContain("ended unexpectedly");
    expect(mockSentReports[0].route).toBe("/student/dashboard");
    expect(mockToasts).toHaveLength(1);
    // the new session's sentinel is re-armed
    await flushAsync();
    expect(JSON.parse(mockStorage.get(SENTINEL)!).active).toBe(true);
  });

  it("a CLEAN sentinel (backgrounded alive) sends nothing", async () => {
    setSentinel({ active: false, at: "2026-11-11T00:00:00Z" });
    await cp.initCrashPersistence();
    await flushAsync();
    expect(mockSentReports).toHaveLength(0);
    expect(mockToasts).toHaveLength(0);
  });

  it("queued reports drain on init", async () => {
    setSentinel({ active: false, at: "2026-11-11T00:00:00Z" });
    await cp.enqueuePendingReport({
      kind: "js_error",
      message: "boom",
      queuedAt: "2026-11-10T00:00:00Z",
    });
    await cp.initCrashPersistence();
    await flushAsync();
    expect(mockSentReports).toHaveLength(1);
    expect(mockSentReports[0].message).toContain("[queued 2026-11-10");
    expect(JSON.parse(mockStorage.get(QUEUE)!)).toHaveLength(0);
  });

  it("background marks the session clean; active re-arms it", async () => {
    setSentinel({ active: false, at: "2026-11-11T00:00:00Z" });
    await cp.initCrashPersistence();
    await flushAsync();
    expect(mockAppStateListeners.length).toBeGreaterThan(0);
    // active (foreground return) → armed
    mockAppStateListeners.forEach((cb) => cb("active"));
    await flushAsync();
    expect(JSON.parse(mockStorage.get(SENTINEL)!).active).toBe(true);
    // background → clean
    mockAppStateListeners.forEach((cb) => cb("background"));
    await flushAsync();
    expect(JSON.parse(mockStorage.get(SENTINEL)!).active).toBe(false);
  });

  it("touchSentinelRoute updates only an armed sentinel", async () => {
    setSentinel({ active: true, at: "2026-11-11T00:00:00Z", route: "/old" });
    await cp.touchSentinelRoute();
    await flushAsync();
    expect(JSON.parse(mockStorage.get(SENTINEL)!).route).toBe("/student/dashboard");
    setSentinel({ active: false, at: "2026-11-11T00:00:00Z", route: "/old" });
    await cp.touchSentinelRoute();
    await flushAsync();
    expect(JSON.parse(mockStorage.get(SENTINEL)!).route).toBe("/old");
  });
});
