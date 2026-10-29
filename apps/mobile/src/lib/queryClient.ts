import { QueryClient } from "@tanstack/react-query";
import { ApiError, NETWORK_ERROR } from "@/api/client";

/**
 * Server-state defaults — mirrors frontend/src/lib/queryClient.ts:
 * staleTime 30s, gcTime 5min, single retry on transient 5xx/network only.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        if (error instanceof ApiError) {
          if (error.code === NETWORK_ERROR || error.code === "TIMEOUT") return true;
          return error.status >= 500;
        }
        return false;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
