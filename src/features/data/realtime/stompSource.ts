import type { RealtimeSource } from "./RealtimeSource";

/**
 * Phase-2 stub. When the Java gateway exposes a STOMP endpoint, implement this
 * with @stomp/stompjs: connect once, subscribe per channel, parse frames into
 * TimeSeriesPoint and call the handler (callers push into queryClient cache via
 * setQueryData). Kept as a stub so the seam exists without a live broker.
 *
 * Example shape (phase 2):
 *
 *   import { Client } from "@stomp/stompjs";
 *   const client = new Client({ brokerURL: process.env.NEXT_PUBLIC_WS_URL });
 *   client.activate();
 *   subscribe(channel, handler) {
 *     const sub = client.subscribe(channel, (msg) => handler(JSON.parse(msg.body)));
 *     return () => sub.unsubscribe();
 *   }
 */
export const stompSource: RealtimeSource = {
  subscribe() {
    return () => {};
  },
};
