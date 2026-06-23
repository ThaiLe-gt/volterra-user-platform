import type { RealtimeSource } from "./RealtimeSource";
import { pollingSource } from "./pollingSource";
import { stompSource } from "./stompSource";

export type { RealtimeSource, RealtimeHandler } from "./RealtimeSource";

/** Phase 1 = polling; phase 2 = STOMP, selected by env. */
export function getRealtimeSource(): RealtimeSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "gateway"
    ? stompSource
    : pollingSource;
}
