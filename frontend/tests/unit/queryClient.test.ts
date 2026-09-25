/**
 * 13-13 — queryClient retry policy (P2-15, audit 11-e).
 *
 * The retry predicate keeps the single-retry budget of the old `retry: 1`
 * while NEVER retrying a 4xx response — those are the server's final word
 * on the request (auth, validation, not found, rate limit), so a retry
 * only burns a duplicate round-trip before the identical error reaches
 * the UI. Only 5xx server faults and network-level failures (an
 * AxiosError with no response: dropped connection, timeout) retry.
 */
import { describe, expect, it } from 'vitest';
import {
  QUERY_MAX_RETRIES,
  queryClient,
  shouldRetryQuery,
} from '../../src/lib/queryClient';

/** Axios error shape for an answered HTTP response. */
function httpError(status: number): Error {
  return { isAxiosError: true, response: { status } } as unknown as Error;
}

/** Axios network failure / timeout shape: a code, never a response. */
function networkError(code = 'ERR_NETWORK'): Error {
  return { isAxiosError: true, code } as unknown as Error;
}

describe('shouldRetryQuery — 4xx never retries (P2-15)', () => {
  it.each([400, 401, 403, 404, 409, 422, 429])(
    'does not retry a %s response',
    (status) => {
      expect(shouldRetryQuery(0, httpError(status))).toBe(false);
    },
  );

  it.each([500, 502, 503, 504])('retries a %s response on the first failure', (status) => {
    expect(shouldRetryQuery(0, httpError(status))).toBe(true);
  });

  it('retries a network-level failure (no response reached us)', () => {
    expect(shouldRetryQuery(0, networkError('ERR_NETWORK'))).toBe(true);
  });

  it('retries a timeout (ECONNABORTED also carries no response)', () => {
    expect(shouldRetryQuery(0, networkError('ECONNABORTED'))).toBe(true);
  });

  it('treats a non-HTTP error thrown in a queryFn as transient', () => {
    expect(shouldRetryQuery(0, new Error('boom'))).toBe(true);
  });

  it('keeps the single-retry budget — a second failure never retries', () => {
    expect(shouldRetryQuery(QUERY_MAX_RETRIES, httpError(503))).toBe(false);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES, networkError())).toBe(false);
    expect(QUERY_MAX_RETRIES).toBe(1);
  });

  it('stays decided at higher failure counts (no late 4xx retry)', () => {
    expect(shouldRetryQuery(5, httpError(403))).toBe(false);
  });
});

describe('queryClient default options wiring', () => {
  it('routes query retries through the predicate and keeps mutations retry-free', () => {
    const queries = queryClient.getDefaultOptions().queries;
    expect(typeof queries?.retry).toBe('function');
    const retry = queries?.retry as (failureCount: number, error: unknown) => boolean;
    expect(retry(0, httpError(404))).toBe(false);
    expect(retry(0, httpError(502))).toBe(true);
    expect(retry(0, networkError())).toBe(true);
    // Mutations stay non-idempotent-safe: never retried.
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it('preserves the tuned cache timings', () => {
    const queries = queryClient.getDefaultOptions().queries;
    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.gcTime).toBe(5 * 60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });
});
