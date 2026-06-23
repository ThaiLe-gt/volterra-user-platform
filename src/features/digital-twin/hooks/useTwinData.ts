"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/queryClient";
import { twinApi } from "../api/twin";

export function useBimTree(siteId: string) {
  return useQuery({
    queryKey: queryKeys.twin.tree(siteId),
    queryFn: () => twinApi.getBimTree(siteId),
  });
}

export function useTwinKpis(siteId: string) {
  return useQuery({
    queryKey: queryKeys.twin.kpis(siteId),
    queryFn: () => twinApi.getKpis(siteId),
    refetchInterval: REALTIME_POLL_INTERVAL_MS,
  });
}

export function useAssetDetail(siteId: string, assetId: string | null) {
  return useQuery({
    queryKey: queryKeys.twin.assetDetail(siteId, assetId ?? ""),
    queryFn: () => twinApi.getAssetDetail(siteId, assetId!),
    enabled: !!assetId,
  });
}

export function useAssetTimeseries(
  siteId: string,
  assetId: string | null,
  metric: string,
  range = "1d"
) {
  return useQuery({
    queryKey: queryKeys.twin.assetSeries(siteId, assetId ?? "", metric, range),
    queryFn: () => twinApi.getAssetTimeseries(siteId, assetId!, metric, range),
    enabled: !!assetId,
    refetchInterval: REALTIME_POLL_INTERVAL_MS,
  });
}
