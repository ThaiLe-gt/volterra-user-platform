/** Default site opened from the global nav's Digital Twin entry. */
export const DEFAULT_TWIN_SITE_ID = "site-vinuni";

export const ROUTES = {
  portfolio: "/portfolio",
  digitalTwin: (siteId: string) => `/digital-twin/${siteId}`,
  login: "/login",
} as const;
