"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { REALTIME_POLL_INTERVAL_MS } from "@/lib/queryClient";
import { portfolioApi } from "../api/portfolio";
import type { AssetType } from "@/features/data/types/domain";

export function usePortfolioSites(activeTypes: AssetType[]) {
  const filter = activeTypes.length ? { assetTypes: activeTypes } : undefined;
  return useQuery({
    queryKey: queryKeys.portfolio.sites(filter),
    queryFn: () => portfolioApi.getSites(filter),
  });
}

export function usePortfolioKpis() {
  return useQuery({
    queryKey: queryKeys.portfolio.kpis(),
    queryFn: () => portfolioApi.getKpis(),
  });
}

export function useSiteDetail(siteId: string | null) {
  return useQuery({
    queryKey: queryKeys.portfolio.siteDetail(siteId ?? ""),
    queryFn: () => portfolioApi.getSiteDetail(siteId!),
    enabled: !!siteId,
  });
}

export function useSiteTimeseries(
  siteId: string | null,
  metric: string,
  range = "1d"
) {
  return useQuery({
    queryKey: queryKeys.portfolio.siteSeries(siteId ?? "", metric, range),
    queryFn: () => portfolioApi.getSiteTimeseries(siteId!, metric, range),
    enabled: !!siteId,
    refetchInterval: REALTIME_POLL_INTERVAL_MS,
  });
}
