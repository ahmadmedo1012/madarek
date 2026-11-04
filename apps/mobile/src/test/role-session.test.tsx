/**
 * R327 A2 — THE POST-LOGIN CONTRACT, per role.
 *
 * The owner's device crash: log in → /auth/me returns null / missing fields
 * → white screen. This suite pins the contract for EVERY role:
 *
 *   with a session set and the API hostile (null /me · missing fields ·
 *   401 · 500 · non-JSON), the role home — and the entry screens — render
 *   a real tree with text (content, skeleton, or the structured Arabic
 *   error with «إعادة المحاولة»). NEVER a white screen, NEVER a throw.
 *
 * The device half of the proof is Maestro on EAS (A1); this is the CI half
 * that runs on every push.
 */
import React from "react";
import { render, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { POISON, type PoisonKind } from "./poison";
import { useSession } from "@/auth/session";

import type { AppRole, AuthUser } from "@/api/types";

// R331 A-App-Shell — the role homes moved INTO each role's `(tabs)` group
// (the persistent bar); the URL space is unchanged (groups add no segment),
// but the FILE path for the route module gained the group directory.
const ROLES: { role: AppRole; home: string }[] = [
  { role: "STUDENT", home: "student/(tabs)/dashboard" },
  { role: "TEACHER", home: "teacher/(tabs)/dashboard" },
  { role: "ADMIN", home: "admin/(tabs)/dashboard" },
  { role: "QUALITY", home: "quality/(tabs)/dashboard" },
  { role: "OWNER", home: "owner/(tabs)/dashboard" },
];

const POISONS: PoisonKind[] = ["null-data", "missing-fields", "empty-list", "401", "500", "garbage"];

function makeUser(role: AppRole): AuthUser {
  return {
    id: "u-r327",
    email: `${role.toLowerCase()}@test.ly`,
    role,
    firstName: "تجربة",
    lastName: "مدارك",
    memberships: [
      {
        institutionId: "inst-1",
        name: "الجامعة التجريبية",
        slug: "test-university",
        role,
        isActive: true,
      },
    ],
    currentInstitution:
      role === "OWNER"
        ? null // OWNER is platform-level by design — no institution
        : { id: "inst-1", name: "الجامعة التجريبية", slug: "test-university" },
    membershipRole: role,
  };
}

/** Microtask-only flush — fake timers keep refetchInterval from leaking. */
async function flushAsyncWork(rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/** The post-login mount: session set → hostile API → assert the contract. */
async function mountSignedIn(
  Component: React.ComponentType,
  role: AppRole,
): Promise<Awaited<ReturnType<typeof render>>> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  useSession.setState({
    user: makeUser(role),
    accessToken: "test-access",
    refreshCookie: "test-refresh",
    activeInstitutionId: "inst-1",
    isHydrated: true,
  });
  const tree = await render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Component />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  await flushAsyncWork();
  return tree;
}

function expectNotWhiteScreen(tree: Awaited<ReturnType<typeof render>>): void {
  expect(tree.toJSON()).not.toBeNull();
  // Some text node exists — content, skeleton label, or the structured
  // Arabic error. A zero-text tree is the white-screen class.
  expect(tree.queryAllByText(/[\s\S]/).length).toBeGreaterThan(0);
}

 
function routeModule(rel: string): React.ComponentType {
  const mod = require(`../../app/${rel}`) as { default?: unknown };
  expect(typeof mod.default).toBe("function");
  return mod.default as React.ComponentType;
}
 
/* The route modules are required at FILE scope, not inside test bodies:
   the first mount pays the whole app-graph require (expo modules,
   reanimated/worklets, every shared screen). Under Node 22 that cold
   load alone crosses jest's 30s per-test timeout (the CI Mobile-gates
   red of 2026-11-04) even though the scenario itself runs in <100 ms
   warm. File-evaluation time is outside every per-test clock. */
const ROUTE_COMPONENTS: Record<string, React.ComponentType> = Object.fromEntries(
  [...new Set([...ROLES.map((r) => r.home), "index", "auth/index", "select-institution"])].map(
    (rel) => [rel, routeModule(rel)],
  ),
);
const routeComponent = (rel: string): React.ComponentType => ROUTE_COMPONENTS[rel]!;

describe("A2 — post-login survival, per role (hostile /me and everything else)", () => {
  let spy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // refetchInterval must never leak real handles — but the scheduler
    // primitives stay real: faking setImmediate/queueMicrotask makes the
    // React/notifyManager drain pathological under Node 22 (the CI
    // Mobile-gates red of 2026-11-04 — 18–30 s IDLE wall-clock waits per
    // test while every assert itself runs in <1 ms).
    jest.useFakeTimers({ doNotFake: ["setImmediate", "queueMicrotask"] });
    POISON.kind = "ok";
    spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    spy.mockRestore();
    warnSpy.mockRestore();
    POISON.kind = "ok";
    useSession.setState({
      user: null,
      accessToken: null,
      refreshCookie: null,
      activeInstitutionId: null,
      isHydrated: true,
    });
  });

  test.each(ROLES.flatMap((r) => POISONS.map((k) => [r.role, k] as const)))(
    "role %s home × poison %s — renders, never white",
    async (role, kind) => {
      POISON.kind = kind;
      const home = ROLES.find((r) => r.role === role)!.home;
      const tree = await mountSignedIn(routeComponent(home), role);
      expectNotWhiteScreen(tree);
    },
  );

  test.each(POISONS)("entry / (welcome with session) × poison %s — renders, never white", async (kind) => {
    POISON.kind = kind;
    const tree = await mountSignedIn(routeComponent("index"), "STUDENT");
    expectNotWhiteScreen(tree);
  });

  test.each(POISONS)("/auth screen × poison %s — renders, never white", async (kind) => {
    POISON.kind = kind;
    const tree = await mountSignedIn(routeComponent("auth/index"), "STUDENT");
    expectNotWhiteScreen(tree);
  });

  test.each(["STUDENT", "TEACHER", "ADMIN", "QUALITY"] as const)(
    "%s without institution → /select-institution renders, never white",
    async (role) => {
      POISON.kind = "missing-fields";
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
      });
      useSession.setState({
        user: { ...makeUser(role), currentInstitution: null, memberships: [] },
        accessToken: "t",
        isHydrated: true,
      });
      const Picker = routeComponent("select-institution");
      const tree = await render(
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <Picker />
          </SafeAreaProvider>
        </QueryClientProvider>,
      );
      await flushAsyncWork();
      expectNotWhiteScreen(tree);
    },
  );
});
