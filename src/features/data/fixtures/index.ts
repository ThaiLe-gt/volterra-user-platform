import type {
  AssetDetail,
  BimNode,
  PortfolioKpi,
  Site,
  SiteDetail,
  TimeSeriesPoint,
  TwinKpi,
} from "../types/domain";
import sitesJson from "./sites.json";
import portfolioKpiJson from "./portfolioKpi.json";
import bimTreeJson from "./bimTree.json";
import twinKpiJson from "./twinKpi.json";
import assetDetailsJson from "./assetDetails.json";

// Mock data lives in the sibling *.json files so it can be edited without code.
export const SITES = sitesJson as unknown as Site[];
export const PORTFOLIO_KPI = portfolioKpiJson as unknown as PortfolioKpi;
export const BIM_TREE = bimTreeJson as unknown as BimNode;
export const TWIN_KPI = twinKpiJson as unknown as TwinKpi;
const ASSET_DETAILS = assetDetailsJson as unknown as Record<string, AssetDetail>;

const DEFAULT_SITE_ID = "site-vinuni";
const DEFAULT_ASSET_ID = "vinuni-station-01";

const SITE_DETAIL_EXTRAS: Record<
  string,
  Pick<SiteDetail, "systemStatus" | "alerts" | "details">
> = {
  [DEFAULT_SITE_ID]: {
    systemStatus: [
      { name: "VinUni Station 01", status: "online" },
      { name: "VinUni Station 02", status: "online" },
    ],
    alerts: [],
    details: [
      { label: "Site Status", value: "Online" },
      { label: "Site Code", value: "VINUNI" },
      { label: "Location", value: "VinUni Campus" },
      { label: "Stations", value: 2 },
    ],
  },
};

export function getSiteDetail(siteId: string): SiteDetail {
  const site = SITES.find((s) => s.id === siteId) ?? SITES[0];
  const extras =
    SITE_DETAIL_EXTRAS[siteId] ?? SITE_DETAIL_EXTRAS[DEFAULT_SITE_ID];
  return { ...site, ...extras };
}

export function getAssetDetail(assetId: string): AssetDetail {
  return (
    ASSET_DETAILS[assetId] ?? {
      ...ASSET_DETAILS[DEFAULT_ASSET_ID],
      id: assetId,
      name: assetId,
    }
  );
}

/** Deterministic-ish wavy series for the real-time mini charts. */
export function generateSeries(
  series: string,
  base: number,
  amplitude: number,
  points = 24
): TimeSeriesPoint[] {
  const now = Date.now();
  const stepMs = (24 * 3600_000) / points;
  return Array.from({ length: points }, (_, i) => {
    const phase = (i / points) * Math.PI * 2;
    const noise = Math.sin(phase * 1.7 + base) * 0.4;
    return {
      t: now - (points - 1 - i) * stepMs,
      value: Math.max(0, base + Math.sin(phase) * amplitude + noise * amplitude),
      series,
    };
  });
}
