/**
 * Centralized API endpoints.
 *
 * `auth` is generic (used by apiClient token refresh). `webEnergy` mirrors the
 * legacy Vue app's endpoints (web-energy/src/utils/apiUrl.ts) consumed by the
 * phase-1 webEnergyRepository. `gateway` is the phase-2 Java gateway surface.
 */
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  webEnergy: {
    stationList: "/station/list",
    stationDetails: (id: number | string) => `/station/${id}`,
    stationFullDetails: (id: number | string) => `/station/${id}/details`,
    devicesOfStation: (stationId: number | string) =>
      `/station/${stationId}/devices`,
    signalLatest: "/signal/latest",
    signalHistorical: "/signal/historical-list",
    signalHistorySystem: "/signal/list-system-energy",
    signalHistoryGrid: "/signal/list-grid",
    signalHistorySolar: "/signal/list-solar",
    signalHistoryBess: "/signal/list-bess",
    signalHistoryCharger: "/signal/list-charger",
    signalHistoryWeather: "/signal/list-weather",
  },
  gateway: {
    sites: "/api/v1/portfolio/sites",
    siteDetail: (id: string) => `/api/v1/portfolio/sites/${id}`,
    portfolioKpis: "/api/v1/portfolio/kpis",
    bimTree: (siteId: string) => `/api/v1/twin/${siteId}/tree`,
    twinKpis: (siteId: string) => `/api/v1/twin/${siteId}/kpis`,
    assetDetail: (siteId: string, assetId: string) =>
      `/api/v1/twin/${siteId}/assets/${assetId}`,
  },
} as const;
