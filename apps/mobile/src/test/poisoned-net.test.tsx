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
    jest.useFakeTimers(); // refetchInterval must never leak real handles
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(
        routes.find((r) => r.name === route)!.file,
      ) as { default?: unknown };
      const Component = mod.default;
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
