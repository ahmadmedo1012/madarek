/**
 * push.test.ts — R353 Lane N — the push client's PURE contract.
 *
 * Everything here is module-logic only (no rendering): each test
 * re-requires the push client against a FRESH module registry so its
 * module state (runtime promise, launch-read cache, the parked link)
 * is observable per test — the crashPersist net pattern. The render
 * seats (PushRegistrar, the activation card, the entry router) live in
 * push-registrar.test.tsx, which cannot reset the registry (a stale
 * React over a reset registry is the classic null-dispatcher crash).
 *
 * The contract under test — everything that must be right the moment
 * the Expo project gains FCM credentials, plus the honest UX now:
 *   · Android channels: «alerts» (HIGH + sound + vibration + PUBLIC
 *     lockscreen) and «default» (DEFAULT) exist BEFORE the permission
 *     ask — Android 8+ needs the seat before the first message or
 *     pushes arrive silent/invisible;
 *   · the foreground handler presents alert + sound + badge;
 *   · registration failures are RETURNED (granted-but-unregistered),
 *     never swallowed into a fake grant;
 *   · deep links: the launch response parks a safe in-app path once;
 *     unsafe links are dropped;
 *   · opening the inbox clears the badge (the backend sends badge:1).
 *
 * (mock-prefixed identifiers are the babel-plugin-jest-hoist allowance
 * for factory-referenced state.)
 */
import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";

type Push = typeof import("./push");
let push: Push;

/* ── the per-file expo-notifications mock (state the tests drive) ──── */

let mockPermission: { granted: boolean; canAskAgain: boolean };
let mockAskResult: { granted: boolean; canAskAgain: boolean };
let mockToken: string;
let mockLaunchResponse: unknown;
let mockPostRejects: boolean;

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => mockPermission),
  requestPermissionsAsync: jest.fn(async () => mockAskResult),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: mockToken })),
  setBadgeCountAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getLastNotificationResponseAsync: jest.fn(async () => mockLaunchResponse),
  AndroidImportance: { HIGH: 6, DEFAULT: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

/* ── the per-file API client mock ───────────────────────────────────── */

const mockPosts: Array<{ url: string; body: unknown }> = [];

jest.mock("@/api/client", () => ({
  get: jest.fn(async () => null),
  post: jest.fn(async (url: string, body: unknown) => {
    if (mockPostRejects) throw new Error("network down");
    mockPosts.push({ url, body });
  }),
  del: jest.fn(async () => undefined),
  patch: jest.fn(async () => undefined),
  apiWithCookieCapture: jest.fn(async () => ({ data: null, refreshCookie: null })),
  registerAuthBridge: jest.fn(),
}));

/* ── the fresh registry every test binds to ─────────────────────────── */

type NotificationsMock = {
  setNotificationHandler: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  setBadgeCountAsync: jest.Mock;
};

let notifications: NotificationsMock;
let platformSpy: { restore: () => void } | null = null;

/**
 * Fresh modules per test. The Platform patch MUST land on the registry
 * the fresh push client actually binds to (the file-scope import would
 * patch the discarded one — the earlier silent-ios regression).
 */
function freshModules(platform: "android" | "ios" = "android"): void {
  jest.resetModules();
  const RN = require("react-native") as { Platform: { OS: string } };
  platformSpy?.restore();
  platformSpy = jest.replaceProperty(RN.Platform, "OS", platform);
  push = jest.requireActual("./push");
  notifications = require("expo-notifications") as NotificationsMock;
}

beforeEach(() => {
  mockPermission = { granted: false, canAskAgain: true };
  mockAskResult = { granted: false, canAskAgain: true };
  mockToken = "";
  mockLaunchResponse = null;
  mockPostRejects = false;
  mockPosts.length = 0;
  freshModules("android");
});

afterEach(() => {
  platformSpy?.restore();
  platformSpy = null;
});

/* ── 1. the Android channel seats, BEFORE the permission ask ───────── */

describe("Android channels — created explicitly, before the prompt", () => {
  it("creates «alerts» (HIGH/sound/vibration/PUBLIC) and «default» (DEFAULT) before requestPermissionsAsync", async () => {
    mockPermission = { granted: true, canAskAgain: true };
    mockAskResult = { granted: true, canAskAgain: true };
    mockToken = "ExponentPushToken[a]".padEnd(32, "x");

    await push.requestAndRegisterPush();

    const channelCalls = notifications.setNotificationChannelAsync.mock.calls;
    const ids = channelCalls.map((c) => c[0]);
    expect(ids).toContain(push.CHANNEL_ALERTS);
    expect(ids).toContain(push.CHANNEL_DEFAULT);

    const alerts = channelCalls.find((c) => c[0] === push.CHANNEL_ALERTS)![1] as Record<string, unknown>;
    expect(alerts.name).toBe("التنبيهات");
    expect(alerts.importance).toBe(6); // AndroidImportance.HIGH
    expect(alerts.sound).toBe("default");
    expect(alerts.vibrationPattern).toEqual([0, 250, 250, 250]);
    expect(alerts.lockscreenVisibility).toBe(1); // AndroidNotificationVisibility.PUBLIC

    const fallback = channelCalls.find((c) => c[0] === push.CHANNEL_DEFAULT)![1] as Record<string, unknown>;
    expect(fallback.importance).toBe(5); // AndroidImportance.DEFAULT

    // THE ordering law: every channel seat exists before the OS prompt.
    const promptOrder = notifications.requestPermissionsAsync.mock.invocationCallOrder[0];
    for (const [i] of channelCalls.entries()) {
      const order = notifications.setNotificationChannelAsync.mock.invocationCallOrder[i];
      expect(order).toBeLessThan(promptOrder);
    }
  });

  it("does not touch channels on iOS (the OS has no channel concept)", async () => {
    freshModules("ios");
    mockAskResult = { granted: true, canAskAgain: true };
    mockToken = "ExponentPushToken[i]".padEnd(32, "x");

    await push.requestAndRegisterPush();
    expect(notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

/* ── 2. the foreground presentation ────────────────────────────────── */

describe("foreground presentation", () => {
  it("presents alerts WITH sound and sets the badge", async () => {
    await push.ensurePushRuntime();
    expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    const handler = notifications.setNotificationHandler.mock.calls[0][0] as {
      handleNotification: () => Promise<Record<string, unknown>>;
    };
    const behavior = await handler.handleNotification();
    expect(behavior).toMatchObject({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    });
  });
});

/* ── 3. honest registration outcomes (no silent swallows) ──────────── */

describe("requestAndRegisterPush — the honest outcome", () => {
  it("granted + token + POST ok → registered", async () => {
    mockAskResult = { granted: true, canAskAgain: true };
    mockToken = "ExponentPushToken[o]".padEnd(32, "x");
    const result = await push.requestAndRegisterPush();
    expect(result).toEqual({ state: "granted", registered: true });
    expect(mockPosts[0]?.url).toBe("/me/push-devices");
  });

  it("granted but the POST fails → granted + registered:false (the retry seat)", async () => {
    mockAskResult = { granted: true, canAskAgain: true };
    mockToken = "ExponentPushToken[f]".padEnd(32, "x");
    mockPostRejects = true;
    const result = await push.requestAndRegisterPush();
    expect(result).toEqual({ state: "granted", registered: false });
  });

  it("granted but no token minted (no FCM credentials yet / simulator) → registered:false, still retryable", async () => {
    mockAskResult = { granted: true, canAskAgain: true };
    mockToken = ""; // the honest Android state until FCM lands
    const result = await push.requestAndRegisterPush();
    expect(result).toEqual({ state: "granted", registered: false });
  });

  it("refused → the refusal state, never a grant", async () => {
    mockAskResult = { granted: false, canAskAgain: false };
    const result = await push.requestAndRegisterPush();
    expect(result).toEqual({ state: "denied", registered: false });
  });
});

/* ── 4. deep links — the parking mechanics (one flight, safe paths) ── */

describe("deep links — parking + one-shot consumption", () => {
  /** The launch/notification-response shape the client reads (data.link). */
  const responseWith = (link: string) => ({
    notification: { request: { content: { data: { link } } } },
  });

  it("the launch response parks a safe in-app path; the take is one-shot", async () => {
    mockLaunchResponse = responseWith("/student/exams");
    // takePendingDeepLink triggers the launch read itself — the exact
    // path a cold start rides (the entry routers await this take).
    await expect(push.takePendingDeepLink()).resolves.toBe("/student/exams");
    await expect(push.takePendingDeepLink()).resolves.toBeNull();
  });

  it("an unsafe launch link (absolute URL) is dropped, never parked", async () => {
    mockLaunchResponse = responseWith("https://evil.example/phish");
    await expect(push.takePendingDeepLink()).resolves.toBeNull();
  });

  it("parkDeepLink keeps only safe in-app paths (the logged-out tap seat)", async () => {
    push.parkDeepLink("https://evil.example/phish");
    push.parkDeepLink("//protocol-relative.example");
    await expect(push.takePendingDeepLink()).resolves.toBeNull();

    push.parkDeepLink("/student/exams");
    await expect(push.takePendingDeepLink()).resolves.toBe("/student/exams");
  });

  it("the login success navigation consumes the parked link (source-pinned wiring)", () => {
    // Route files are not unit-mountable here (the form machinery); the
    // navigation-stability net's FS/source pattern pins the wiring: the
    // login success path must consume the parked link through the same
    // resolveEntryDestination guard as ?continue=.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const src = readFileSync(require.resolve("../../app/auth/login"), "utf8");
    expect(src).toContain("takePendingDeepLink");
    expect(src).toContain("resolveEntryDestination");
  });
});

/* ── 5. badge — the inbox is the eraser ────────────────────────────── */

describe("badge", () => {
  it("markInboxOpened clears the badge count (backend sends badge:1 per push)", async () => {
    push.markInboxOpened();
    await Promise.resolve();
    expect(notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });
});
