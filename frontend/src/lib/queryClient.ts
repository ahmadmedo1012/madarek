import { QueryClient } from '@tanstack/react-query';

/* P2-15 (audit 11-e): a failed query keeps its ONE retry attempt (the
   previous `retry: 1` budget), but only when the failure is plausibly
   transient — an HTTP 5xx server fault, or a network-level failure
   (dropped connection / timeout: an AxiosError that never got a
   response). 4xx responses are the server's final word on the request
   (auth, validation, not found, rate limit) and must surface to the UI
   immediately instead of burning a duplicate round-trip. Exported as a
   pure predicate so the policy is unit-testable. */
export const QUERY_MAX_RETRIES = 1;

type HttpLikeError = { response?: { status?: number } };

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // With a function `retry`, TanStack Query defers the retry budget
  // entirely to this predicate — enforce the single attempt here.
  if (failureCount >= QUERY_MAX_RETRIES) return false;
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as HttpLikeError).response?.status;
    // A readable HTTP status: retry server faults only. A missing
    // status (response arrived unreadable) stays in the transient bin.
    return status === undefined || status >= 500;
  }
  // No HTTP response at all (network drop, timeout) or a non-axios
  // error thrown inside a queryFn — unknown, treat as transient.
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

/* r179 (phase-5): the institution-scope key convention — every
 * institution-dependent resource query (hooks/resources/*) appends its
 * scope segment (from useInstitutionScope) at the END of the key.
 * Appending — never prepending — keeps every existing prefix
 * invalidation (['posts'], ['competitions', id], ['me', 'dashboard']…)
 * matching the scoped keys unchanged, so mutation refresh semantics
 * are byte-identical. A switch changes the segment → the query re-keys
 * → fresh fetch under the new context, and the old institution's
 * cached rows stay behind under their own (stale) key where nothing
 * renders them. Pure so the convention is unit-testable. */
export function withInstitutionScope<T extends readonly unknown[]>(
  key: T,
  institutionScope: string | null,
): [...T, string | null] {
  return [...key, institutionScope];
}
