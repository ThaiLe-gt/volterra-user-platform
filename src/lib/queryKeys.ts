/** Centralized, type-safe React Query keys. */
export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  portfolio: {
    sites: (filter?: unknown) => ["portfolio", "sites", filter ?? null] as const,
    kpis: () => ["portfolio", "kpis"] as const,
    siteDetail: (siteId: string) => ["portfolio", "site", siteId] as const,
    siteSeries: (siteId: string, metric: string, range: string) =>
      ["portfolio", "site", siteId, "series", metric, range] as const,
  },
  twin: {
    tree: (siteId: string) => ["twin", siteId, "tree"] as const,
    kpis: (siteId: string) => ["twin", siteId, "kpis"] as const,
    assetDetail: (siteId: string, assetId: string) =>
      ["twin", siteId, "asset", assetId] as const,
    assetSeries: (siteId: string, assetId: string, metric: string, range: string) =>
      ["twin", siteId, "asset", assetId, "series", metric, range] as const,
  },
} as const;
