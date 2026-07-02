import { API_ENDPOINTS } from "@/constants/api";
import {
  loadVinuniSiteConfig,
  type IotBubbleConfig,
  type VinuniSiteConfig,
  type VinuniStation,
} from "../config/vinuniSiteConfig";
import {
  fetchDevices,
  fetchLatestSignal,
  fetchStation,
  fetchStationList,
} from "../webEnergyTelemetry";
import { webEnergyClient } from "../webEnergyClient";
import type {
  AssetDetail,
  AssetStatus,
  BimNode,
  MetricValue,
  PortfolioKpi,
  Site,
  SiteDetail,
  TimeSeriesPoint,
  TwinKpi,
} from "../types/domain";
import {
  EnumDeviceType,
  type DeviceResponseDto,
  type SignalHistoryDto,
  type SignalLatestDto,
  type StationResponseDto,
} from "../types/webEnergy";
import {
  METRICS,
  SELECTOR,
  bessPowerKw,
  bessSoc,
  chargerEnergy,
  chargerUtilization,
  historyToSeries,
  latestTimestamp,
  rangeToWindow,
  round,
  solarGenerationKw,
  systemPowerKw,
  systemPowerMw,
  type Metric,
} from "./webEnergyMappers";
import type { Repository, SiteFilter } from "./types";

interface StationRecord {
  config: VinuniStation;
  station?: StationResponseDto;
  latest?: SignalLatestDto;
  devices?: DeviceResponseDto[];
  status: AssetStatus;
}

interface StationLoadOptions {
  latest?: boolean;
  devices?: boolean;
}

async function fetchConfiguredStations(
  options: StationLoadOptions = {}
): Promise<{ config: VinuniSiteConfig; records: StationRecord[] }> {
  const config = await loadVinuniSiteConfig();
  const list = await fetchStationList();

  const records = await Promise.all(
    config.stations.map(async (stationConfig) => {
      const listed = list.find((station) => matchesStation(stationConfig, station));
      const station =
        (await fetchStation(stationConfig.apiId).catch(() => undefined)) ??
        listed;
      const latest = options.latest
        ? await fetchLatestSignal(stationConfig.apiId).catch(() => undefined)
        : undefined;
      const devices = options.devices
        ? await fetchDevices(stationConfig.apiId).catch(() => [])
        : undefined;

      return {
        config: stationConfig,
        station,
        latest,
        devices,
        status: stationStatus(station, latest),
      };
    })
  );

  return { config, records };
}

function matchesStation(config: VinuniStation, station: StationResponseDto): boolean {
  return station.id === config.apiId || (!!config.code && station.code === config.code);
}

function buildSite(config: VinuniSiteConfig, records: StationRecord[]): Site {
  const status = siteStatus(records);
  const totalPowerMw = round(
    records.reduce((sum, record) => sum + systemPowerMw(record.latest), 0)
  );

  return {
    id: config.site.id,
    name: config.site.name,
    code: config.site.code,
    category: "Campus Charging Site",
    assetType: "charging-station",
    status,
    geo: config.site.geo,
    modelUrl: config.site.modelUrl,
    kpi: {
      totalPower: totalPowerMw,
      energyGeneration: siteEnergyMwh(records),
      activeTwinAssets: records.length,
      efficiency: availabilityPct(records),
    },
  };
}

function buildStationMarkerSite(
  config: VinuniSiteConfig,
  record: StationRecord
): Site {
  return {
    id: record.config.id,
    parentSiteId: config.site.id,
    name: stationName(record),
    code: record.station?.code ?? record.config.code,
    category: `${config.site.name} Station`,
    assetType: "charging-station",
    status: record.status,
    geo: record.config.geo,
    modelUrl: record.config.modelUrl,
    kpi: {
      totalPower: systemPowerMw(record.latest),
      energyGeneration: round(chargerEnergy(record.latest) / 1000),
      activeTwinAssets: record.devices?.length ?? 1,
      efficiency: record.status === "online" ? 100 : 0,
    },
  };
}

function applySiteFilter(sites: Site[], filter?: SiteFilter): Site[] {
  let filtered = sites;
  if (filter?.assetTypes?.length) {
    filtered = filtered.filter((site) =>
      filter.assetTypes!.includes(site.assetType)
    );
  }
  if (filter?.statuses?.length) {
    filtered = filtered.filter((site) => filter.statuses!.includes(site.status));
  }
  return filtered;
}

function stationBubbleNodes(
  station: VinuniStation,
  fallbackStatus: AssetStatus,
  devices: DeviceResponseDto[] = []
): BimNode[] | undefined {
  const bubbles = deviceBubbleNodes(station, fallbackStatus, devices);
  if (!bubbles.length) return undefined;

  return [
    {
      id: `${station.id}-devices`,
      label: "IoT Devices",
      kind: "system",
      status: fallbackStatus,
      children: bubbles,
    },
  ];
}

function deviceBubbleNodes(
  station: VinuniStation,
  fallbackStatus: AssetStatus,
  devices: DeviceResponseDto[]
): BimNode[] {
  const configured = station.iotBubbles ?? [];
  const realNodes = realDeviceBubbleNodes(station, fallbackStatus, devices);
  if (!realNodes.length) {
    return configured.map((bubble) => bubbleNode(bubble, fallbackStatus));
  }

  const realBubbleIds = new Set(realNodes.map((node) => node.bubbleId));
  const staticNodes = configured
    .map((bubble) => bubbleNode(bubble, fallbackStatus))
    .filter((node) => !node.bubbleId || !realBubbleIds.has(node.bubbleId));

  return [...realNodes, ...staticNodes];
}

function realDeviceBubbleNodes(
  station: VinuniStation,
  fallbackStatus: AssetStatus,
  devices: DeviceResponseDto[]
): BimNode[] {
  const groups = groupDevicesForBubbles(devices);
  return [...groups.entries()].flatMap(([kind, group]) => {
    const slotId = findBubbleSlotId(station, kind) ?? `${station.id}-${kind}`;
    return group.map((device, index) => {
      const operationNodeId = operationNodeIdForDevice(kind, index);
      const bubbleId = index === 0 ? slotId : `${slotId}-${operationNodeId}`;
      return {
        id: `${station.id}-${operationNodeId}`,
        label: device.deviceName || fallbackBubbleLabel(kind, index),
        kind: "asset",
        assetId: station.id,
        bubbleId,
        bubbleKind: kind,
        operationNodeId,
        deviceId: device.id,
        status: deviceStatus(device, fallbackStatus),
      } satisfies BimNode;
    });
  });
}

function bubbleNode(
  bubble: IotBubbleConfig,
  fallbackStatus: AssetStatus
): BimNode {
  return {
    id: bubble.id,
    label: bubble.label,
    kind: "asset",
    assetId: bubble.assetId,
    bubbleId: bubble.id,
    bubbleKind: bubble.kind,
    operationNodeId: bubble.operationNodeId,
    deviceId: bubble.deviceId,
    status: bubble.status ?? fallbackStatus,
  };
}

function groupDevicesForBubbles(
  devices: DeviceResponseDto[]
): Map<string, DeviceResponseDto[]> {
  const groups = new Map<string, DeviceResponseDto[]>();
  for (const device of devices) {
    const kind = bubbleKindForDevice(device.deviceType);
    if (!kind) continue;
    const items = groups.get(kind) ?? [];
    items.push(device);
    groups.set(kind, items);
  }
  return groups;
}

function bubbleKindForDevice(type: EnumDeviceType): string | null {
  if (type === EnumDeviceType.Grid) return "grid";
  if (type === EnumDeviceType.Solar) return "solar";
  if (type === EnumDeviceType.Bess) return "bess";
  if (type === EnumDeviceType.Charger) return "charger";
  if (type === EnumDeviceType.Wind) return "wind";
  if (type === EnumDeviceType.Weather) return "weather";
  return null;
}

function findBubbleSlotId(
  station: VinuniStation,
  kind: string
): string | undefined {
  const slots = station.iotBubbles ?? [];
  return (
    slots.find((slot) => slot.kind?.toLowerCase() === kind)?.id ??
    slots.find((slot) => slot.label.toLowerCase().includes(kind))?.id
  );
}

function operationNodeIdForDevice(kind: string, index: number): string {
  if (kind === "grid") return "grid-card";
  if (kind === "solar") return "solar-card";
  if (kind === "wind") return "wind-card";
  if (kind === "weather") return "weather-card";
  if (kind === "bess") return `bess-${index + 1}-card`;
  if (kind === "charger") return `charger-${index + 1}`;
  return `${kind}-${index + 1}`;
}

function fallbackBubbleLabel(kind: string, index: number): string {
  if (kind === "solar") return "PV Solar";
  if (kind === "bess") return `BESS ${index + 1}`;
  if (kind === "charger") return `Charger ${index + 1}`;
  if (kind === "wind") return "Wind Turbine";
  if (kind === "weather") return "Weather";
  if (kind === "grid") return "Grid";
  return kind;
}

function deviceStatus(
  device: DeviceResponseDto,
  fallbackStatus: AssetStatus
): AssetStatus {
  if (device.status === 0) return "offline";
  if (device.status === 1) return "online";
  return fallbackStatus;
}

const repository: Repository = {
  async getSites(filter?: SiteFilter) {
    const { config, records } = await fetchConfiguredStations({ latest: true });
    return applySiteFilter(
      records.map((record) => buildStationMarkerSite(config, record)),
      filter
    );
  },

  async getPortfolioKpis(): Promise<PortfolioKpi> {
    const { records } = await fetchConfiguredStations({ latest: true });
    const onlineTwins = records.filter((record) => record.status === "online").length;

    return {
      totalAssets: records.length,
      countriesCount: 1,
      onlineTwins,
      onlinePct: records.length ? Math.round((onlineTwins / records.length) * 100) : 0,
      activeAlerts: records.filter((record) => record.status !== "online").length,
      efficiencyAvg: availabilityPct(records),
      efficiencyDelta: { pct: 0, direction: "up" },
    };
  },

  async getSiteDetail(siteId: string): Promise<SiteDetail> {
    const { config, records } = await fetchConfiguredStations({
      latest: true,
      devices: true,
    });
    const station = records.find((record) => record.config.id === siteId);
    if (station) {
      return {
        ...buildStationMarkerSite(config, station),
        ...stationSiteExtras(config, station),
      };
    }

    const site = buildSite(config, records);
    return { ...site, ...siteExtras(config, records) };
  },

  async getSiteTimeseries(siteId, metric, range) {
    const m = toMetric(metric);
    const { records } = await fetchConfiguredStations();
    const station = records.find((record) => record.config.id === siteId);
    if (station) return fetchHistory(station.config.apiId, m, range);

    const series = await Promise.all(
      records.map((record) => fetchHistory(record.config.apiId, m, range))
    );
    return mergeSeries(series.flat(), m, m === "bess" ? "avg" : "sum");
  },

  async getBimTree(): Promise<BimNode> {
    const { config, records } = await fetchConfiguredStations({
      latest: true,
      devices: true,
    });
    return {
      id: config.site.id,
      label: config.site.name,
      kind: "site",
      status: siteStatus(records),
      children: [
        {
          id: "stations",
          label: "Stations",
          kind: "group",
          status: siteStatus(records),
          children: records.map((record) => ({
            id: record.config.id,
            label: stationName(record),
            kind: "asset",
            assetId: record.config.id,
            status: record.status,
            children: stationBubbleNodes(
              record.config,
              record.status,
              record.devices
            ),
          })),
        },
      ],
    };
  },

  async getTwinKpis(): Promise<TwinKpi> {
    const { records } = await fetchConfiguredStations({ latest: true });
    const totalPowerMw = round(
      records.reduce((sum, record) => sum + systemPowerMw(record.latest), 0)
    );
    const solarKw = round(
      records.reduce((sum, record) => sum + solarGenerationKw(record.latest), 0)
    );
    const utilization = average(
      records.map((record) => chargerUtilization(record.latest))
    );
    const soc = average(records.map((record) => bessSoc(record.latest)));

    return {
      totalPower: metric("Total Power", totalPowerMw, "MW"),
      coolingEfficiency: metric("Solar Generation", solarKw, "kW"),
      occupancy: metric("EV Utilization", utilization, "%"),
      batterySoc: metric("Battery SoC", soc, "%"),
    };
  },

  async getAssetDetail(_siteId, assetId): Promise<AssetDetail> {
    void _siteId;
    const { records } = await fetchConfiguredStations({
      latest: true,
      devices: true,
    });
    const record =
      records.find((item) => item.config.id === assetId) ?? records[0];

    return {
      id: record.config.id,
      name: stationName(record),
      typeLabel: "Charging Station",
      status: record.status,
      operationalLabel: statusLabel(record.status),
      overview: stationOverview(record),
      technical: stationTechnical(record),
      maintenance: stationMaintenance(record),
    };
  },

  async getAssetTimeseries(_siteId, assetId, metric, range) {
    void _siteId;
    const config = await loadVinuniSiteConfig();
    const station = config.stations.find((item) => item.id === assetId);
    if (!station) return [];
    return fetchHistory(station.apiId, toMetric(metric), range);
  },
};

export const webEnergyRepository = repository;

// ---- history fetching -----------------------------------------------------

const HISTORY_ENDPOINT: Record<Metric, string> = {
  power: API_ENDPOINTS.webEnergy.signalHistorySystem,
  solar: API_ENDPOINTS.webEnergy.signalHistorySolar,
  bess: API_ENDPOINTS.webEnergy.signalHistoryBess,
  charger: API_ENDPOINTS.webEnergy.signalHistoryCharger,
};

const METRIC_DEVICE_TYPE: Partial<Record<Metric, EnumDeviceType>> = {
  bess: EnumDeviceType.Bess,
  charger: EnumDeviceType.Charger,
};

function toMetric(metric: string): Metric {
  return (METRICS as string[]).includes(metric) ? (metric as Metric) : "power";
}

async function resolveDeviceId(
  apiId: number,
  metric: Metric
): Promise<number | undefined> {
  const deviceType = METRIC_DEVICE_TYPE[metric];
  if (deviceType === undefined) return undefined;
  const devices = await fetchDevices(apiId).catch(() => []);
  return devices.find((device) => device.deviceType === deviceType)?.id;
}

async function fetchHistory(
  apiId: number,
  metric: Metric,
  range: string
): Promise<TimeSeriesPoint[]> {
  const { start, end } = rangeToWindow(range);
  const deviceId = await resolveDeviceId(apiId, metric);
  const params = new URLSearchParams({
    stationId: String(apiId),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isTakeSampling: "true",
  });
  if (deviceId !== undefined) params.set("deviceId", String(deviceId));

  try {
    const res = await webEnergyClient.get<SignalHistoryDto>(
      `${HISTORY_ENDPOINT[metric]}?${params.toString()}`
    );
    return historyToSeries(res.list ?? [], SELECTOR[metric], metric);
  } catch {
    return [];
  }
}

function mergeSeries(
  points: TimeSeriesPoint[],
  series: string,
  mode: "sum" | "avg"
): TimeSeriesPoint[] {
  const totals = new Map<number, number>();
  const counts = new Map<number, number>();
  for (const point of points) {
    totals.set(point.t, (totals.get(point.t) ?? 0) + point.value);
    counts.set(point.t, (counts.get(point.t) ?? 0) + 1);
  }
  return [...totals.entries()]
    .map(([t, value]) => ({
      t,
      value: round(mode === "avg" ? value / (counts.get(t) ?? 1) : value),
      series,
    }))
    .sort((a, b) => a.t - b.t);
}

// ---- detail builders ------------------------------------------------------

function siteExtras(
  config: VinuniSiteConfig,
  records: StationRecord[]
): Pick<SiteDetail, "systemStatus" | "alerts" | "details"> {
  return {
    systemStatus: records.map((record) => ({
      name: stationName(record),
      status: record.status,
    })),
    alerts: records
      .filter((record) => record.status !== "online")
      .map((record) => ({
        id: `${record.config.id}-status`,
        severity: record.status,
        message: `${stationName(record)} is ${statusLabel(record.status).toLowerCase()}`,
        timestamp: Date.now(),
      })),
    details: [
      { label: "Site Code", value: config.site.code ?? "-" },
      { label: "Backend Station IDs", value: records.map((r) => r.config.apiId).join(", ") },
      { label: "Stations", value: records.length },
      { label: "Online Stations", value: records.filter((r) => r.status === "online").length },
    ],
  };
}

function stationSiteExtras(
  config: VinuniSiteConfig,
  record: StationRecord
): Pick<SiteDetail, "systemStatus" | "alerts" | "details"> {
  return {
    systemStatus: [
      {
        name: stationName(record),
        status: record.status,
      },
    ],
    alerts:
      record.status === "online"
        ? []
        : [
            {
              id: `${record.config.id}-status`,
              severity: record.status,
              message: `${stationName(record)} is ${statusLabel(record.status).toLowerCase()}`,
              timestamp: Date.now(),
            },
          ],
    details: [
      { label: "Parent Site", value: config.site.name },
      { label: "Site Code", value: config.site.code ?? "-" },
      { label: "Station Code", value: record.station?.code ?? record.config.code ?? "-" },
      { label: "API Station ID", value: record.config.apiId },
      {
        label: "Location",
        value: `${record.config.geo.lat.toFixed(6)}, ${record.config.geo.lng.toFixed(6)}`,
      },
      { label: "Devices", value: record.devices?.length ?? 0 },
    ],
  };
}

function stationOverview(record: StationRecord): MetricValue[] {
  return [
    metric("Power Output", systemPowerKw(record.latest), "kW"),
    metric("Solar Generation", solarGenerationKw(record.latest), "kW"),
    metric("Battery SoC", bessSoc(record.latest), "%"),
    metric("Battery Power", bessPowerKw(record.latest), "kW"),
    metric("EV Utilization", chargerUtilization(record.latest), "%"),
    metric("Charge Energy", chargerEnergy(record.latest), "kWh"),
  ];
}

function stationTechnical(record: StationRecord): MetricValue[] {
  const station = record.station;
  return [
    { label: "Station Code", value: station?.code ?? record.config.code ?? "-" },
    { label: "API Station ID", value: record.config.apiId },
    { label: "Backend Status", value: statusLabel(record.status) },
    { label: "PLC Address", value: station?.plcAddress ?? "-" },
    { label: "PLC Port", value: station?.plcPort ?? "-" },
    { label: "Device Count", value: record.devices?.length ?? 0 },
  ];
}

function stationMaintenance(record: StationRecord): MetricValue[] {
  return [
    { label: "Created At", value: record.station?.createdAt ?? "-" },
    { label: "Last Updated", value: record.station?.updatedAt ?? "-" },
    { label: "Latest Signal", value: latestTimestamp(record.latest) ?? "-" },
  ];
}

// ---- status / aggregate helpers -------------------------------------------

function stationStatus(
  station?: StationResponseDto,
  latest?: SignalLatestDto
): AssetStatus {
  if (!station || station.status === 0) return "offline";
  if (latest?.isStationHealthy === false) return "warning";
  return "online";
}

function siteStatus(records: StationRecord[]): AssetStatus {
  if (!records.length) return "offline";
  if (records.every((record) => record.status === "online")) return "online";
  if (records.every((record) => record.status === "offline")) return "offline";
  return "warning";
}

function stationName(record: StationRecord): string {
  return record.station?.name || record.config.name;
}

function statusLabel(status: AssetStatus): string {
  if (status === "online") return "Operational";
  if (status === "warning") return "Warning";
  return "Offline";
}

function metric(
  label: string,
  value: number | string,
  unit?: string
): MetricValue {
  return { label, value, unit };
}

function availabilityPct(records: StationRecord[]): number {
  if (!records.length) return 0;
  return Math.round(
    (records.filter((record) => record.status === "online").length /
      records.length) *
      100
  );
}

function siteEnergyMwh(records: StationRecord[]): number {
  return round(
    records.reduce((sum, record) => sum + chargerEnergy(record.latest), 0) / 1000
  );
}

function average(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return 0;
  return Math.round(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}
