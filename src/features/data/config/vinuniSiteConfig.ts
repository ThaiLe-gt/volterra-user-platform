import type { AssetStatus, GeoPoint } from "../types/domain";

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

export interface IotBubbleConfig {
  id: string;
  assetId: string;
  label: string;
  kind?: string;
  status?: AssetStatus;
  /** Runtime binding to a real operation/device node from the web-energy API. */
  operationNodeId?: string;
  deviceId?: number;
  anchor: {
    relativeTo: "site" | string;
    /** Local config-space meters. z is vertical. */
    position: {
      x?: number;
      y?: number;
      z?: number;
    };
  };
}

export interface VinuniSite {
  id: string;
  name: string;
  code?: string;
  geo: GeoPoint;
  modelUrl?: string;
  transform?: ModelTransformConfig;
  iotBubbles?: IotBubbleConfig[];
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
  iotBubbles?: IotBubbleConfig[];
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
          iotBubbles: normalizeIotBubbles(station.iotBubbles),
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
      iotBubbles: normalizeIotBubbles(site.iotBubbles),
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

function normalizeIotBubbles(value: unknown): IotBubbleConfig[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const bubbles = value.reduce<IotBubbleConfig[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const candidate = item as Partial<IotBubbleConfig>;
    const id = nonEmptyString(candidate.id);
    const assetId = nonEmptyString(candidate.assetId);
    const label = nonEmptyString(candidate.label);
    const anchor =
      candidate.anchor && typeof candidate.anchor === "object"
        ? candidate.anchor
        : undefined;
    const relativeTo = nonEmptyString(anchor?.relativeTo);
    const position = normalizeVector(anchor?.position);

    if (!id || !assetId || !label || !relativeTo || !position) return acc;

    const kind = nonEmptyString(candidate.kind);
    const status = normalizeStatus(candidate.status);
    const operationNodeId = nonEmptyString(candidate.operationNodeId);
    const deviceId = finiteNumber(candidate.deviceId);
    acc.push({
      id,
      assetId,
      label,
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
      ...(operationNodeId ? { operationNodeId } : {}),
      ...(deviceId !== undefined ? { deviceId } : {}),
      anchor: {
        relativeTo,
        position,
      },
    });
    return acc;
  }, []);

  return bubbles.length ? bubbles : undefined;
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

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeStatus(value: unknown): AssetStatus | undefined {
  if (value === "online" || value === "warning" || value === "offline") {
    return value;
  }
  return undefined;
}
