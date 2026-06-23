import type { AssetStatus, GeoPoint } from "@/features/data/types/domain";
import {
  DEFAULT_VINUNI_SITE_CONFIG,
  loadVinuniSiteConfig,
  type ModelTransformConfig,
} from "@/features/data/config/vinuniSiteConfig";
import { TWIN_CAMERA, VINUNI_ORIGIN } from "@/features/map/lib/mapboxConfig";

export interface BimRotation {
  /** degrees; x=90 converts glTF Y-up → Mercator Z-up */
  x: number;
  y: number;
  z: number;
}

export interface BimCamera {
  zoom: number;
  /** Raw Mapbox pitch: 0 = top-down, 85 = close to horizon. */
  pitch: number;
  /** User-facing angle above the ground/horizon. Overrides pitch when set. */
  groundAngle?: number;
  bearing: number;
}

export interface BimSiteConfig {
  id: string;
  name: string;
  code?: string;
  geo: GeoPoint;
  modelUrl?: string;
  transform?: ModelTransformConfig;
}

export interface BimStationConfig {
  id: string;
  apiId?: number;
  name: string;
  code?: string;
  geo: GeoPoint;
  status?: AssetStatus;
  modelUrl?: string;
  transform?: ModelTransformConfig;
}

export interface BimConfig {
  site: BimSiteConfig;
  stations: BimStationConfig[];
  /** Legacy scene-level model URL; prefer site.modelUrl or stations[].modelUrl. */
  modelUrl?: string;
  origin: GeoPoint;
  altitude: number;
  /** multiplier on meters→Mercator units (1 = real-world scale) */
  scale: number;
  rotation: BimRotation;
  camera: BimCamera;
}

export const DEFAULT_BIM_CONFIG: BimConfig = {
  site: {
    ...DEFAULT_VINUNI_SITE_CONFIG.site,
  },
  stations: DEFAULT_VINUNI_SITE_CONFIG.stations.map((station) => ({
    ...station,
    status: "online",
  })),
  origin: { lng: VINUNI_ORIGIN.longitude, lat: VINUNI_ORIGIN.latitude },
  altitude: 0,
  scale: 1,
  rotation: { x: 90, y: 0, z: 0 },
  camera: {
    zoom: TWIN_CAMERA.zoom,
    pitch: TWIN_CAMERA.pitch,
    bearing: TWIN_CAMERA.bearing,
  },
};

/**
 * Load the runtime BIM placement config from /public/config/bim.json so the
 * model's location/scale/angle can be tuned without a rebuild (phase 1). Falls
 * back to DEFAULT_BIM_CONFIG if the file is missing or malformed.
 */
export async function loadBimConfig(): Promise<BimConfig> {
  try {
    const [siteConfig, json] = await Promise.all([
      loadVinuniSiteConfig(),
      loadPlacementConfig(),
    ]);
    const base: BimConfig = {
      ...DEFAULT_BIM_CONFIG,
      site: { ...siteConfig.site },
      stations: siteConfig.stations.map((station) => ({
        ...station,
        status: "online",
      })),
      origin: { ...siteConfig.site.geo },
    };
    return {
      ...base,
      ...json,
      site: {
        ...base.site,
        ...json.site,
        geo: { ...base.site.geo, ...json.site?.geo },
        transform: mergeTransform(base.site.transform, json.site?.transform),
      },
      stations: mergeStations(base.stations, json.stations),
      origin: { ...base.origin, ...json.origin },
      rotation: { ...DEFAULT_BIM_CONFIG.rotation, ...json.rotation },
      camera: normalizeCamera(DEFAULT_BIM_CONFIG.camera, json.camera),
    };
  } catch {
    return DEFAULT_BIM_CONFIG;
  }
}

function normalizeCamera(
  base: BimCamera,
  override?: Partial<BimCamera>
): BimCamera {
  const camera = { ...base, ...override };
  const groundAngle =
    typeof override?.groundAngle === "number" &&
    Number.isFinite(override.groundAngle)
      ? clamp(override.groundAngle, 0, 90)
      : undefined;

  if (groundAngle !== undefined) {
    return {
      ...camera,
      groundAngle,
      pitch: clamp(90 - groundAngle, 0, 85),
    };
  }

  return {
    ...camera,
    pitch: clamp(camera.pitch, 0, 85),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function loadPlacementConfig(): Promise<Partial<BimConfig>> {
  try {
    const res = await fetch("/config/bim.json", { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as Partial<BimConfig>;
  } catch {
    return {};
  }
}

function mergeStations(
  baseStations: BimStationConfig[],
  overrides?: BimStationConfig[]
): BimStationConfig[] {
  if (!Array.isArray(overrides)) return baseStations;
  return baseStations.map((base, index) => {
    const override =
      overrides.find((station) => station.id === base.id) ?? overrides[index];
    if (!override) return base;
    return {
      ...base,
      ...override,
      geo: { ...base.geo, ...override.geo },
      transform: mergeTransform(base.transform, override.transform),
    };
  });
}

function mergeTransform(
  base?: ModelTransformConfig,
  override?: ModelTransformConfig
): ModelTransformConfig | undefined {
  if (!base && !override) return undefined;
  return {
    ...base,
    ...override,
    rotation: {
      ...base?.rotation,
      ...override?.rotation,
    },
    offset: {
      ...base?.offset,
      ...override?.offset,
    },
  };
}
