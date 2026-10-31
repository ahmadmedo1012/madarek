/**
 * R326 M1.2 — THE RENDER NET: every route screen mounts once, with the
 * API/telemetry/storage transports mocked (setup.ts), signed OUT.
 *
 * What this catches in seconds, per route:
 *   · import-time crashes (module-scope Intl, top-level throws)
 *   · render-time crashes (undefined field access on the empty envelope,
 *     missing providers, bad hooks usage)
 *   · the exact class of the owner's post-login white-screen
 *
 * What it does NOT claim: pixel output, navigation behavior, or the
 * signed-in states — those are Maestro/EAS and W-track scope. This net
 * only proves: no route screen explodes when it renders.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

/* ── discover every route file under app/ (the file-based router) ───── */

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
const SKIP = [
  "_layout.tsx", // the root navigator mounts the whole router tree — its
  // providers are mocked individually here instead (fonts/splash/updates).
];

type RouteCase = { name: string; file: string };

const routes: RouteCase[] = walk(APP)
  .filter((f) => !SKIP.some((s) => f.endsWith(s)))
  .map((file) => ({
    // stable, readable id: app/student/dashboard.tsx → student/dashboard
    name: file.slice(APP.length + 1).replace(/\.(tsx|ts)$/, ""),
    file,
  }));

expect(routes.length).toBeGreaterThan(100); // the app has 123 route files

/* ── the harness ────────────────────────────────────────────────────── */

function mountRoute(Component: React.ComponentType): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Component />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  // Auto-cleanup (RTL globals mode) unmounts after the test — the crash
  // class usually lives in mount + the first async resolution.
}

describe("every route screen renders without crashing (the render net)", () => {
  test.each(routes)("route: %s", (route) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(route.file) as { default?: unknown };
    const Component = mod.default;
    expect(typeof Component).toBe("function");
    // Suppress the console noise a first-render of 123 screens produces
    // (virtualized-list warnings, etc.) — failures still throw loudly.
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      mountRoute(Component as React.ComponentType);
    } finally {
      spy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
