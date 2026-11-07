import { useAuthStore } from '../stores/auth.store';
import type {
  AppRole,
  AuthUser,
  SessionInstitutionExtras,
} from '../stores/auth.store';
import { queryClient } from './queryClient';
import { wakeRequestStart, wakeRequestSettle } from './serverWake';

/* ── r178: institution domain (multi-institution foundation) ────────
 *
 * Typed helpers for the auth + institution API surface the backend
 * ships in this round (institution.routes.ts + auth select-institution).
 * Same envelope contract as every other call: `{ data: ... }` unwrapped
 * via `unwrap` — these are plain functions (not hooks) so pages and
 * hooks compose them exactly like the rest of this file's callers. */

/** The auth user payload as the r178 auth module serializes it: the
 *  bare user plus the institution session context fields. */
export type AuthSessionUser = AuthUser & Partial<SessionInstitutionExtras>;

/** Login / register / refresh / select-institution response body. */
export interface AuthSessionResponse {
  user: AuthSessionUser;
  accessToken: string;
}

/** GET /institutions (PUBLIC) row — active institutions, ordered by
 *  name, minimal projection. Used by the register page's institution
 *  step and anywhere a light institution list is needed. */
export interface PublicInstitution {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

/** GET /owner/institutions admin row — an ADMIN membership of the
 *  institution (revoked rows included and flagged, so the console can
 *  offer restore). */
export interface InstitutionAdminRow {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipId: string;
  isActive: boolean;
}

/** GET /owner/institutions row. */
export interface OwnerInstitution {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  activeMembershipCount: number;
  facultyCount: number;
  admins: InstitutionAdminRow[];
}

/** Membership projection returned by the provision/revoke/restore
 *  mutations. */
export interface InstitutionMembershipRow {
  id: string;
  userId: string;
  institutionId: string;
  role: AppRole;
  isActive: boolean;
}

export interface CreateInstitutionInput {
  name: string;
  nameEn?: string;
  /** Optional — the server derives one from nameEn (or a random
   *  fallback) when omitted; 409 CONFLICT on a taken slug. */
  slug?: string;
}

export interface UpdateInstitutionInput {
  name?: string;
  nameEn?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export interface ProvisionAdminInput {
  mode: 'new' | 'existing';
  email: string;
  firstName?: string;
  lastName?: string;
  /** Required when mode='new' (the shared password policy applies). */
  password?: string;
}

/** POST /auth/select-institution — Bearer auth; the server verifies the
 *  active membership itself and mints a new access token carrying the
 *  `inst` claim. 403 INSTITUTION_CONTEXT_INVALID when not a member. */
export function selectInstitution(institutionId: string): Promise<AuthSessionResponse> {
  return unwrap<AuthSessionResponse>(api.post('/auth/select-institution', { institutionId }));
}

/* ── R320 §D (PAGES-GAP §5): the forgot-password flow ──────────────
 *
 * Both calls are SESSION-NEUTRAL by design: the backend answers a
 * byte-identical generic 200 envelope whether the email is registered
 * or not (no enumeration), and ONE generic Arabic 400 for every dead
 * token (unknown / expired / used — no token-oracle). The dev-inbox
 * link rides the success envelope ONLY for existing @test.ly demo
 * accounts; its absence means nothing the page is allowed to reveal. */

/** POST /auth/forgot-password response body (`data` envelope unwrapped). */
export interface ForgotPasswordResponse {
  /** The generic no-enumeration copy — identical for known and unknown. */
  message: string;
  /** Test-mode delivery (@test.ly existing accounts only, dev-only). */
  devInbox?: { mode: 'test'; url: string };
}

/** POST /auth/reset-password response body (`data` envelope unwrapped). */
export interface ResetPasswordResponse {
  ok: boolean;
}

/** POST /auth/forgot-password — always 200 with the generic envelope. */
export function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return unwrap<ForgotPasswordResponse>(api.post('/auth/forgot-password', { email }));
}

/** POST /auth/reset-password — 400 BAD_REQUEST with ONE generic Arabic
 *  message for unknown/expired/used tokens (no token-oracle). */
export function resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
  return unwrap<ResetPasswordResponse>(api.post('/auth/reset-password', { token, password }));
}

/** GET /institutions — public listing of ACTIVE institutions. */
export function listPublicInstitutions(): Promise<PublicInstitution[]> {
  return unwrap<PublicInstitution[]>(api.get('/institutions'));
}

/** GET /owner/institutions — OWNER console listing with counts + admins. */
export function listOwnerInstitutions(): Promise<OwnerInstitution[]> {
  return unwrap<OwnerInstitution[]>(api.get('/owner/institutions'));
}

/** POST /owner/institutions — 201 on success, 409 on slug conflict. */
export function createInstitution(
  input: CreateInstitutionInput,
): Promise<{ institution: OwnerInstitution }> {
  return unwrap<{ institution: OwnerInstitution }>(api.post('/owner/institutions', input));
}

/** PATCH /owner/institutions/:id — name/nameEn/status (suspend/reactivate). */
export function updateInstitution(
  id: string,
  patch: UpdateInstitutionInput,
): Promise<{ institution: OwnerInstitution }> {
  return unwrap<{ institution: OwnerInstitution }>(api.patch(`/owner/institutions/${id}`, patch));
}

/** POST /owner/institutions/:id/administrators — provision (or attach) an
 *  institutional ADMIN; 201 {user, membership}. */
export function provisionInstitutionAdmin(
  institutionId: string,
  input: ProvisionAdminInput,
): Promise<{ user: AuthUser; membership: InstitutionMembershipRow }> {
  return unwrap<{ user: AuthUser; membership: InstitutionMembershipRow }>(
    api.post(`/owner/institutions/${institutionId}/administrators`, input),
  );
}

/** POST /owner/institutions/:id/memberships/:membershipId/revoke */
export function revokeInstitutionMembership(
  institutionId: string,
  membershipId: string,
): Promise<{ membership: InstitutionMembershipRow }> {
  return unwrap<{ membership: InstitutionMembershipRow }>(
    api.post(`/owner/institutions/${institutionId}/memberships/${membershipId}/revoke`),
  );
}

/** POST /owner/institutions/:id/memberships/:membershipId/restore */
export function restoreInstitutionMembership(
  institutionId: string,
  membershipId: string,
): Promise<{ membership: InstitutionMembershipRow }> {
  return unwrap<{ membership: InstitutionMembershipRow }>(
    api.post(`/owner/institutions/${institutionId}/memberships/${membershipId}/restore`),
  );
}


/* ── r338/T-99d2: the transport — axios → native fetch ────────────
 *
 * r153b: exported for the few out-of-band calls that must survive
 * page unload (keepalive fetch in the lecture player's watch flush) —
 * they need the SAME base URL the client resolves.
 *
 * The axios dependency is gone from the bundle; every caller-visible
 * contract it provided is reproduced here at this boundary so no
 * caller changes: responses resolve the axios response shape
 * ({ data, status, statusText, headers, config }), rejections carry
 * the structural error contract the mappers read (`response.status`,
 * `response.data.error.{code,message}`, the literal 'Network Error'
 * message), JSON bodies are serialized and the `{ data }` envelope is
 * still unwrapped via `unwrap`. Upload-progress requests (fetch has
 * no upload progress) ride native XHR instead — zero deps either way. */
export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const baseURL = apiBaseURL;

const DEFAULT_TIMEOUT_MS = 20_000;

/** The slice of the old axios progress event the two upload hooks
 *  read (`e.loaded`, `e.total`). */
export interface ApiProgressEvent {
  loaded: number;
  total?: number;
}

/** The request-config surface this app's callers actually use — the
 *  fields the old axios instance supported, nothing more. */
export interface ApiRequestConfig {
  url?: string;
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';
  params?: Record<string, unknown> | URLSearchParams | string;
  data?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  onUploadProgress?: (event: ApiProgressEvent) => void;
  signal?: AbortSignal;
}

/** What every `api.*` method resolves — the axios response shape, so
 *  callers reading past `data` (the bulk-import raw-envelope reads,
 *  the 401 path) see no change. */
export interface ApiResponse<T = unknown> {
  data: T;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  config?: ApiRequestConfig;
}

/** What every failed request rejects with — structurally the axios
 *  error the app's mappers inspect. */
export class ApiError<T = unknown> extends Error {
  isAxiosError = true as const;
  code?: string;
  config?: ApiRequestConfig;
  response?: ApiResponse<T>;
  constructor(
    message: string,
    config?: ApiRequestConfig,
    code?: string,
    response?: ApiResponse<T>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.config = config;
    this.code = code;
    this.response = response;
  }
}

/** The transport seam tests install to simulate the network (the
 *  session suite used to reach for `api.defaults.adapter` on axios). */
export type ApiTransport = (config: ApiRequestConfig) => Promise<ApiResponse<unknown>>;

type InternalConfig = ApiRequestConfig & { __retried?: boolean };

let transportOverride: ApiTransport | null = null;

export const api = {
  defaults: {
    /** Test seam: transport-level mocking only — the pipeline (auth
     *  header, wake window, q clamp, 401 refresh retry) stays real. */
    get adapter(): ApiTransport | null {
      return transportOverride;
    },
    set adapter(t: ApiTransport | null) {
      transportOverride = t;
    },
  },

  /* r340 lint-fix: the generic default is `unknown` (no-explicit-any);
   * the ONE trust-boundary cast lives at the internal seam — the
   * transport parses JSON of unknown shape, the CALLER asserts T
   * (the standard typed-wrapper pattern; previously `T = any` hid
   * every downstream read). */
  request<T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request(config) as Promise<ApiResponse<T>>;
  },
  get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request({ ...config, url, method: 'get' }) as Promise<ApiResponse<T>>;
  },
  post<T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request({ ...config, url, method: 'post', data }) as Promise<ApiResponse<T>>;
  },
  put<T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request({ ...config, url, method: 'put', data }) as Promise<ApiResponse<T>>;
  },
  patch<T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request({ ...config, url, method: 'patch', data }) as Promise<ApiResponse<T>>;
  },
  delete<T = unknown>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request({ ...config, url, method: 'delete' }) as Promise<ApiResponse<T>>;
  },
  head<T = unknown>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return request({ ...config, url, method: 'head' }) as Promise<ApiResponse<T>>;
  },
};

// ── Request: honour the backend's `q` contract ───────────────────
/**
 * `paginationSchema.q` (backend/src/lib/pagination.ts) is `.max(120)`:
 * past it EVERY paginated route answers 400 VALIDATION_ERROR. Nothing
 * on the client enforced that — the roster/search inputs carry no
 * `maxLength`, and the students roster even hydrates its term from a
 * deep-linked `?q=` — so a pasted paragraph (or a crafted URL) turned
 * the page into a permanently retryable error state instead of a
 * search. Clamp once at the transport boundary so every caller (typed
 * input, URL deep link, future queryFn) honours the contract without
 * remembering to, and without mutating the caller's params object (it
 * is often a literal that a query key or a test still reads).
 */
const QUERY_PARAM_MAX_LENGTH = 120;

// r280: the cold-start truth signal (lib/serverWake) — every request
// the client mints is tracked; both response paths settle it. The
// 401-refresh retry re-enters this pipeline (fresh id) after the
// original settled, so the wake window tracks the retry as its own
// request — exactly the truth the user sees.
let wakeSeq = 0;

async function request(config: ApiRequestConfig): Promise<ApiResponse<unknown>> {
  const cfg: InternalConfig = { ...config };
  const url = typeof cfg.url === 'string' ? cfg.url : '';

  // The q clamp (was the second axios request interceptor).
  const params = cfg.params;
  if (params !== null && typeof params === 'object' && !(params instanceof URLSearchParams)) {
    const q = (params as Record<string, unknown>).q;
    if (typeof q === 'string' && q.length > QUERY_PARAM_MAX_LENGTH) {
      cfg.params = { ...params, q: q.slice(0, QUERY_PARAM_MAX_LENGTH) };
    }
  }

  // The Bearer token (was the first axios request interceptor).
  const token = useAuthStore.getState().accessToken;
  if (token) {
    cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` };
  }

  const wakeId = ++wakeSeq;
  wakeRequestStart(wakeId);
  try {
    const res = await rawRequest(cfg);
    wakeRequestSettle(wakeId);
    return res;
  } catch (error) {
    wakeRequestSettle(wakeId);
    const err = error instanceof ApiError ? error : new ApiError('Network Error', cfg);
    const status = err.response?.status;

    /* r152a (A4 P3-suspected): recovery used to fire ONLY on TOKEN_EXPIRED.
     * A structurally-invalid access token (UNAUTHENTICATED — e.g. after a
     * JWT secret rotation or an env switch with a stale persisted token)
     * never refreshed, never cleared, never redirected: every query just
     * kept erroring until the user found the logout button — even though
     * the refresh cookie may be perfectly valid and would fix it. Now ANY
     * 401 on a non-auth endpoint gets one single-shot refresh attempt
     * (the __retried guard keeps it bounded). Auth endpoints are exempt:
     * their 401s are answers, not session failures — a wrong password
     * must not mint a refresh round-trip. */
    if (status === 401 && !url.includes('/auth/') && !cfg.__retried) {
      cfg.__retried = true;
      const fresh = await tryRefresh();
      if (fresh) {
        cfg.headers = { ...cfg.headers, Authorization: `Bearer ${fresh}` };
        return request(cfg); // full re-entry: fresh wake id, own guard
      }
    }
    throw err;
  }
}

// ── Response: handle 401 by refreshing once ──────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = rawRequest({ url: '/auth/refresh', method: 'post', data: {}, timeout: 15_000 })
      // 15-d P2-6: this call deliberately bypasses the pipeline (no
      // auth header, no 401 retry — avoids interceptor recursion), which
      // also bypassed the instance's 20s timeout — a hung refresh
      // endpoint pinned the refreshPromise singleton and every queued
      // 401-retry for minutes. Explicit 15s, tighter on purpose: the
      // refresh is payload-free and gates every other request, so it
      // should fail first.
      .then((r) => {
        const { user, accessToken } = (r.data as { data: AuthSessionResponse }).data;
        // r178: the refresh re-resolves the institution context by the
        // same rules as login (single active membership → auto-select;
        // multiple → null until the client re-selects; revoked/
        // suspended → null). Persist it with the session so the shell's
        // context chip never renders a selection the token no longer
        // carries.
        useAuthStore
          .getState()
          .setSession(user, accessToken, extractSessionExtras(user));
        return accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clear();
        // Session ended (refresh rejected). The next visitor on this
        // tab — a shared lab machine is a real deployment scenario —
        // must never render the previous account's cached queries
        // (role accent, milestones, profile). Same boundary the
        // login/register/logout hooks enforce.
        queryClient.clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// ── The transports ─────────────────────────────────────────────────

async function rawRequest(cfg: InternalConfig): Promise<ApiResponse<unknown>> {
  if (transportOverride) return transportOverride(cfg);
  return cfg.onUploadProgress ? xhrTransport(cfg) : fetchTransport(cfg);
}

function buildURL(cfg: ApiRequestConfig): string {
  const raw = cfg.url ?? '';
  const url = /^https?:\/\//i.test(raw)
    ? raw
    : `${baseURL.replace(/\/+$/, '')}/${raw.replace(/^\/+/, '')}`;
  const params = cfg.params;
  if (!params) return url;
  const qs =
    typeof params === 'string'
      ? params
      : params instanceof URLSearchParams
        ? params.toString()
        : serializeParams(params);
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

/** axios's default param serialization: null/undefined skipped,
 *  arrays as repeated `key[]=` entries, scalars stringified. */
function serializeParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) sp.append(`${key}[]`, String(item));
      }
    } else {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

/** Plain objects JSON-serialize (axios's transformRequest); FormData /
 *  Blob / File / ArrayBuffer / string bodies pass through untouched so
 *  the browser sets the multipart boundary itself. */
function serializeBody(cfg: ApiRequestConfig): { body?: XMLHttpRequestBodyInit; json: boolean; form: boolean } {
  const d = cfg.data;
  if (d === undefined || d === null) return { json: false, form: false };
  if (typeof d === 'string') return { body: d, json: false, form: false };
  if (d instanceof FormData) return { body: d, json: false, form: false };
  if (d instanceof Blob) return { body: d, json: false, form: false };
  if (d instanceof ArrayBuffer) return { body: d, json: false, form: false };
  if (d instanceof URLSearchParams) return { body: d, json: false, form: true };
  return { body: JSON.stringify(d), json: true, form: false };
}

/** JSON responses parse (axios's transformResponse); anything else
 *  arrives as text. A failed parse falls back to the raw text. */
function parseBody(text: string, contentType: string | null): unknown {
  if (contentType && contentType.toLowerCase().includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

async function fetchTransport(cfg: InternalConfig): Promise<ApiResponse<unknown>> {
  const method = (cfg.method ?? 'get').toUpperCase();
  const headers = new Headers(cfg.headers);
  const { body: serialized, json, form } = serializeBody(cfg);
  if (json && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (form && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  }
  const hasBody = method !== 'GET' && method !== 'HEAD' && serialized !== undefined;

  const timeoutMs = cfg.timeout ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timer =
    timeoutMs > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : null;
  const onExternalAbort = () => controller.abort();
  cfg.signal?.addEventListener('abort', onExternalAbort);
  try {
    const res = await fetch(buildURL(cfg), {
      method,
      headers,
      body: hasBody ? serialized : undefined,
      credentials: 'include', // refresh cookie (was withCredentials)
      signal: controller.signal,
    });
    const response: ApiResponse<unknown> = {
      data: parseBody(await res.text(), res.headers.get('content-type')),
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      config: cfg,
    };
    if (!res.ok) {
      // axios's default validateStatus (2xx) — anything else rejects
      // with the structural error every mapper reads.
      throw new ApiError(`Request failed with status code ${res.status}`, cfg, 'ERR_BAD_REQUEST', response);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) {
      throw new ApiError(`timeout of ${timeoutMs}ms exceeded`, cfg, 'ECONNABORTED');
    }
    if (cfg.signal?.aborted) {
      throw new ApiError('Request aborted', cfg, 'ERR_CANCELED');
    }
    // axios's literal transport-failure message — format.ts and the
    // error states normalize on it.
    throw new ApiError('Network Error', cfg);
  } finally {
    if (timer) clearTimeout(timer);
    cfg.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/** fetch cannot report upload progress — the two upload hooks
 *  (materials, papers) paint byte-accurate bars from it, so those
 *  requests ride native XHR. Still zero-dependency. */
function xhrTransport(cfg: InternalConfig): Promise<ApiResponse<unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = (cfg.method ?? 'get').toUpperCase();
    xhr.open(method, buildURL(cfg), true);
    xhr.withCredentials = true;
    xhr.timeout = cfg.timeout ?? DEFAULT_TIMEOUT_MS;

    const headers: Record<string, string> = { ...(cfg.headers ?? {}) };
    const { body, json, form } = serializeBody(cfg);
    const hasCT = Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');
    if (json && !hasCT) headers['Content-Type'] = 'application/json';
    if (form && !hasCT) headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);

    xhr.upload.onprogress = (e) => {
      cfg.onUploadProgress?.({ loaded: e.loaded, total: e.total || undefined });
    };
    xhr.onload = () => {
      const response: ApiResponse<unknown> = {
        data: parseBody(xhr.responseText, xhr.getResponseHeader('content-type')),
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeadersOf(xhr),
        config: cfg,
      };
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else {
        reject(
          new ApiError(`Request failed with status code ${xhr.status}`, cfg, 'ERR_BAD_REQUEST', response),
        );
      }
    };
    xhr.onerror = () => reject(new ApiError('Network Error', cfg));
    xhr.ontimeout = () => reject(new ApiError(`timeout of ${xhr.timeout}ms exceeded`, cfg, 'ECONNABORTED'));
    xhr.onabort = () => reject(new ApiError('Request aborted', cfg, 'ERR_CANCELED'));
    cfg.signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(method !== 'GET' && method !== 'HEAD' ? body : undefined);
  });
}

function responseHeadersOf(xhr: XMLHttpRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of xhr.getAllResponseHeaders().split('\r\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) out[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return out;
}

// Helper to unwrap our `{ data }` envelope
export async function unwrap<T>(promise: Promise<ApiResponse<{ data: T }>>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

/** Splits an r178 auth payload into the bare user + the institution
 *  session context, defaulting missing fields to the store's honest
 *  defaults (no context in the payload → no context in the store). */
export function extractSessionExtras(
  user: AuthSessionUser,
): SessionInstitutionExtras {
  return {
    memberships: user.memberships ?? [],
    currentInstitution: user.currentInstitution ?? null,
    membershipRole: user.membershipRole ?? null,
  };
}
