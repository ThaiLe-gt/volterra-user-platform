"use client";

import { useQuery } from "@tanstack/react-query";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/queryClient";
import {
  buildMockOperationSnapshot,
  MOCK_OPERATION_STATIONS,
} from "../api/mockOperations";
import {
  getOperationStations,
  getWebEnergyOperationSnapshot,
} from "../api/operationSnapshot";

const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

export const OPERATIONS_CONTROLS_ENABLED = DATA_SOURCE === "webenergy";

export function useOperationStations() {
  return useQuery({
    queryKey: ["operations", "stations", DATA_SOURCE],
    queryFn: () =>
      OPERATIONS_CONTROLS_ENABLED
        ? getOperationStations()
        : Promise.resolve(MOCK_OPERATION_STATIONS),
  });
}

export function useOperationSnapshot(stationId: string | null) {
  return useQuery({
    queryKey: ["operations", "snapshot", DATA_SOURCE, stationId ?? ""],
    queryFn: () =>
      OPERATIONS_CONTROLS_ENABLED
        ? getWebEnergyOperationSnapshot(stationId ?? undefined)
        : Promise.resolve(buildMockOperationSnapshot(stationId ?? undefined)),
    enabled: !!stationId,
    refetchInterval: REALTIME_POLL_INTERVAL_MS,
  });
}
