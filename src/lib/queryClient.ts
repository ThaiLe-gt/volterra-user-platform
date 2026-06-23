import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Centralized realtime/polling cadence (ms). Phase 2 swaps polling for STOMP. */
export const REALTIME_POLL_INTERVAL_MS = 5_000;
