/**
 * R326 M1.1 — crash & error telemetry.
 *
 * Fire-and-forget POST /client-errors (additive backend route). This module
 * must NEVER throw and NEVER trigger the auth/refresh machinery — telemetry
 * dies silently if it cannot send. Carries route, role, app version, OTA
 * update id, device model/OS and a small breadcrumb ring (navigation + API
 * failures) so a crash report shows what led up to it.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  "https://madarek-nine.vercel.app/api/v1";

export type ClientErrorKind = "crash" | "js_error" | "unhandled_rejection" | "api_error" | "render";

export interface ClientErrorReport {
  kind: ClientErrorKind;
  message: string;
  route?: string;
  role?: string;
  stack?: string | null;
  breadcrumbs?: string[];
  appVersion?: string;
  updateId?: string | null;
  runtimeVersion?: string | null;
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
}

/* ── breadcrumbs ─────────────────────────────────────────────────────── */

const CRUMB_MAX = 30;
const crumbs: string[] = [];

export function crumb(event: string): void {
  try {
    const t = new Date().toISOString().slice(11, 19);
    crumbs.push(`${t} ${event}`);
    if (crumbs.length > CRUMB_MAX) crumbs.shift();
  } catch {
    /* never */
  }
}

/* ── send ────────────────────────────────────────────────────────────── */

let lastSendAt = 0;

async function updateMeta(): Promise<{ updateId: string | null; runtimeVersion: string | null }> {
  try {
    const Updates = await import("expo-updates");
    return {
      updateId: Updates.updateId ?? null,
      runtimeVersion: Updates.runtimeVersion ?? null,
    };
  } catch {
    return { updateId: null, runtimeVersion: null };
  }
}

/** Report a client error. Safe to call from anywhere, including crash paths. */
export async function reportClientError(report: {
  kind: ClientErrorKind;
  message: string;
  stack?: string | null;
  route?: string;
}): Promise<void> {
  try {
    // Rate-limit: at most one telemetry POST per second (crash storms must
    // not DDoS the backend or the app).
    const now = Date.now();
    if (now - lastSendAt < 1000) return;
    lastSendAt = now;

    const meta = await updateMeta();
    const payload: ClientErrorReport = {
      kind: report.kind,
      message: String(report.message).slice(0, 2000),
      stack: report.stack ? String(report.stack).slice(0, 8000) : null,
      route: report.route,
      role: currentRole,
      breadcrumbs: [...crumbs],
      appVersion:
        Constants.expoConfig?.version ??
        (Constants.manifest as { version?: string } | undefined)?.version ??
        "unknown",
      updateId: meta.updateId,
      runtimeVersion: meta.runtimeVersion,
      deviceModel: Device.modelName ?? "unknown",
      osName: Platform.OS,
      osVersion: Platform.Version != null ? String(Platform.Version) : undefined,
    };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}/client-errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      // R349 M1.5 — a non-OK answer means the report did NOT land;
      // queue it for the next launch's drain (crashPersist owns the
      // queue; dynamic import avoids the telemetry↔crashPersist cycle).
      if (!res.ok) {
        const { enqueuePendingReport } = await import("./crashPersist");
        void enqueuePendingReport({
          kind: report.kind,
          message: report.message,
          stack: report.stack,
          route: report.route,
          queuedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Network failure / death race — same queue (best effort; a
      // hard SIGABRT still outruns every JS write — the sentinel in
      // crashPersist is the net that catches those).
      try {
        const { enqueuePendingReport } = await import("./crashPersist");
        void enqueuePendingReport({
          kind: report.kind,
          message: report.message,
          stack: report.stack,
          route: report.route,
          queuedAt: new Date().toISOString(),
        });
      } catch {
        /* never */
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* telemetry must never throw */
  }
}

/* ── current role/route (set by the app shell) ───────────────────────── */

let currentRole: string | undefined;
let currentRoute: string | undefined;

export function setTelemetryContext(ctx: { role?: string; route?: string }): void {
  if (ctx.role !== undefined) currentRole = ctx.role;
  if (ctx.route !== undefined) {
    currentRoute = ctx.route;
    crumb(`nav ${ctx.route}`);
    // R349 M1.5 — keep the unclean-exit sentinel's route fresh so a
    // synthesized crash report names where the session died.
    void import("./crashPersist").then((m) => m.touchSentinelRoute()).catch(() => undefined);
  }
}

export function getTelemetryRoute(): string | undefined {
  return currentRoute;
}

/* ── global handlers ─────────────────────────────────────────────────── */

/** Install global JS exception + rejection handlers (idempotent). */
export function installGlobalErrorHandlers(): void {
  try {
    const g = globalThis as unknown as {
      ErrorUtils?: {
        setGlobalHandler?: (h: (error: unknown, isFatal: boolean) => void) => void;
        getGlobalHandler?: () => ((error: unknown, isFatal: boolean) => void) | undefined;
      };
      onunhandledrejection?: ((event: { reason?: unknown }) => void) | undefined;
      __mdrkHandlersInstalled?: boolean;
      __mdrkRejectionHooked?: boolean;
    };
    if (typeof g.ErrorUtils?.setGlobalHandler === "function" && !g.__mdrkHandlersInstalled) {
      const previous = g.ErrorUtils.getGlobalHandler?.();
      g.ErrorUtils.setGlobalHandler((error: unknown, isFatal: boolean) => {
        const err = error as Error | undefined;
        void reportClientError({
          kind: isFatal ? "crash" : "js_error",
          message: err?.message ?? String(error),
          stack: err?.stack,
          route: getTelemetryRoute(),
        });
        previous?.(error, isFatal);
      });
      g.__mdrkHandlersInstalled = true;
    }
    // Hermes ships onunhandledrejection support on RN ≥ 0.73-ish; set it
    // defensively — if the hook doesn't exist this is a no-op.
    if (typeof g.onunhandledrejection === "undefined" || !g.__mdrkRejectionHooked) {
      g.onunhandledrejection = (event: { reason?: unknown }) => {
        const reason = event?.reason;
        const err = reason instanceof Error ? reason : undefined;
        void reportClientError({
          kind: "unhandled_rejection",
          message: err?.message ?? String(reason ?? "unhandled rejection"),
          stack: err?.stack,
          route: getTelemetryRoute(),
        });
      };
      g.__mdrkRejectionHooked = true;
    }
  } catch {
    /* never */
  }
}
