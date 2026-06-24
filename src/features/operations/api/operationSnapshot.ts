import {
  loadVinuniSiteConfig,
  type VinuniStation,
} from "@/features/data/config/vinuniSiteConfig";
import {
  fetchDevices,
  fetchLatestSignal,
  fetchStation,
  OPERATION_LATEST_DEVICE_TYPES,
} from "@/features/data/webEnergyTelemetry";
import {
  bessSoc,
  chargerUtilization,
  latestTimestamp,
  payload,
  round,
  solarGenerationKw,
  systemPowerKw,
} from "@/features/data/repository/webEnergyMappers";
import {
  EnumDeviceType,
  type BessDto,
  type ChargerDto,
  type DeviceResponseDto,
  type EnergyDataResponseDto,
  type MultimeterDto,
  type SignalLatestDto,
  type StationResponseDto,
} from "@/features/data/types/webEnergy";
import type {
  OperationKpi,
  OperationNode,
  OperationSnapshot,
  OperationStationOption,
  OperationTelemetryRow,
} from "../types";

const ASSET_BASE = "/operation-assets/energy";

export async function getOperationStations(): Promise<OperationStationOption[]> {
  const config = await loadVinuniSiteConfig();
  return config.stations.map(toStationOption);
}

export async function getWebEnergyOperationSnapshot(
  selectedStationId?: string
): Promise<OperationSnapshot> {
  const config = await loadVinuniSiteConfig();
  const stationConfig =
    config.stations.find((station) => station.id === selectedStationId) ??
    config.stations[0];

  const [station, devices, latest] = await Promise.all([
    fetchStation(stationConfig.apiId).catch(() => undefined),
    fetchDevices(stationConfig.apiId).catch(() => []),
    fetchLatestSignal(
      stationConfig.apiId,
      OPERATION_LATEST_DEVICE_TYPES
    ).catch(() => undefined),
  ]);

  return composeSnapshot({
    stationConfig,
    station,
    devices,
    latest,
  });
}

function composeSnapshot({
  stationConfig,
  station,
  devices,
  latest,
}: {
  stationConfig: VinuniStation;
  station?: StationResponseDto;
  devices: DeviceResponseDto[];
  latest?: SignalLatestDto;
}): OperationSnapshot {
  const data = payload(latest);
  const timestamp = latestTimestamp(latest) ?? new Date().toISOString();
  const stationOption = {
    ...toStationOption(stationConfig),
    name: station?.name ?? stationConfig.name,
    code: station?.code ?? stationConfig.code,
  };

  return {
    station: stationOption,
    selectedStationId: stationOption.id,
    latestTimestamp: timestamp,
    readOnly: false,
    status: {
      station: stationStatusLabel(station, latest),
      stationTone: stationStatusTone(station, latest),
      grid: gridStatusLabel(data),
      gridTone: data.grid?.status === false ? "offline" : "online",
      plc: plcStatusLabel(data),
      plcTone: plcStatusTone(data),
      timestamp,
    },
    kpis: buildKpis(latest),
    nodes: buildNodes(data, devices),
  };
}

function toStationOption(station: VinuniStation): OperationStationOption {
  return {
    id: station.id,
    apiId: station.apiId,
    name: station.name,
    code: station.code,
  };
}

function buildKpis(latest?: SignalLatestDto): OperationKpi[] {
  return [
    { label: "Total Power", value: formatNumber(systemPowerKw(latest)), unit: "kW" },
    {
      label: "Solar",
      value: formatNumber(solarGenerationKw(latest)),
      unit: "kW",
    },
    { label: "BESS SoC", value: formatNumber(bessSoc(latest), 1), unit: "%" },
    {
      label: "EV Utilization",
      value: formatNumber(chargerUtilization(latest), 0),
      unit: "%",
    },
  ];
}

function buildNodes(
  data: EnergyDataResponseDto,
  devices: DeviceResponseDto[]
): OperationNode[] {
  const gridDevice = firstDevice(devices, EnumDeviceType.Grid);
  const solarDevice = firstDevice(devices, EnumDeviceType.Solar);
  const bessDevices = devices.filter((device) => device.deviceType === EnumDeviceType.Bess);
  const chargerDevices = devices.filter(
    (device) => device.deviceType === EnumDeviceType.Charger
  );
  const bessList = data.bess ?? [];
  const chargerList = data.charger ?? [];

  return [
    gridNode(data, gridDevice),
    solarNode(data, solarDevice),
    ...bessNodes(bessList, bessDevices),
    breakerNode("grid-mccb", "Grid MCCB", 356, 82, "grid", "grid", gridDevice?.id),
    breakerNode(
      "solar-mccb",
      "Solar MCCB",
      356,
      222,
      "solar",
      "solar",
      solarDevice?.id
    ),
    ...bessBreakerNodes(bessList, bessDevices),
    breakerNode("plc-mccb", "PLC MCCB", 356, 622, "aux"),
    atsNode("ats-1", "ATS 01", 520, 245, bessDevices[0]?.id),
    atsNode("ats-2", "ATS 02", 520, 460, bessDevices[1]?.id ?? bessDevices[0]?.id),
    ...chargerBreakerNodes(chargerList, chargerDevices),
    ...chargerNodes(chargerList, chargerDevices),
    {
      id: "plc-aux",
      kind: "plc",
      visual: "pill",
      group: "aux",
      label: "PLC & Auxiliaries",
      status: data.system?.plc?.communication === false ? "offline" : "online",
      stateLabel: plcStatusLabel(data),
      position: { x: 222, y: 646 },
      telemetry: [
        { label: "PLC status", value: plcStatusLabel(data) },
        {
          label: "Auxiliary bus",
          value: data.system?.auxiliaryStatus === false ? "OFF" : "ON",
        },
      ],
    },
  ];
}

function gridNode(
  data: EnergyDataResponseDto,
  device?: DeviceResponseDto
): OperationNode {
  const multimeter = data.grid?.multimeter ?? data.system?.multimeter;
  const status = nodeStatus(data.grid?.status, device);
  return {
    id: "grid-card",
    kind: "grid",
    visual: "card",
    group: "power",
    label: "Grid",
    status,
    stateLabel: status === "offline" ? "Unavailable" : "Generating",
    metric: "power",
    controlType: "grid",
    deviceId: device?.id ?? data.grid?.deviceId,
    position: { x: 44, y: 76 },
    image: `${ASSET_BASE}/eMccb.png`,
    telemetry: powerRows(multimeter),
  };
}

function solarNode(
  data: EnergyDataResponseDto,
  device?: DeviceResponseDto
): OperationNode {
  const status = nodeStatus(data.solar?.status, device);
  return {
    id: "solar-card",
    kind: "solar",
    visual: "card",
    group: "solar",
    label: "PV Solar",
    status,
    stateLabel: status === "offline" ? "Unavailable" : "Generating",
    metric: "solar",
    controlType: "solar",
    deviceId: device?.id ?? data.solar?.deviceId,
    position: { x: 44, y: 216 },
    image: `${ASSET_BASE}/ePvSolar.png`,
    telemetry: [
      {
        label: "Active power",
        value: formatNumber((data.solar?.power ?? 0) / 1000),
        unit: "kW",
      },
      {
        label: "Reactive power",
        value: formatNumber((data.solar?.reactivePower ?? 0) / 1000),
        unit: "kVar",
      },
      { label: "Energy today", value: formatNumber(data.solar?.energyTimeStamps), unit: "kWh" },
    ],
  };
}

function bessNodes(
  bessList: BessDto[],
  devices: DeviceResponseDto[]
): OperationNode[] {
  const count = Math.max(2, bessList.length, devices.length);
  return Array.from({ length: Math.min(count, 2) }, (_, index) => {
    const unit = bessList[index];
    const device = devices[index];
    const status = nodeStatus(unit?.status, device, !unit && !device);
    return {
      id: `bess-${index + 1}-card`,
      kind: "bess",
      visual: "card",
      group: "bess",
      label: device?.deviceName ?? `BESS N.0${index + 1}`,
      status,
      stateLabel: status === "offline" ? "Unavailable" : bessState(unit),
      metric: "bess",
      controlType: "bess",
      muted: status === "offline",
      deviceId: device?.id ?? unit?.deviceId,
      position: { x: 44, y: 356 + index * 140 },
      image: `${ASSET_BASE}/eBess.png`,
      telemetry: [
        {
          label: "Active power",
          value: formatNumber((unit?.batteryPower ?? unit?.totalActivePower ?? 0) / 1000),
          unit: "kW",
        },
        { label: "Battery percent", value: formatNumber(unit?.batteryLevel, 1), unit: "%" },
        { label: "Voltage", value: formatNumber(unit?.batteryVoltage, 1), unit: "V" },
      ],
    } satisfies OperationNode;
  });
}

function bessBreakerNodes(
  bessList: BessDto[],
  devices: DeviceResponseDto[]
): OperationNode[] {
  const count = Math.max(2, bessList.length, devices.length);
  return Array.from({ length: Math.min(count, 2) }, (_, index) => {
    const muted = !bessList[index] && !devices[index];
    return breakerNode(
      `bess-${index + 1}-mccb`,
      `BESS ${index + 1} MCCB`,
      356,
      362 + index * 140,
      "bess",
      "bess",
      devices[index]?.id ?? bessList[index]?.deviceId,
      muted
    );
  });
}

function chargerBreakerNodes(
  chargers: ChargerDto[],
  devices: DeviceResponseDto[]
): OperationNode[] {
  const count = Math.max(4, chargers.length, devices.length);
  return Array.from({ length: Math.min(count, 4) }, (_, index) =>
    breakerNode(
      `charger-${index + 1}-mccb`,
      `Charger ${index + 1} ${index === 3 ? "DC" : "AC"} MCCB`,
      716,
      106 + index * 150,
      "charger",
      undefined,
      devices[index]?.id ?? chargers[index]?.deviceId,
      !chargers[index] && !devices[index]
    )
  );
}

function chargerNodes(
  chargers: ChargerDto[],
  devices: DeviceResponseDto[]
): OperationNode[] {
  const count = Math.max(4, chargers.length, devices.length);
  return Array.from({ length: Math.min(count, 4) }, (_, index) => {
    const charger = chargers[index];
    const device = devices[index];
    const dc =
      /dc/i.test(charger?.deviceName ?? device?.deviceName ?? "") || index === 3;
    const available = chargerAvailable(charger, device);
    const status = available ? "online" : "offline";
    return {
      id: `charger-${index + 1}`,
      kind: "charger",
      visual: "card",
      group: "charger",
      label:
        charger?.deviceName ??
        device?.deviceName ??
        `Charger ${index + 1} ${dc ? "DC" : "AC"}`,
      status,
      stateLabel: charger?.chargeStatus ?? (available ? "Available" : "Unavailable"),
      metric: "charger",
      muted: status === "offline",
      deviceId: device?.id ?? charger?.deviceId,
      position: { x: 914, y: 72 + index * 150 },
      image: `${ASSET_BASE}/chargerModel/${dc ? "Kern-C230" : "AC006T222"}.png`,
      telemetry: [
        {
          label: "Active power",
          value: formatNumber((charger?.multimeter?.p ?? 0) / 1000),
          unit: "kW",
        },
        {
          label: "Reactive power",
          value: formatNumber((charger?.multimeter?.q ?? 0) / 1000),
          unit: "kVar",
        },
        { label: "Last active", value: formatDateTime(charger?.lastActiveAt) },
      ],
    } satisfies OperationNode;
  });
}

function breakerNode(
  id: string,
  label: string,
  x: number,
  y: number,
  group: OperationNode["group"],
  controlType?: OperationNode["controlType"],
  deviceId?: number,
  muted = false
): OperationNode {
  return {
    id,
    kind: "breaker",
    visual: "breaker",
    group,
    label,
    status: muted ? "offline" : "online",
    stateLabel: muted ? "OFF" : "ON",
    controlType,
    muted,
    deviceId,
    position: { x, y },
    image: `${ASSET_BASE}/eMccb.png`,
    telemetry: [
      { label: "Breaker", value: muted ? "OFF" : "ON" },
      { label: "Device id", value: deviceId ?? "N/A", muted: deviceId === undefined },
    ],
  };
}

function atsNode(id: string, label: string, x: number, y: number, deviceId?: number) {
  return {
    id,
    kind: "ats" as const,
    visual: "ats" as const,
    group: "bess" as const,
    label,
    status: "online" as const,
    stateLabel: "ON",
    controlType: "schedule" as const,
    deviceId,
    position: { x, y },
    telemetry: [
      { label: "Primary path", value: "Closed" },
      { label: "Schedule target", value: deviceId ?? "N/A", muted: deviceId === undefined },
    ],
  } satisfies OperationNode;
}

function powerRows(multimeter?: MultimeterDto): OperationTelemetryRow[] {
  return [
    {
      label: "Active power",
      value: formatNumber((multimeter?.p ?? 0) / 1000),
      unit: "kW",
    },
    {
      label: "Reactive power",
      value: formatNumber((multimeter?.q ?? 0) / 1000),
      unit: "kVar",
    },
    { label: "Voltage", value: formatNumber(multimeter?.ua, 1), unit: "V" },
  ];
}

function stationStatusLabel(
  station?: StationResponseDto,
  latest?: SignalLatestDto
): string {
  if (station?.status === 0) return "Offline";
  if (latest?.isStationHealthy === false) return "Warning";
  return "Normal";
}

function stationStatusTone(
  station?: StationResponseDto,
  latest?: SignalLatestDto
) {
  if (station?.status === 0) return "offline";
  if (latest?.isStationHealthy === false) return "warning";
  return "online";
}

function gridStatusLabel(data: EnergyDataResponseDto): string {
  return data.grid?.status === false ? "OFF" : "ON";
}

function plcStatusLabel(data: EnergyDataResponseDto): string {
  if (data.system?.plc?.communication === false) return "Disconnected";
  if (data.system?.plc?.status === false) return "Fault";
  return "Working";
}

function plcStatusTone(data: EnergyDataResponseDto) {
  if (data.system?.plc?.communication === false) return "offline";
  if (data.system?.plc?.status === false) return "warning";
  return "online";
}

function nodeStatus(
  signalStatus?: boolean,
  device?: DeviceResponseDto,
  missing = false
) {
  if (missing || signalStatus === false || device?.status === 0) return "offline";
  return "online";
}

function bessState(unit?: BessDto): string {
  if (!unit) return "Generating";
  if (unit.runningState === 0) return "Standby";
  if (unit.runningState === 1) return "Running";
  return "Generating";
}

function chargerAvailable(charger?: ChargerDto, device?: DeviceResponseDto): boolean {
  if (device?.status === 0) return false;
  if (!charger) return !!device;
  const state = charger.chargeStatus?.toLowerCase() ?? "";
  return !state.includes("unavailable") && charger.status !== false;
}

function firstDevice(
  devices: DeviceResponseDto[],
  type: EnumDeviceType
): DeviceResponseDto | undefined {
  return devices.find((device) => device.deviceType === type);
}

function formatNumber(value?: number, digits = 2): string {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? 0 : undefined,
  }).format(round(number, digits));
}

function formatDateTime(value?: string): string {
  if (!value) return "N/A";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}
