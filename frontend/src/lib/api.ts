import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
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
 * message for unknown/expired/used tokens (no token-oracle). */
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


/* r153b: exported for the few out-of-axios calls that must survive
 * page unload (keepalive fetch in the lecture player's watch flush) —
 * they need the SAME base URL the axios instance resolves. */
export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const baseURL = apiBaseURL;

export const api = axios.create({
  baseURL,
  withCredentials: true, // refresh cookie
  timeout: 20_000,
});

// r280: the cold-start truth signal (lib/serverWake) — every request
// the instance mints is tracked; both response paths settle it. The
// 401-refresh retry re-enters this interceptor (fresh id) after the
// original settled, so the wake window tracks the retry as its own
// request — exactly the truth the user sees.
let wakeSeq = 0;
type WakeConfig = AxiosRequestConfig & { __wakeId?: number };

// ── Request: attach access token + open the wake window ────────
api.interceptors.request.use((config) => {
  (config as WakeConfig).__wakeId = ++wakeSeq;
  wakeRequestStart((config as WakeConfig).__wakeId!);
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: settle the wake window (success + transport failure) ─
api.interceptors.response.use(
  (r: AxiosResponse) => {
    wakeRequestSettle((r.config as WakeConfig).__wakeId);
    return r;
  },
  (error: AxiosError) => {
    wakeRequestSettle((error.config as WakeConfig | undefined)?.__wakeId);
    return Promise.reject(error);
  },
);

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

api.interceptors.request.use((config) => {
  const params = config.params;
  if (params === null || typeof params !== 'object' || params instanceof URLSearchParams) {
    return config;
  }
  const q = (params as Record<string, unknown>).q;
  if (typeof q === 'string' && q.length > QUERY_PARAM_MAX_LENGTH) {
    config.params = { ...params, q: q.slice(0, QUERY_PARAM_MAX_LENGTH) };
  }
  return config;
});

// ── Response: handle 401 by refreshing once ──────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ data: AuthSessionResponse }>(
        `${baseURL}/auth/refresh`,
        {},
        // 15-d P2-6: this call deliberately bypasses the `api` instance
        // (to avoid interceptor recursion), which also bypassed its
        // 20s timeout — a hung refresh endpoint pinned the
        // refreshPromise singleton and every queued 401-retry for the
        // browser's default of several minutes. Explicit 15s, tighter
        // than the instance on purpose: the refresh is payload-free
        // and gates every other request, so it should fail first.
        { withCredentials: true, timeout: 15_000 },
      )
      .then((r) => {
        const { user, accessToken } = r.data.data;
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

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    // r280: the request is settled the moment it answers — the 401
    // refresh retry below re-enters the request interceptor and opens
    // a fresh wake id (the retry is its own request).
    wakeRequestSettle((error.config as (AxiosRequestConfig & { __wakeId?: number }) | undefined)?.__wakeId);
    const original = error.config as (AxiosRequestConfig & { __retried?: boolean }) | undefined;
    const status = error.response?.status;

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
    const isAuthEndpoint = typeof original?.url === 'string' && original.url.includes('/auth/');
    if (status === 401 && !isAuthEndpoint && original && !original.__retried) {
      original.__retried = true;
      const token = await tryRefresh();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

// Helper to unwrap our `{ data }` envelope
export async function unwrap<T>(promise: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

/** Splits an r178 auth payload into the bare user + the institution
 * session context, defaulting missing fields to the store's honest
 * defaults (no context in the payload → no context in the store). */
export function extractSessionExtras(
  user: AuthSessionUser,
): SessionInstitutionExtras {
  return {
    memberships: user.memberships ?? [],
    currentInstitution: user.currentInstitution ?? null,
    membershipRole: user.membershipRole ?? null,
  };
}

/* ── r323 B1.1: the AI chat SSE streaming client ──────────────────────
 *
 * The backend serves POST /ai/chat in TWO grammars (same auth, same
 * rate limiter, same quota guard): the historical JSON envelope and —
 * with `?stream=1` — a Server-Sent Events stream of typed frames:
 *   event: token  data: {"t":"…"}       (one reply delta)
 *   event: done   data: {final turn}    (ids + engine/model + quota)
 *   event: error  data: {code,message,retryable}
 *
 * SSE needs a POST body, so EventSource is out — this client uses
 * fetch + ReadableStream (the auth conventions mirror the axios
 * instance: Bearer access token, refresh cookie via credentials, the
 * same /api/v1 base). The FRAME PARSER is a pure, exported factory so
 * unit tests pin token accumulation / done / error / abort without a
 * server; the wire loop is the only impure piece. */

/** The `done` frame — the FINAL turn as the server persisted it. The
 * server's `reply` replaces the client's accumulated buffer (a
 * transport drop can never truncate the answer on screen). `remaining`
 * is the per-user daily ask quota left AFTER this turn — omitted by
 * the server when the quota store was unavailable (never invented). */
export interface AiStreamDone {
  conversationId: string;
  messageId: string;
  reply: string;
  engine?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  remaining?: number;
}

/** The `error` frame — a typed failure AFTER the SSE headers shipped
 * (provider outage mid-stream, plumbing failure). `retryable` mirrors
 * the backend's failure classification. */
export interface AiStreamErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
}

/** One decoded SSE event — the union the page's handlers switch on. */
export type AiSseEvent =
  | { kind: 'token'; delta: string }
  | { kind: 'done'; final: AiStreamDone }
  | { kind: 'error'; error: AiStreamErrorPayload };

/** A non-2xx on the SSE attempt (auth, rate limiter, spent daily
 * quota, honest provider failure before streaming began) — or a
 * mid-stream typed `error` frame surfaced at stream end. The status
 * plus the backend's own envelope code/message ride it verbatim. */
export class AiStreamHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly serverMessage: string;
  /** The frame's own retryable flag when one carried it; a pre-stream
   * HTTP rejection defaults to retryable (the standing rate limiter
   * window and free-tier 429s genuinely recover). */
  readonly retryable: boolean;
  constructor(status: number, code: string, serverMessage: string, retryable = true) {
    super(`AI stream HTTP ${status}: ${code}`);
    this.name = 'AiStreamHttpError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
    this.retryable = retryable;
  }
}

/**
 * The pure incremental SSE frame parser. Feed it decoder output as it
 * arrives (chunk boundaries mean NOTHING — frames split on a blank
 * line, and a `data:` line may straddle two reads); it emits decoded
 * `AiSseEvent`s through the handler the moment a frame completes.
 * Tolerates the keep-alive noise compatible servers emit (comment
 * lines, `event:`-less frames, unparseable data payloads are skipped —
 * never surfaced as content). `end()` flushes a trailing frame that
 * lacked the closing blank line.
 */
export function createAiSseParser(onEvent: (ev: AiSseEvent) => void): {
  push: (chunk: string) => void;
  end: () => void;
} {
  let buffer = '';
  const dispatch = (frame: string): void => {
    const lines = frame.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const raw of lines) {
      const line = raw.replace(/\r$/, '');
      if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
      // `: comment` and unknown fields are ignored (SSE grammar).
    }
    if (dataLines.length === 0) return; // comment-only / keep-alive frame
    const payload = dataLines.join('\n');
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return; // malformed keep-alive noise — skipped, never content
    }
    if (eventName === 'token') {
      const t = (parsed as { t?: unknown })?.t;
      if (typeof t === 'string' && t.length > 0) onEvent({ kind: 'token', delta: t });
      return;
    }
    if (eventName === 'done') {
      onEvent({ kind: 'done', final: parsed as AiStreamDone });
      return;
    }
    if (eventName === 'error') {
      const p = parsed as Partial<AiStreamErrorPayload>;
      onEvent({
        kind: 'error',
        error: {
          code: typeof p.code === 'string' ? p.code : 'PROVIDER_FAILURE',
          message: typeof p.message === 'string' ? p.message : 'تعذَّر توليد الردّ — أعد المحاولة',
          retryable: p.retryable !== false,
        },
      });
    }
  };
  return {
    push(chunk: string): void {
      buffer += chunk;
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    },
    end(): void {
      if (buffer.trim().length > 0) dispatch(buffer);
      buffer = '';
    },
  };
}

/** Capability probe — streaming needs fetch + ReadableStream (and an
 * abortable fetch). A browser without them (or a test environment that
 * stubs fetch away) degrades the page to the JSON grammar honestly:
 * same endpoint, same engine, no streaming pretense. */
export function canStreamAi(): boolean {
  return (
    typeof fetch === 'function' &&
    typeof AbortController === 'function' &&
    typeof ReadableStream !== 'undefined' &&
    typeof TextDecoder === 'function'
  );
}

export interface AiStreamRequest {
  conversationId?: string;
  message: string;
  signal: AbortSignal;
  /** Every token delta, the moment it decodes. */
  onToken: (delta: string) => void;
  /** The typed error frame (a mid-stream provider failure). */
  onError?: (error: AiStreamErrorPayload) => void;
}

/**
 * POST /ai/chat?stream=1 and consume the SSE reply. Resolves with the
 * `done` frame (the server's final turn) or throws:
 *  · `AiStreamHttpError` — non-2xx BEFORE streaming (the daily-quota
 *    429 and the rate limiter surface here with the server's own
 *    Arabic message + envelope code);
 *  · the native `AbortError` — the caller's stop button (partial
 *    text stays wherever the caller kept it; the server persists
 *    nothing for an aborted turn).
 * A mid-stream `error` FRAME does not throw — it dispatches through
 * `onError` and the function still resolves (the frame IS the reply).
 * Auth mirrors the axios instance: Bearer token + refresh cookie.
 */
export async function streamAiChat(req: AiStreamRequest): Promise<AiStreamDone> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${apiBaseURL}/ai/chat?stream=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ conversationId: req.conversationId, message: req.message }),
    signal: req.signal,
  });
  if (req.signal.aborted) {
    // The stop raced the response headers: whatever arrived is dead on
    // arrival — cancel the body and reject the way fetch itself would.
    void res.body?.cancel().catch(() => undefined);
    throw new DOMException('This operation was aborted', 'AbortError');
  }
  if (!res.ok) {
    // The JSON error envelope (AppError) when the server sent one —
    // the server's Arabic message wins verbatim.
    const envelope = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new AiStreamHttpError(
      res.status,
      envelope?.error?.code ?? `HTTP_${res.status}`,
      envelope?.error?.message ?? 'تعذَّر الاتصال بالمساعد الآن.',
    );
  }
  if (!res.body) {
    throw new AiStreamHttpError(res.status, 'STREAM_EMPTY', 'تعذَّر الاتصال بالمساعد الآن.');
  }

  return new Promise<AiStreamDone>((resolve, reject) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let settled = false;
    // The typed `error` frame (a mid-stream provider failure): the
    // server ends the stream WITHOUT a done frame after it, so the
    // rejection below carries the FRAME's own classified Arabic
    // message + code — never the generic truncation copy.
    let frameError: AiStreamErrorPayload | null = null;
    const parser = createAiSseParser((ev) => {
      if (ev.kind === 'token') req.onToken(ev.delta);
      else if (ev.kind === 'error') {
        frameError = ev.error;
        req.onError?.(ev.error);
      } else if (!settled) {
        settled = true;
        // The turn is complete — stop reading (the server ends the
        // stream right after `done`; a cancel just races it politely).
        void reader.cancel().catch(() => undefined);
        resolve(ev.final);
      }
    });

    (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done || settled) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        if (settled) return;
        parser.end();
        settled = true;
        if (frameError) {
          const fe = frameError as AiStreamErrorPayload;
          reject(new AiStreamHttpError(res.status, fe.code, fe.message, fe.retryable));
          return;
        }
        // The stream ended without a `done` frame: the turn never
        // completed server-side (mid-stream drop). An honest failure —
        // never resolve with a truncated buffer dressed as a reply.
        reject(new AiStreamHttpError(res.status, 'STREAM_TRUNCATED', 'انقطع الردّ قبل اكتماله — أعد المحاولة.'));
      } catch (err) {
        if (settled) return;
        settled = true;
        // The caller's abort surfaces as a DOMException named
        // AbortError — rethrown so the caller's `signal.aborted`
        // check owns the interpretation (cancellation ≠ outage).
        reject(err);
      }
    })();
  });
}

/** POST /ai/feedback — one thumbs up/down per user per answer (the
 * (messageId, userId) pair upserts; the last rating wins). Rating is
 * strictly ±1 (the backend's SMALLINT column contract). */
export function sendAiFeedback(messageId: string, rating: 1 | -1): Promise<{ ok: boolean }> {
  return unwrap<{ ok: boolean }>(api.post('/ai/feedback', { messageId, rating }));
}

/** The backend's own Arabic daily-quota rejection (ai.routes.ts
 * dailyQuotaMessage) — the ONE 429 the page renders as the
 * «وصلتَ حدّ اليوم» card instead of a generic error row. Matched on
 * the server-controlled phrase (the rate limiter's 429s use different
 * copy and keep the recoverable error row). Exported pure — test-pinned. */
export function isDailyQuotaMessage(message: string): boolean {
  return message.includes('وصلتَ حدَّ الأسئلة اليوميّ');
}
