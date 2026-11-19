/**
 * push-registrar.test.tsx — R353 Lane N — the push client's RENDER seats.
 *
 * Everything here mounts real components — so this suite NEVER resets
 * the module registry (a reset registry under a stale React is the
 * classic null-dispatcher crash; the pure push logic resets freely in
 * push.test.ts instead). Two empirically-discovered jest-env rules
 * shape the suite:
 *   · RTL 14 + React 19 flush effects only after an async act — every
 *     render is followed by a microtask flush before asserting;
 *   · mounting the FULL notifications inbox (FlashList + skeleton
 *     Animated) wedges React's act queue for the rest of the file —
 *     so the activation card is rendered DIRECTLY (a small,
 *     provider-light tree, exported for this net) and the inbox's
 *     one-line badge wiring is source-pinned instead.
 *
 * The render contract under test:
 *   · mounting PushRegistrar NEVER prompts the OS for permission (the
 *     ask lives in the value-shown seats only);
 *   · a warm tap while logged out parks the link for the login path;
 *     while logged in it routes directly; unsafe links are dropped;
 *   · a foreground return after the inbox was seen clears the badge;
 *   · the activation card's honest-failure states: denied → one Arabic
 *     line + the OS-settings button; a failed registration → the retry
 *     line (never a silent swallow); granted+registered → no card;
 *   · the inbox's badge-erase wiring + the entry router's deep-link
 *     consumption are pinned at the source level.
 *
 * (mock-prefixed identifiers are the babel-plugin-jest-hoist allowance
 * for factory-referenced state.)
 */
import React from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Linking, AppState } from "react-native";
import { router } from "expo-router";

import { PushRegistrar, markInboxOpened, takePendingDeepLink } from "@/lib/push";
import { useSession } from "@/auth/session";
import { PushActivationCard } from "@/features/notifications/NotificationsScreen";

/* ── the per-file expo-notifications mock (state the tests drive) ──── */

let mockPermission: { granted: boolean; canAskAgain: boolean };
let mockAskResult: { granted: boolean; canAskAgain: boolean };
let mockToken: string;
let mockPostRejects: boolean;
let mockTapListeners: Array<(response: unknown) => void>;
let mockAppStateListeners: Array<(state: string) => void>;

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(async () => mockPermission),
  requestPermissionsAsync: jest.fn(async () => mockAskResult),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: mockToken })),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn((cb: (r: unknown) => void) => {
    mockTapListeners.push(cb);
    return { remove: jest.fn() };
  }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  AndroidImportance: { HIGH: 6, DEFAULT: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

/* ── the per-file API client mock ───────────────────────────────────── */

jest.mock("@/api/client", () => ({
  get: jest.fn(async (url: string) => {
    if (url.includes("/auth/me")) return null;
    return { data: [], meta: { page: 1, limit: 30, total: 0, totalPages: 1, unread: 0 } };
  }),
  post: jest.fn(async () => {
    if (mockPostRejects) throw new Error("network down");
    return undefined;
  }),
  del: jest.fn(async () => undefined),
  patch: jest.fn(async () => undefined),
  apiWithCookieCapture: jest.fn(async () => ({ data: null, refreshCookie: null })),
  registerAuthBridge: jest.fn(),
}));

/* ── the harness ────────────────────────────────────────────────────── */

type NotificationsMock = {
  setNotificationHandler: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  setBadgeCountAsync: jest.Mock;
};
const notifications = require("expo-notifications") as NotificationsMock;

function makeStudentUser() {
  return {
    id: "u-push",
    email: "student@test.ly",
    role: "STUDENT",
    firstName: "تجربة",
    lastName: "مدارك",
    memberships: [],
    currentInstitution: { id: "inst-1", name: "المؤسسة", slug: "test" },
    membershipRole: "STUDENT",
  } as unknown as import("@/api/types").AuthUser;
}

/** The notification-response shape the client reads (payload.data.link). */
function responseWith(link: string): unknown {
  return { notification: { request: { content: { data: { link } } } } };
}

/** Settle flush inside act(): microtasks AND one macrotask per round —
 *  react-query delivers query results on a setTimeout(0) notify, which
 *  pure microtask rounds never reach (the flaky denied-card run). */
async function flushAsyncWork(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

/** Mount + settle a component under a fresh query client.
 *  The render MUST sit inside its own async act (RTL 14 + React 19:
 *  a bare render followed by a later act flush leaves an act scope
 *  open and wedges every subsequent effect in the file). */
async function mountSettled(Component: React.ComponentType): Promise<ReturnType<typeof render>> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  let tree!: ReturnType<typeof render>;
  await act(async () => {
    tree = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>,
    );
  });
  await flushAsyncWork(8);
  return tree;
}

/** The act-scoped mount (see mountSettled for WHY the act wrapper). */
async function mountInAct(Component: React.ComponentType): Promise<void> {
  await act(async () => {
    render(<Component />);
  });
}

/** Fire the registered warm-tap listeners. NO act wrapper: the tap
 *  handler is pure module logic (park/push-on-a-mock) — an act scope
 *  around it never pops cleanly and wedges every later effect flush. */
function fireTaps(link: string): void {
  mockTapListeners.forEach((cb) => cb(responseWith(link)));
}

let linkingSpy: jest.MockInstance<Promise<void>, []>;

beforeEach(() => {
  mockPermission = { granted: false, canAskAgain: true };
  mockAskResult = { granted: false, canAskAgain: true };
  mockToken = "";
  mockPostRejects = false;
  mockTapListeners = [];
  mockAppStateListeners = [];
  notifications.setNotificationHandler.mockClear();
  notifications.requestPermissionsAsync.mockClear();
  notifications.setBadgeCountAsync.mockClear();
  (router.push as jest.Mock).mockClear();
  (router.replace as jest.Mock).mockClear();
  linkingSpy = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation(((_ev: string, cb: (s: string) => void) => {
      mockAppStateListeners.push(cb);
      return { remove: jest.fn() };
    }) as never);
});

afterEach(() => {
  linkingSpy.mockRestore();
  (AppState.addEventListener as jest.Mock).mockRestore();
  useSession.setState({
    user: null,
    accessToken: null,
    refreshCookie: null,
    activeInstitutionId: null,
    isHydrated: true,
  });
});

/* ── 1. permission timing — boot NEVER prompts ─────────────────────── */

describe("PushRegistrar (mounts once in the root layout)", () => {
  // NOTE: first PushRegistrar mount of the file — the runtime setup is
  // idempotent module state (no registry reset here), so the handler
  // assertion is only observable on the FIRST mount.
  it("configures the runtime but never asks the OS for permission", async () => {
    useSession.setState({ user: makeStudentUser(), isHydrated: true });
    await mountInAct(PushRegistrar);
    expect(notifications.setNotificationHandler).toHaveBeenCalled();
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("a warm tap while logged out parks the link for the login success path", async () => {
    useSession.setState({ user: null, isHydrated: true });
    await mountInAct(PushRegistrar);
    expect(mockTapListeners.length).toBeGreaterThan(0);
    fireTaps("/student/exams");
    expect(router.push).not.toHaveBeenCalled();
    await expect(takePendingDeepLink()).resolves.toBe("/student/exams");
  });

  it("a warm tap while logged in routes directly to the link", async () => {
    useSession.setState({ user: makeStudentUser(), isHydrated: true });
    await mountInAct(PushRegistrar);
    fireTaps("/student/exams");
    expect(router.push).toHaveBeenCalledWith("/student/exams");
    await expect(takePendingDeepLink()).resolves.toBeNull();
  });

  it("an unsafe link (absolute URL) is dropped — no push, no parking", async () => {
    useSession.setState({ user: makeStudentUser(), isHydrated: true });
    await mountInAct(PushRegistrar);
    fireTaps("https://evil.example/phish");
    expect(router.push).not.toHaveBeenCalled();
    await expect(takePendingDeepLink()).resolves.toBeNull();
  });

  it("a foreground return after the inbox was seen clears the badge again", async () => {
    useSession.setState({ user: makeStudentUser(), isHydrated: true });
    await mountInAct(PushRegistrar);
    expect(mockAppStateListeners.length).toBeGreaterThan(0);
    markInboxOpened();
    notifications.setBadgeCountAsync.mockClear();
    // NO act: clearBadge is pure module logic over the mock.
    mockAppStateListeners.forEach((cb) => cb("active"));
    await Promise.resolve();
    expect(notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });
});

/* ── 2. the honest-failure rendering states (the activation card) ──── */

describe("PushActivationCard — the honest failure seats", () => {
  it("denied → ONE honest Arabic line + the OS settings button", async () => {
    mockPermission = { granted: false, canAskAgain: false };
    const tree = await mountSettled(() => <PushActivationCard />);
    expect(tree.queryByText("مقفلة من إعدادات النظام — افتحها من هناك.")).not.toBeNull();
    const settings = tree.getByRole("button", { name: "فتح الإعدادات" });
    await fireEvent.press(settings);
    expect(linkingSpy).toHaveBeenCalled();
  });

  it("undetermined → the enable ask; a failed registration renders the retry line, and the retry can succeed", async () => {
    mockPermission = { granted: false, canAskAgain: true };
    const tree = await mountSettled(() => <PushActivationCard />);
    expect(tree.queryByText("فعّل الإشعارات لتصلك لحظة صدورها.")).not.toBeNull();

    // The ask grants, the token mints, the registration POST fails.
    mockAskResult = { granted: true, canAskAgain: true };
    mockPermission = { granted: true, canAskAgain: true };
    mockToken = "ExponentPushToken[r]".padEnd(32, "x");
    mockPostRejects = true;
    await fireEvent.press(tree.getByRole("button", { name: "تفعيل الإشعارات" }));
    await flushAsyncWork(10);
    expect(tree.queryByText("مُنح الإذن — تعذّر تسجيل الجهاز.")).not.toBeNull();
    expect(tree.queryByRole("button", { name: "إعادة المحاولة" })).not.toBeNull();

    // The retry succeeds → the card disappears (granted + registered).
    mockPostRejects = false;
    await fireEvent.press(tree.getByRole("button", { name: "إعادة المحاولة" }));
    await flushAsyncWork(10);
    expect(tree.queryByText("مُنح الإذن — تعذّر تسجيل الجهاز.")).toBeNull();
  });

  it("granted + registered → no card at all", async () => {
    mockPermission = { granted: true, canAskAgain: true };
    const tree = await mountSettled(() => <PushActivationCard />);
    expect(tree.queryByText("إشعارات فورية على جهازك")).toBeNull();
  });
});

/* ── 3. the source-pinned wiring (trees jest cannot mount) ─────────── */

describe("the wiring the jest env cannot render (source-pinned)", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");

  it("the inbox opening is the badge eraser (markInboxOpened on mount)", () => {
    const src = readFileSync(require.resolve("../features/notifications/NotificationsScreen"), "utf8");
    expect(src).toContain("markInboxOpened()");
  });

  it("the entry router (app/index) consumes the parked launch link behind the auth guard", () => {
    const src = readFileSync(require.resolve("../../app/index"), "utf8");
    expect(src).toContain("takePendingDeepLink");
    expect(src).toContain("resolveEntryDestination");
  });
});
