/**
 * Madarek API client — typed transport for https://madarek-nine.vercel.app/api/v1.
 *
 * Backend contract (backend/src/app.ts + lib/errors.ts):
 *   success:   { data: T }            paginated: { data: T[], meta }
 *   error:     { error: { code, message, details? } }
 *   auth:      Authorization: Bearer <accessToken> (15-min JWT)
 *   refresh:   POST /auth/refresh with Cookie: mdrk_refresh=<token>
 *              (httpOnly on web; the native client captures Set-Cookie and
 *               persists the value via SecureStore — no backend change needed).
 *
 * CORS: native requests carry no Origin header → allowed by the backend
 * allow-list policy (origin omitted ⇒ pass).
 */
import { AppNotification, PageMeta, Paginated } from "./types";

export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  "https://madarek-nine.vercel.app/api/v1";

/* R351 X3 — origin failover: the remote config owns an ORDERED list of
 * API origins; the base below resolves through it. The build-time
 * API_BASE above stays the bundled default (telemetry/updates read it
 * at import; the flip at a hosting move re-bakes it in the workflows
 * anyway) — installed builds that never update get flipped by the
 * remote config instead of a rebuild. */
import { getActiveOrigin, markOriginFailed } from "../lib/remote-config";

/** The active base: healthy origin + /api/v1. */
export function apiBase(): string {
  return `${getActiveOrigin()}/api/v1`;
}

/** True when the failure class justifies an origin switch: transport
 *  (nothing reached the app) or the platform proxy's 502/503/504 (the
 *  app never processed the request). A 4xx/5xx FROM the app is an
 *  answered refusal — failover must never retry it elsewhere. */
function isFailoverClass(err: unknown, status?: number): boolean {
  if (status !== undefined && (status === 502 || status === 503 || status === 504)) return true;
  // fetch throws TypeError on network faults (RN surfaces "Network
  // request failed"); ApiError/AbortError are answered/timeout classes.
  return err instanceof TypeError;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Offline / DNS / server-unreachable normalization with an Arabic message. */
export const NETWORK_ERROR = "NETWORK";
const networkMessage = "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.";

export interface ApiAuthBridge {
  getAccessToken(): string | null;
  getRefreshCookie(): string | null;
  onSessionUpdate(payload: { user: unknown; accessToken: string; refreshCookie?: string | null }): void;
  onSessionExpired(): void;
}

let authBridge: ApiAuthBridge | null = null;
export function registerAuthBridge(bridge: ApiAuthBridge) {
  authBridge = bridge;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Raw body for binary payloads (PDF uploads). */
  rawBody?: ArrayBuffer | string;
  contentType?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  /** Auth-refresh retry is internal; guards one retry per request. */
  _isRetry?: boolean;
  _skipAuth?: boolean;
  /** R350 H4 — the cold-boot wake retry attempt (GET/HEAD only). */
  _wakeAttempt?: number;
  /** R351 X3 — the origin-failover retry guard (one switch per request). */
  _failoverAttempt?: boolean;
}

/* R350 H4 — the wake-retry budget: 3 retries (3s/8s/15s) with a 12s
 * retry timeout — the worst case ≈60s, the calm-Boot contract. */
const WAKE_RETRY_DELAYS_MS = [3_000, 8_000, 15_000] as const;
const WAKE_RETRY_TIMEOUT_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = path.startsWith("http") ? path : `${apiBase()}${path}`;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

function extractRefreshCookie(res: Response): string | null {
  const raw =
    res.headers.get("set-cookie") ??
    (res.headers as unknown as Record<string, string>)["Set-Cookie"] ??
    "";
  if (!raw) return null;
  const m = /mdrk_refresh=([^;]+)/.exec(Array.isArray(raw) ? raw.join("; ") : raw);
  return m ? m[1] : null;
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new ApiError("BAD_JSON", text.slice(0, 200) || "استجابة غير صالحة", res.status);
      }
      throw new ApiError("BAD_JSON", "استجابة غير صالحة من الخادم", res.status, text.slice(0, 200));
    }
  }
  const obj = parsed as { error?: { code?: string; message?: string; details?: unknown }; data?: unknown } | null;
  if (!res.ok) {
    const code = obj?.error?.code ?? (res.status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR");
    const message = obj?.error?.message ?? `فشل الطلب (رمز ${res.status})`;
    throw new ApiError(code, message, res.status, obj?.error?.details);
  }
  // R327 A4 — unwrap the envelope by KEY PRESENCE, not truthiness:
  // `{ data: null }` must resolve to null. The old `obj?.data ?? obj`
  // returned the whole envelope (truthy!) for explicit data:null, so any
  // screen reading `q.data?.field.sub` crashed with "reading 'sub' of
  // undefined" — the post-login white-screen class on real devices
  // (e.g. /me/resume legitimately returns { data: null } for fresh users).
  if (obj !== null && typeof obj === "object" && "data" in obj) {
    return obj.data as T;
  }
  return obj as T;
}

/** Single-flight refresh — concurrent 401s share one /auth/refresh call. */
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const bridge = authBridge;
  if (!bridge) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const cookie = bridge.getRefreshCookie();
      if (!cookie) return false;
      try {
        const res = await fetch(`${apiBase()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `mdrk_refresh=${cookie}` },
          body: "{}",
        });
        if (!res.ok) return false;
        const data = await parseEnvelope<{ user: unknown; accessToken: string }>(res);
        const newCookie = extractRefreshCookie(res);
        bridge.onSessionUpdate({ user: data.user, accessToken: data.accessToken, refreshCookie: newCookie ?? cookie });
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, rawBody, contentType, query, timeoutMs = 20_000, _isRetry, _skipAuth, _wakeAttempt = 0, _failoverAttempt = false } = opts;
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {};
  if (rawBody === undefined && body !== undefined) headers["Content-Type"] = "application/json";
  if (contentType) headers["Content-Type"] = contentType;
  const token = authBridge?.getAccessToken();
  if (token && !_skipAuth) headers["Authorization"] = `Bearer ${token}`;
  // Replay the refresh cookie on auth-family requests (login/refresh benefit;
  // harmless elsewhere, and refresh REQUIRES it).
  const refreshCookie = authBridge?.getRefreshCookie();
  if (refreshCookie) headers["Cookie"] = `mdrk_refresh=${refreshCookie}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (res.status === 401 && !_isRetry && !path.startsWith("/auth/")) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return api<T>(path, { ...opts, _isRetry: true });
      }
      authBridge?.onSessionExpired();
      throw new ApiError("UNAUTHENTICATED", "انتهت صلاحية الجلسة — سجّل الدخول من جديد", 401);
    }
    return await parseEnvelope<T>(res);
  } catch (err) {
    /* R350 H4 — the cold-boot wake retry. The free-tier server can take
     * 25–60s to boot; a GET/HEAD that dies on TRANSPORT (timeout /
     * network fault — no HTTP answer) re-enters after a bounded backoff
     * (3s/8s/15s, retry timeout 12s; total worst case ≈60s, matching the
     * calm Boot copy «قد يستغرق لحظات»). Writes are NEVER blind-retried;
     * a server that answered (any status) is awake — the error paths
     * above stay honest. The splash/Boot screen keeps its slow label the
     * whole window because the request is still pending — no error flash. */
    const isTransport =
      !(err instanceof ApiError) &&
      ((err as { name?: string })?.name === "AbortError" || (err as { message?: string })?.message === "Network request failed");
    if (method === "GET" && isTransport && _wakeAttempt < WAKE_RETRY_DELAYS_MS.length) {
      await sleep(WAKE_RETRY_DELAYS_MS[_wakeAttempt]);
      return api<T>(path, { ...opts, _wakeAttempt: _wakeAttempt + 1, timeoutMs: WAKE_RETRY_TIMEOUT_MS });
    }
    /* R351 X3 — origin failover, the LAST resort after the wake budget:
     * a transport-faulted GET (the origin never answered — a dead
     * origin, not a waking one) switches to the next healthy origin
     * from the remote config. Writes never failover here: a transport
     * fault on a POST is ambiguous (it may have landed) — the K2
     * idempotency-key work extends failover to writes safely. */
    if (!_failoverAttempt && method === "GET" && isTransport) {
      const current = getActiveOrigin();
      const next = markOriginFailed(current);
      if (next && current !== next) {
        return api<T>(path, { ...opts, _failoverAttempt: true });
      }
    }
    /* R351 X3 — the proxy-failure failover (502/503/504, any verb):
     * the platform answered, the APP never processed the request —
     * switching origins can never double-apply a write. Runs after the
     * wake budget (a waking origin 503s for <60 s; only a genuinely
     * unavailable one outlives it). */
    if (
      !_failoverAttempt &&
      err instanceof ApiError &&
      (err.status === 502 || err.status === 503 || err.status === 504)
    ) {
      const current = getActiveOrigin();
      const next = markOriginFailed(current);
      if (next && next !== current) {
        return api<T>(path, { ...opts, _failoverAttempt: true });
      }
    }
    if (err instanceof ApiError) throw err;
    if ((err as { name?: string })?.name === "AbortError") {
      throw new ApiError("TIMEOUT", "انتهت مهلة الطلب — الخادم بطيء، أعد المحاولة", 0);
    }
    throw new ApiError(NETWORK_ERROR, networkMessage, 0);
  } finally {
    // R327 A4: the timeout timer MUST be cleared — it was leaking a live
    // 20s handle (and the AbortController) on every request.
    clearTimeout(timer);
  }
}

/** Capture a fresh refresh cookie from a session-establishing response. */
export async function apiWithCookieCapture<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; refreshCookie: string | null }> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = {};
  if (opts.rawBody === undefined && opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.contentType) headers["Content-Type"] = opts.contentType;
  const token = authBridge?.getAccessToken();
  if (token && !opts._skipAuth) headers["Authorization"] = `Bearer ${token}`;
  const cookie = authBridge?.getRefreshCookie();
  if (cookie) headers["Cookie"] = `mdrk_refresh=${cookie}`;
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.rawBody !== undefined ? opts.rawBody : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401 && path.startsWith("/auth/") === false) {
      // fall through to envelope handling
    }
    const data = await parseEnvelope<T>(res);
    return { data, refreshCookie: extractRefreshCookie(res) };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(NETWORK_ERROR, networkMessage, 0);
  }
}

export const get = <T>(path: string, query?: RequestOptions["query"]) => api<T>(path, { method: "GET", query });
export const post = <T>(path: string, body?: unknown, extra?: Partial<RequestOptions>) =>
  api<T>(path, { method: "POST", body, ...extra });
export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body });
export const put = <T>(path: string, body?: unknown) => api<T>(path, { method: "PUT", body });
export const del = <T>(path: string, body?: unknown) => api<T>(path, { method: "DELETE", body });

/** Paginated GET returning rows + meta. */
export async function getPage<T>(path: string, query?: RequestOptions["query"]): Promise<Paginated<T>> {
  const direct = await api<{ data: T[]; meta: PageMeta }>(path, { method: "GET", query });
  if (direct && Array.isArray((direct as { data?: T[] }).data ?? undefined) && (direct as { meta?: PageMeta }).meta) {
    return direct as { data: T[]; meta: PageMeta };
  }
  // Some endpoints return bare arrays without meta.
  const rows = direct as unknown as T[];
  return {
    data: Array.isArray(rows) ? rows : [],
    meta: { page: 1, limit: 0, total: Array.isArray(rows) ? rows.length : 0, totalPages: 1 },
  };
}

/** Full URL for a relative file path (e.g. /api/v1/files/papers/x.pdf). */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/v1/")) return `${apiBase()}${path.slice("/api/v1".length)}`;
  if (path.startsWith("/")) return `${apiBase()}${path}`;
  return path;
}

export type { AppNotification };
