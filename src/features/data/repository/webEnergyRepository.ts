import { API_ENDPOINTS } from "@/constants/api";
import {
  loadVinuniSiteConfig,
  type VinuniSiteConfig,
  type VinuniStation,
} from "../config/vinuniSiteConfig";
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
  type EnergyDataResponseDto,
  type SignalHistoryDto,
  type SignalLatestDto,
  type StationResponseDto,
} from "../types/webEnergy";
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

async function fetchStationList(): Promise<StationResponseDto[]> {
  const res = await webEnergyClient.get<StationResponseDto>(
    `${API_ENDPOINTS.webEnergy.stationList}?Status=1`
  );
  return res.list ?? [];
}

async function fetchStation(apiId: number): Promise<StationResponseDto | undefined> {
  const res = await webEnergyClient.get<StationResponseDto>(
    API_ENDPOINTS.webEnergy.stationDetails(apiId)
  );
  return res.data;
}

async function fetchDevices(apiId: number): Promise<DeviceResponseDto[]> {
  const res = await webEnergyClient.get<DeviceResponseDto>(
    API_ENDPOINTS.webEnergy.devicesOfStation(apiId)
  );
  return res.list ?? [];
}

async function fetchLatestSignal(
  apiId: number
): Promise<SignalLatestDto | undefined> {
  const params = new URLSearchParams({
    stationId: String(apiId),
    isCheckTime: "true",
  });
  params.append("deviceType", String(EnumDeviceType.CommonSystem));
  params.append("deviceType", String(EnumDeviceType.Charger));

  const res = await webEnergyClient.get<SignalLatestDto>(
    `${API_ENDPOINTS.webEnergy.signalLatest}?${params.toString()}`
  );
  return res.data;
}

function matchesStation(config: VinuniStation, station: StationResponseDto): boolean {
  return station.id === config.apiId || (!!config.code && station.code === config.code);
}

function buildSite(config: VinuniSiteConfig, records: StationRecord[]): Site {
  const status = siteStatus(records);
  const totalPowerMw = round(
    records.reduce((sum, record) => sum + powerWatts(record.latest), 0) /
      1_000_000
  );
  const energyGeneration = round(
    records.reduce((sum, record) => sum + energyMwh(record.latest), 0)
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
      energyGeneration,
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
      totalPower: round(powerWatts(record.latest) / 1_000_000),
      energyGeneration: energyMwh(record.latest),
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
    if (siteId !== config.site.id) return { ...site, ...siteExtras(config, records) };
    return { ...site, ...siteExtras(config, records) };
  },

  async getSiteTimeseries(siteId) {
    const { records } = await fetchConfiguredStations();
    const station = records.find((record) => record.config.id === siteId);
    if (station) return fetchPowerHistory(station.config.apiId);

    const series = await Promise.all(
      records.map((record) => fetchPowerHistory(record.config.apiId))
    );
    return mergeSeries(series.flat(), "power");
  },

  async getBimTree(): Promise<BimNode> {
    const { config, records } = await fetchConfiguredStations({ latest: true });
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
          })),
        },
      ],
    };
  },

  async getTwinKpis(): Promise<TwinKpi> {
    const { records } = await fetchConfiguredStations({ latest: true });
    const totalPowerMw = round(
      records.reduce((sum, record) => sum + powerWatts(record.latest), 0) /
        1_000_000
    );
    const utilization = average(records.map((record) => chargerUtilization(record.latest)));
    const availability = availabilityPct(records);

    return {
      totalPower: metric("Total Power", totalPowerMw, "MW"),
      coolingEfficiency: metric("Station Efficiency", availability, "%"),
      occupancy: metric("Utilization", utilization, "%"),
      batterySoc: metric("Availability", availability, "%"),
    };
  },

  async getAssetDetail(_siteId, assetId): Promise<AssetDetail> {
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

  async getAssetTimeseries(_siteId, assetId) {
    void _siteId;
    const config = await loadVinuniSiteConfig();
    const station = config.stations.find((item) => item.id === assetId);
    if (!station) return [];
    return fetchPowerHistory(station.apiId);
  },
};

export const webEnergyRepository = repository;

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
    metric("Power Output", round(powerWatts(record.latest) / 1000), "kW"),
    metric("Energy Today", energyMwh(record.latest), "MWh"),
    metric("Devices", record.devices?.length ?? 0),
    metric("Availability", record.status === "online" ? 100 : 0, "%"),
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
  const latestTime = latestTimestamp(record.latest);
  return [
    { label: "Created At", value: record.station?.createdAt ?? "-" },
    { label: "Last Updated", value: record.station?.updatedAt ?? "-" },
    { label: "Latest Signal", value: latestTime ?? "-" },
  ];
}

async function fetchPowerHistory(apiId: number): Promise<TimeSeriesPoint[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 3600_000);
  const params = new URLSearchParams({
    stationId: String(apiId),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isTakeSampling: "true",
  });

  try {
    const res = await webEnergyClient.get<SignalHistoryDto>(
      `${API_ENDPOINTS.webEnergy.signalHistorySystem}?${params.toString()}`
    );
    return (res.list ?? [])
      .map((point) => {
        const time = point.time ?? point.data?.latestTime;
        return {
          t: time ? Date.parse(time) : 0,
          value: round(powerWatts(point) / 1000),
          series: "power",
        };
      })
      .filter((point) => Number.isFinite(point.t) && point.t > 0)
      .sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}

function mergeSeries(points: TimeSeriesPoint[], series: string): TimeSeriesPoint[] {
  const byTime = new Map<number, number>();
  for (const point of points) {
    byTime.set(point.t, (byTime.get(point.t) ?? 0) + point.value);
  }
  return [...byTime.entries()]
    .map(([t, value]) => ({ t, value: round(value), series }))
    .sort((a, b) => a.t - b.t);
}

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

function average(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return 0;
  return Math.round(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

function chargerUtilization(latest?: SignalLatestDto): number {
  const chargers = payload(latest).charger ?? [];
  if (!chargers.length) return 0;
  const active = chargers.filter((charger) => {
    const state = charger.chargeStatus?.toLowerCase() ?? "";
    return state.length > 0 && !state.includes("available");
  }).length;
  return Math.round((active / chargers.length) * 100);
}

function energyMwh(latest?: SignalLatestDto): number {
  const chargers = payload(latest).charger ?? [];
  const total = chargers.reduce(
    (sum, charger) =>
      sum + (charger.totalChargeEnergy ?? charger.lastChargeEnergy ?? 0),
    0
  );
  return round(total > 1000 ? total / 1000 : total);
}

function powerWatts(
  input?: SignalLatestDto | SignalHistoryDto | EnergyDataResponseDto
): number {
  return payload(input).system?.multimeter?.p ?? 0;
}

function latestTimestamp(input?: SignalLatestDto): string | undefined {
  const data = payload(input);
  return input?.time ?? data.latestTime ?? data.latestOnline;
}

function payload(
  input?: SignalLatestDto | SignalHistoryDto | EnergyDataResponseDto
): EnergyDataResponseDto {
  if (!input) return {};
  if ("data" in input && input.data) return input.data;
  return input as EnergyDataResponseDto;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
