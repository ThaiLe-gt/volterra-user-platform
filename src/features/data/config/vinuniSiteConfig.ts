import type { GeoPoint } from "../types/domain";

export interface VinuniSiteConfig {
  site: VinuniSite;
  stations: VinuniStation[];
}

export interface ModelTransformConfig {
  /** Local model scale multiplier. */
  scale?: number;
  /** Local model rotation in degrees, using config-space Z as the up axis. */
  rotation?: {
    x?: number;
    y?: number;
    z?: number;
  };
  /** Local offset in meters after placement, using config-space Z as up. */
  offset?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

export interface VinuniSite {
  id: string;
  name: string;
  code?: string;
  geo: GeoPoint;
  modelUrl?: string;
  transform?: ModelTransformConfig;
}

export interface VinuniStation {
  /** Stable app/BIM asset id. */
  id: string;
  /** Backend web-energy station id. */
  apiId: number;
  code?: string;
  name: string;
  geo: GeoPoint;
  modelUrl?: string;
  transform?: ModelTransformConfig;
}

export const DEFAULT_VINUNI_SITE_CONFIG: VinuniSiteConfig = {
  site: {
    id: "site-vinuni",
    name: "VinUni",
    code: "VINUNI",
    geo: { lng: 105.94542061064729, lat: 20.989925395134943 },
  },
  stations: [
    {
      id: "vinuni-station-01",
      apiId: 1,
      code: "VINUNI-ST01",
      name: "VinUni Station 01",
      geo: { lng: 105.94524061064729, lat: 20.990055395134943 },
    },
    {
      id: "vinuni-station-02",
      apiId: 2,
      code: "VINUNI-ST02",
      name: "VinUni Station 02",
      geo: { lng: 105.94560061064729, lat: 20.989795395134943 },
    },
  ],
};

let configPromise: Promise<VinuniSiteConfig> | null = null;

export function loadVinuniSiteConfig(): Promise<VinuniSiteConfig> {
  configPromise ??= fetchVinuniSiteConfig();
  return configPromise;
}

async function fetchVinuniSiteConfig(): Promise<VinuniSiteConfig> {
  try {
    const res = await fetch("/config/vinuni-site.json", { cache: "no-store" });
    if (!res.ok) return DEFAULT_VINUNI_SITE_CONFIG;
    const json = (await res.json()) as Partial<VinuniSiteConfig>;
    return normalizeConfig(json);
  } catch {
    return DEFAULT_VINUNI_SITE_CONFIG;
  }
}

function normalizeConfig(input: Partial<VinuniSiteConfig>): VinuniSiteConfig {
  const site = input.site ?? DEFAULT_VINUNI_SITE_CONFIG.site;
  const stations = Array.isArray(input.stations) ? input.stations : [];
  const normalizedStations = stations.length
    ? stations.reduce<VinuniStation[]>((acc, station, index) => {
        const fallback = DEFAULT_VINUNI_SITE_CONFIG.stations[index];
        const apiId = station.apiId ?? fallback?.apiId;
        if (typeof apiId !== "number") return acc;
        acc.push({
          ...fallback,
          ...station,
          apiId,
          modelUrl: normalizeModelUrl(station.modelUrl),
          transform: normalizeTransform(station.transform),
          geo: {
            ...fallback?.geo,
            ...station.geo,
          },
        });
        return acc;
      }, [])
    : DEFAULT_VINUNI_SITE_CONFIG.stations;

  return {
    site: {
      ...DEFAULT_VINUNI_SITE_CONFIG.site,
      ...site,
      modelUrl: normalizeModelUrl(site.modelUrl),
      transform: normalizeTransform(site.transform),
      geo: {
        ...DEFAULT_VINUNI_SITE_CONFIG.site.geo,
        ...site.geo,
      },
    },
    stations: normalizedStations.length
      ? normalizedStations
      : DEFAULT_VINUNI_SITE_CONFIG.stations,
  };
}

function normalizeModelUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeTransform(
  value: ModelTransformConfig | undefined
): ModelTransformConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const scale = finiteNumber(value.scale);
  const rotation = normalizeVector(value.rotation);
  const offset = normalizeVector(value.offset);
  if (scale === undefined && !rotation && !offset) return undefined;
  return { scale, rotation, offset };
}

function normalizeVector(
  value: ModelTransformConfig["rotation"] | ModelTransformConfig["offset"]
) {
  if (!value || typeof value !== "object") return undefined;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  const z = finiteNumber(value.z);
  if (x === undefined && y === undefined && z === undefined) return undefined;
  return { x, y, z };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
