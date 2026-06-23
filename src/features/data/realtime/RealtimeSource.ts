import type { TimeSeriesPoint } from "../types/domain";

export type RealtimeHandler = (point: TimeSeriesPoint) => void;

/**
 * Abstraction over realtime delivery. Phase 1 uses polling (TanStack Query
 * refetchInterval, so this is a no-op). Phase 2 swaps in a STOMP source that
 * pushes points into the query cache — components never change.
 */
export interface RealtimeSource {
  subscribe(channel: string, handler: RealtimeHandler): () => void;
}
