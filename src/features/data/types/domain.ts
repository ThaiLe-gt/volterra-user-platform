/**
 * Domain model — the ONLY shapes UI components depend on. Repositories (mock,
 * web-energy, gateway) all produce these, so the data source is swappable.
 */

export type AssetStatus = "online" | "warning" | "offline";

export type AssetType =
  | "charging-station"
  | "data-center"
  | "solar-plant"
  | "building"
  | "industrial";

export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface Delta {
  /** percent change vs comparison window */
  pct: number;
  direction: "up" | "down";
}

export interface MetricValue {
  label: string;
  value: number | string;
  unit?: string;
  delta?: Delta;
}

export interface TimeSeriesPoint {
  /** epoch ms */
  t: number;
  value: number;
  series: string;
}

// ---- Portfolio ------------------------------------------------------------

export interface SiteKpiSummary {
  totalPower: number; // MW
  energyGeneration: number; // MWh
  activeTwinAssets: number;
  efficiency: number; // percent
}

export interface Site {
  id: string;
  /** Parent site id when this portfolio item represents a child asset/station. */
  parentSiteId?: string;
  name: string;
  code?: string;
  category: string; // human label e.g. "Educational Campus"
  assetType: AssetType;
  status: AssetStatus;
  geo: GeoPoint;
  /** GLB url for the digital-twin viewer (optional in phase 1). */
  modelUrl?: string;
  kpi: SiteKpiSummary;
}

export interface SiteSystemStatus {
  name: string;
  status: AssetStatus;
}

export interface SiteAlert {
  id: string;
  severity: AssetStatus;
  message: string;
  timestamp: number;
}

export interface SiteDetail extends Site {
  systemStatus: SiteSystemStatus[];
  alerts: SiteAlert[];
  details: MetricValue[];
}

export interface PortfolioKpi {
  totalAssets: number;
  countriesCount: number;
  onlineTwins: number;
  onlinePct: number;
  activeAlerts: number;
  efficiencyAvg: number;
  efficiencyDelta: Delta;
}

// ---- Digital Twin ---------------------------------------------------------

export type BimNodeKind =
  | "site"
  | "group"
  | "building"
  | "floor"
  | "system"
  | "asset";

export interface BimNode {
  id: string;
  label: string;
  kind: BimNodeKind;
  /** mesh correlation id baked into the GLB (node.name / userData.assetId) */
  assetId?: string;
  /** Optional IoT bubble id for device-level scene focus. */
  bubbleId?: string;
  bubbleKind?: string;
  /** Live operation node/device binding used to keep tree and bubbles in sync. */
  operationNodeId?: string;
  deviceId?: number;
  status?: AssetStatus;
  children?: BimNode[];
}

export interface TwinKpi {
  totalPower: MetricValue; // MW
  coolingEfficiency: MetricValue; // %
  occupancy: MetricValue; // %
  batterySoc: MetricValue; // %
}

export interface AssetDetail {
  id: string;
  name: string;
  typeLabel: string; // e.g. "Air Handling Unit"
  status: AssetStatus;
  operationalLabel: string; // e.g. "Operational"
  overview: MetricValue[];
  technical: MetricValue[];
  maintenance: MetricValue[];
}
