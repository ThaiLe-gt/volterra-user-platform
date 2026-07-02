"use client";

import { useQuery } from "@tanstack/react-query";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/queryClient";
import type { ChartRange } from "@/components/common/RangeToggle";
import {
  buildMockOperationHistory,
  fetchOperationHistory,
} from "../api/operationHistory";
import type { OperationNode } from "../types";

const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

export function useOperationHistory(
  stationId: number,
  node: OperationNode | null,
  range: ChartRange
) {
  const domain = node?.historyDomain;
  const deviceId = node?.deviceId;

  return useQuery({
    queryKey: [
      "operations",
      "history",
      DATA_SOURCE,
      stationId,
      node?.id ?? "",
      domain ?? "",
      deviceId ?? null,
      range,
    ],
    enabled: !!domain && stationId > 0,
    refetchInterval: REALTIME_POLL_INTERVAL_MS,
    queryFn: () => {
      if (!domain) throw new Error("Missing operation history domain");
      return DATA_SOURCE === "webenergy"
        ? fetchOperationHistory({ stationId, domain, deviceId, range })
        : Promise.resolve(buildMockOperationHistory(domain, range));
    },
  });
}
