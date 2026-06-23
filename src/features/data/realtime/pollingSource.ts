import type { RealtimeSource } from "./RealtimeSource";

/**
 * Phase-1 source. Realtime updates are handled by TanStack Query polling
 * (refetchInterval in the hooks), so subscribing here is a no-op.
 */
export const pollingSource: RealtimeSource = {
  subscribe() {
    return () => {};
  },
};
