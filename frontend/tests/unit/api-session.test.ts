/**
 * lib/api session-boundary tests (audit P0-1 frontend half + single-
 * flight refresh pinning).
 *
 * Network responses are simulated with a custom axios adapter installed
 * on BOTH the `api` instance and the bare global axios — the refresh
 * call deliberately bypasses the `api` instance to avoid interceptor
 * recursion.
 */
import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, unwrap } from '../../src/lib/api';
import { queryClient } from '../../src/lib/queryClient';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const USER_A: AuthUser = {
  id: 'u1',
  email: 'a@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'المبروك',
  role: 'STUDENT',
};

function respond<T>(config: InternalAxiosRequestConfig, status: number, data: T): AxiosResponse<T> {
  return { data, status, statusText: String(status), headers: {}, config, request: {} };
}

function rejectWith(config: InternalAxiosRequestConfig, status: number, data: unknown): never {
  throw new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, {}, respond(config, status, data));
}

function installAdapter(
  handler: (config: InternalAxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>,
): void {
  const adapter: AxiosAdapter = (config) => Promise.resolve().then(() => handler(config));
  api.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;
}

const authHeaderOf = (config: InternalAxiosRequestConfig): string => {
  const value = config.headers?.get('Authorization');
  return typeof value === 'string' ? value : '';
};

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null });
  queryClient.clear();
  localStorage.removeItem('mdrk-auth');
});

describe('failed refresh ends the session cleanly (P0-1)', () => {
  it('clears the auth store AND the query cache, and rejects the original request', async () => {
    let refreshCalls = 0;
    installAdapter((config) => {
      if ((config.url ?? '').includes('/auth/refresh')) {
        refreshCalls += 1;
        rejectWith(config, 401, { error: { code: 'REFRESH_INVALID' } });
      }
      rejectWith(config, 401, { error: { code: 'TOKEN_EXPIRED' } });
    });

    useAuthStore.getState().setSession(USER_A, 'expired-token');
    queryClient.setQueryData(['auth', 'me'], { id: 'u1', role: 'STUDENT' });
    queryClient.setQueryData(['me', 'dashboard'], { grade: 97 });

    // The caller sees the original 401 — not the refresh failure.
    await expect(unwrap(api.get('/me/dashboard'))).rejects.toMatchObject({
      response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
    });

    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    // The leak this test pins: the NEXT visitor on this tab must not
    // find account A's cached queries.
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(queryClient.getQueryData(['me', 'dashboard'])).toBeUndefined();
  });
});

describe('single-flight refresh', () => {
  it('refreshes once for concurrent expired requests and retries both with the new token', async () => {
    let refreshCalls = 0;
    const retriedAuthHeaders: string[] = [];
    installAdapter((config) => {
      if ((config.url ?? '').includes('/auth/refresh')) {
        refreshCalls += 1;
        return new Promise<AxiosResponse>((resolve) => {
          // Delay so both 401s reach the interceptor while the refresh
          // is still in flight.
          setTimeout(() => {
            resolve(respond(config, 200, { data: { accessToken: 'fresh-token', user: USER_A } }));
          }, 20);
        });
      }
      if (authHeaderOf(config) === 'Bearer expired-token') {
        rejectWith(config, 401, { error: { code: 'TOKEN_EXPIRED' } });
      }
      retriedAuthHeaders.push(authHeaderOf(config));
      return respond(config, 200, { data: { ok: true } });
    });

    useAuthStore.getState().setSession(USER_A, 'expired-token');

    const [a, b] = await Promise.all([
      unwrap<{ ok: boolean }>(api.get('/me/dashboard')),
      unwrap<{ ok: boolean }>(api.get('/notifications')),
    ]);

    expect(refreshCalls).toBe(1); // single-flight
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(retriedAuthHeaders).toHaveLength(2);
    expect(retriedAuthHeaders.every((h) => h === 'Bearer fresh-token')).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  it('does not refresh for non-401 errors', async () => {
    let refreshCalls = 0;
    installAdapter((config) => {
      if ((config.url ?? '').includes('/auth/refresh')) {
        refreshCalls += 1;
      }
      rejectWith(config, 500, { error: { code: 'INTERNAL' } });
    });

    useAuthStore.getState().setSession(USER_A, 'tok');

    await expect(unwrap(api.get('/anything'))).rejects.toMatchObject({ response: { status: 500 } });
    expect(refreshCalls).toBe(0);
    expect(useAuthStore.getState().accessToken).toBe('tok');
  });

  it('does not refresh when the 401 code is not TOKEN_EXPIRED', async () => {
    let refreshCalls = 0;
    installAdapter((config) => {
      if ((config.url ?? '').includes('/auth/refresh')) {
        refreshCalls += 1;
      }
      rejectWith(config, 401, { error: { code: 'INVALID_CREDENTIALS' } });
    });

    useAuthStore.getState().setSession(USER_A, 'tok');

    await expect(unwrap(api.get('/anything'))).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshCalls).toBe(0);
  });

  it('retries a request at most once (no refresh loop)', async () => {
    let refreshCalls = 0;
    let protectedAttempts = 0;
    installAdapter((config) => {
      if ((config.url ?? '').includes('/auth/refresh')) {
        refreshCalls += 1;
        return respond(config, 200, { data: { accessToken: 'fresh-token', user: USER_A } });
      }
      protectedAttempts += 1;
      // Every attempt 401s with TOKEN_EXPIRED — the __retried guard
      // must stop after one retry.
      rejectWith(config, 401, { error: { code: 'TOKEN_EXPIRED' } });
    });

    useAuthStore.getState().setSession(USER_A, 'expired-token');

    await expect(unwrap(api.get('/flaky'))).rejects.toMatchObject({ response: { status: 401 } });
    expect(protectedAttempts).toBe(2); // original + single retry
    expect(refreshCalls).toBe(1);
  });
});

describe('refresh request hardening (15-d P2-6)', () => {
  it('sends the refresh POST with an explicit 15s timeout', async () => {
    let refreshTimeout: number | undefined;
    installAdapter((config) => {
      if ((config.url ?? '').includes('/auth/refresh')) {
        refreshTimeout = config.timeout;
        return respond(config, 200, { data: { accessToken: 'fresh-token', user: USER_A } });
      }
      // The retried request 401s again; the __retried guard stops the
      // loop — what matters here is the refresh call's config.
      rejectWith(config, 401, { error: { code: 'TOKEN_EXPIRED' } });
    });

    useAuthStore.getState().setSession(USER_A, 'expired-token');

    await expect(unwrap(api.get('/anything'))).rejects.toMatchObject({ response: { status: 401 } });
    // The refresh deliberately bypasses the `api` instance (and its
    // 20s timeout) — without an explicit timeout, a hung endpoint
    // pinned the refreshPromise singleton for the browser default.
    expect(refreshTimeout).toBe(15_000);
  });
});
