/**
 * R327 A4 — THE POISONED NET: every route screen mounts once under each
 * hostile API mode (missing fields · empty lists · 401 · 500 · null data),
 * with the transports mocked (setup.ts). The crash contract:
 *
 *   a route may show a skeleton, an empty state, or a structured Arabic
 *   error with «إعادة المحاولة» — it may NEVER throw, and it may NEVER
 *   render a tree with no text (the white-screen class the owner saw).
 *
 * This is the CI half of the M1 proof; the device half is Maestro on EAS
 * (A1). Runs alongside the baseline render net — same walk, hostile feeds.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { POISON, type PoisonKind } from "./poison";
import { useSession } from "@/auth/session";

/* ── discover every route file under app/ (same walk as the render net) ─ */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

const APP = join(__dirname, "..", "..", "app");
const SKIP = ["_layout.tsx"];

const routes: { name: string; file: string }[] = walk(APP)
  .filter((f) => !SKIP.some((s) => f.endsWith(s)))
  .map((file) => ({
    name: file.slice(APP.length + 1).replace(/\.(tsx|ts)$/, ""),
    file,
  }));

expect(routes.length).toBeGreaterThan(100);

const POISONS: PoisonKind[] = ["null-data", "missing-fields", "empty-list", "401", "500"];

/* Every route module is required at FILE scope, not inside test bodies:
   the first tests of the walk otherwise pay the whole app-graph require
   (expo modules, reanimated/worklets, every shared screen) inside jest's
   30s per-test timeout — under Node 22 that cold load alone exceeds it
   (the CI Mobile-gates red of 2026-11-04) while the warm scenario runs
   in <100 ms. File-evaluation time is outside every per-test clock. */
const ROUTE_COMPONENTS: ReadonlyMap<string, unknown> = new Map(
  routes.map((r) => {
    const mod = require(r.file) as { default?: unknown };
    return [r.name, mod.default];
  }),
);

/* ── the harness ────────────────────────────────────────────────────── */

/** Microtask-only flush — fake timers keep refetchInterval from leaking. */
async function flushAsyncWork(rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function mountAndFlush(Component: React.ComponentType): Promise<void> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const tree = await render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Component />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  // Let the poisoned queries resolve and re-render with error/empty states —
  // the async crash window the baseline net does not cover.
  await flushAsyncWork();
  // The white-screen contract: SOME text renders (a label, a skeleton
  // caption, an Arabic error with retry). A tree with zero text nodes is
  // exactly the post-login white screen this gate exists to kill.
  expect(tree.toJSON()).not.toBeNull();
  expect(tree.queryAllByText(/[\s\S]/).length).toBeGreaterThan(0);
}

describe("every route survives hostile API responses (the poisoned net)", () => {
  beforeEach(() => {
    // refetchInterval must never leak real handles — but the scheduler
    // primitives stay real: faking setImmediate/queueMicrotask makes the
    // React/notifyManager drain pathological under Node 22 (the CI
    // Mobile-gates red of 2026-11-04 — 18–30 s IDLE wall-clock waits per
    // test while every assert itself runs in <1 ms).
    jest.useFakeTimers({ doNotFake: ["setImmediate", "queueMicrotask"] });
    POISON.kind = "ok";
    useSession.setState({
      user: null,
      accessToken: null,
      refreshCookie: null,
      activeInstitutionId: null,
      isHydrated: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each(routes.flatMap((r) => POISONS.map((k) => [r.name, k] as const)))(
    "route %s × poison %s",
    async (route, kind) => {
       
      const Component = ROUTE_COMPONENTS.get(route);
      expect(typeof Component).toBe("function");
      POISON.kind = kind;
      const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        await mountAndFlush(Component as React.ComponentType);
      } finally {
        spy.mockRestore();
        warnSpy.mockRestore();
        POISON.kind = "ok";
      }
    },
  );
});
