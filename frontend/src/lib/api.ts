import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { queryClient } from './queryClient';

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

// ── Request: attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
      .post<{ data: { accessToken: string; user: import('../stores/auth.store').AuthUser } }>(
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
        useAuthStore.getState().setSession(user, accessToken);
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
