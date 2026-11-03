import { QueryClient } from "@tanstack/react-query";
import { ApiError, NETWORK_ERROR } from "@/api/client";

/**
 * Server-state defaults — mirrors frontend/src/lib/queryClient.ts:
 * staleTime 30s, gcTime 5min, single retry on transient 5xx/network only.
 *
 * R334 B8 (resilience layer): retries upgraded to THREE attempts with
 * exponential backoff + jitter (still transient-errors-only — a 4xx is
 * an answer, not a flake; retrying it is dishonest). Mutations stay at
 * ZERO retries (writes are owned by the offline queue / explicit user
 * retry — silent mutation retries would double-send). Everything else
 * (staleTime, gcTime, refetchOnWindowFocus) is unchanged.
 */

/** Max query retries (i.e. 4 total attempts: initial + 3). */
export const MAX_QUERY_RETRIES = 3;

/** Transient = network / timeout / 5xx — anything else fails fast. */
export function isTransientError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === NETWORK_ERROR || error.code === "TIMEOUT") return true;
    return error.status >= 500;
  }
  return false;
}

/**
 * Exponential backoff with jitter: ~1s, 2s, 4s (capped 30s) plus up to
 * 250ms jitter — a cold-server herd of reconnecting clients shouldn't
 * hit the same millisecond (the Render-wake stampede).
 */
export function queryRetryDelay(attemptIndex: number): number {
  const base = Math.min(1000 * 2 ** attemptIndex, 30_000);
  const jitter = Math.random() * 250;
  return base + jitter;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => isTransientError(error) && failureCount < MAX_QUERY_RETRIES,
      retryDelay: queryRetryDelay,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
