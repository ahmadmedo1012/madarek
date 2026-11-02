/**
 * R326 M1.2 — the global test setup: every transport that touches the
 * network, storage, or native runtime is mocked BEFORE any route module
 * imports. A route screen under test must never depend on a live API,
 * SecureStore, fonts, or the update runtime.
 */
// R327 A4 — suites flip POISON (see ./poison.ts); "ok" is the render-net baseline.
import { POISON } from "./poison";

/* ── network: the API transport + telemetry fire-and-forget ─────────── */

const EMPTY_PAGE = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

/** A fetch-Response-shaped object (the RN jest env has no Response). */
function ok(body: unknown): unknown {
  const payload = JSON.stringify(body ?? { data: null });
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => JSON.parse(payload),
    text: async () => payload,
  };
}

// Per-test override point: tests may set MOCK_ROUTER_PARAMS before render.
export const MOCK_ROUTER_PARAMS: Record<string, string | string[] | undefined> = {};

globalThis.fetch = jest.fn((_input: RequestInfo | URL) => {
  const url = typeof _input === "string" ? _input : _input.toString();
  const kind = POISON.kind;
  // Poisoned modes — every transport failure the production API can produce.
  if (kind === "garbage") {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
      json: async () => {
        throw new Error("not json");
      },
      text: async () => "<html>gateway error page — not json</html>",
    });
  }
  if (kind === "401" || kind === "500") {
    const status = kind === "401" ? 401 : 500;
    const body = {
      error: {
        code: status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR",
        message: status === 401 ? "انتهت صلاحية الجلسة — سجّل الدخول من جديد" : "خطأ في الخادم",
      },
    };
    const payload = JSON.stringify(body);
    return Promise.resolve({
      ok: false,
      status,
      headers: { get: () => null },
      json: async () => body,
      text: async () => payload,
    });
  }
  if (kind === "missing-fields") {
    return Promise.resolve(ok({ data: {} }));
  }
  if (kind === "null-data") {
    return Promise.resolve(ok(null));
  }
  if (kind === "empty-list") {
    return Promise.resolve(ok(EMPTY_PAGE));
  }
  // "ok" — the baseline: paginated list endpoints → an honest empty page;
  // everything else → { data: null } (the API envelope). Screens must handle
  // both without crashing — exactly the render-time crash class this net catches.
  if (/\/(notifications|announcements|feedback|messages|alerts)/.test(url)) {
    return Promise.resolve(ok(EMPTY_PAGE));
  }
  return Promise.resolve(ok(null));
}) as unknown as typeof fetch;

/* ── storage ────────────────────────────────────────────────────────── */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

/* ── expo-notifications: the R327 C3 push client — deterministic stub. ─ */

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "" }),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 1 },
}));

/* ── expo-local-authentication: the R327 C3 biometric lock —
      deterministic stub (no hardware under jest; the gate stays
      unlocked because SecureStore flag reads null). ─ */
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([]),
  authenticateAsync: jest.fn().mockResolvedValue({ success: false }),
  cancelAuthenticate: jest.fn().mockResolvedValue(true),
}));

/* ── reanimated: R327 C4 removed it; R331 A-App-Shell lays the foundation
      back in (reanimated 4 + worklets — deps only, no consumer yet:
      A-App-Motion owns the migration). The official mock keeps the render
      net green the moment motion components start importing it. ─ */

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));

/* ── safe-area: the REAL provider only renders children after the native
      onInsetsChange event — which NEVER fires under jest, silently
      hollowing every mount. The official mock is a passthrough context
      with zero insets, so screens actually render in the nets (R327 A2). ─ */

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

/* ── fonts / splash / updates runtime ───────────────────────────────── */

jest.mock("expo-font", () => ({
  useFonts: jest.fn().mockReturnValue([true]),
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-updates", () => ({
  checkForUpdateAsync: jest.fn().mockResolvedValue({ isAvailable: false }),
  fetchUpdateAsync: jest.fn().mockResolvedValue(undefined),
  reloadAsync: jest.fn().mockResolvedValue(undefined),
  updateId: "test-update-id",
  runtimeVersion: "test-runtime",
  channel: "test",
  isEmbeddedUpdate: false,
}));

/* ── router: hooks the screens read at render time ──────────────────── */

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canDismiss: jest.fn().mockReturnValue(false),
  dismissTo: jest.fn(),
  dismissAll: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
};

// Full mock (NO requireActual — the real expo-router pulls native
// navigation modules that cannot boot under jest). Every export the app
// uses is mocked; the render net only proves screens don't crash.
jest.mock("expo-router", () => {
  const React = require("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    children ?? null;
  const Stack = Object.assign(Passthrough, { Screen: () => null });
  return {
    Stack,
    Tabs: Stack,
    Slot: Passthrough,
    Redirect: () => null,
    Link: ({ children }: { children?: React.ReactNode }) => children ?? null,
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => ({ ...MOCK_ROUTER_PARAMS }),
    useGlobalSearchParams: () => ({ ...MOCK_ROUTER_PARAMS }),
    useSegments: () => [],
    usePathname: () => "/",
    useFocusEffect: (fn: unknown) => {
      const cb = fn as () => unknown;
      React.useEffect(() => {
        cb();
      }, []);
    },
  };
});

/* ── the real API client resolves through the mocked fetch; keep the
      query client deterministic and cache-quiesced ──────────────────── */

jest.mock("@/lib/queryClient", () => {
  const { QueryClient } = require("@tanstack/react-query");
  return {
    queryClient: new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    }),
  };
});

export {};

/* ── icons: lucide-react-native ships ESM-only (unusable under jest's
      CJS loader); stub every icon as a null component — the render net
      proves screens don't crash, not that glyphs paint ──────────────── */

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const stub = (name: string) => {
    const C = (props: unknown) => React.createElement("StubIcon", { name, ...props as object });
    C.displayName = name;
    return C;
  };
  return new Proxy({}, {
    get: (_t, name: string) => {
      if (name === "__esModule") return true;
      return stub(name);
    },
  });
});

/* ── R331 A-App-Motion: react-native-keyboard-controller mounts native
      modules at import (the "not linked" crash under jest). The render
      nets prove screens don't crash, not that pixels track — stub the
      provider/KAV/toolbar as pass-through components ────────────────── */
jest.mock("react-native-keyboard-controller", () => {
  const React = require("react");
  return {
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
    KeyboardAvoidingView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children ?? null),
    KeyboardToolbar: () => null,
    useKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }),
    useKeyboardState: () => ({ isVisible: false, height: 0 }),
  };
});
