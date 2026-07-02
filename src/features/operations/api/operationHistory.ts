import { API_ENDPOINTS } from "@/constants/api";
import { webEnergyClient } from "@/features/data/webEnergyClient";
import { rangeToWindow } from "@/features/data/repository/webEnergyMappers";
import type {
  EnergyDataResponseDto,
  MultimeterDto,
  SignalHistoryDto,
  WeatherDto,
} from "@/features/data/types/webEnergy";
import type {
  OperationChartPoint,
  OperationChartSeries,
  OperationElectricalCharts,
  OperationHistoryData,
  OperationHistoryDomain,
  OperationWeatherChart,
  OperationWeatherChartField,
} from "../types";

const HISTORY_ENDPOINT: Record<OperationHistoryDomain, string> = {
  system: API_ENDPOINTS.webEnergy.signalHistorySystem,
  grid: API_ENDPOINTS.webEnergy.signalHistoryGrid,
  wind: API_ENDPOINTS.webEnergy.signalHistoryWind,
  solar: API_ENDPOINTS.webEnergy.signalHistorySolar,
  bess: API_ENDPOINTS.webEnergy.signalHistoryBess,
  charger: API_ENDPOINTS.webEnergy.signalHistoryCharger,
  weather: API_ENDPOINTS.webEnergy.signalHistoryWeather,
};

const DEVICE_SCOPED_DOMAINS = new Set<OperationHistoryDomain>([
  "bess",
  "charger",
]);

const POWER_SERIES: OperationChartSeries[] = [
  {
    key: "activePower",
    label: "Active Power",
    unit: "W",
    color: "#3b82f6",
    axis: "left",
    kind: "line",
  },
  {
    key: "reactivePower",
    label: "Reactive Power",
    unit: "Var",
    color: "#34d399",
    axis: "right",
    kind: "line",
  },
];

const ELECTRIC_SERIES: OperationChartSeries[] = [
  {
    key: "phaseACurrent",
    label: "Phase A current",
    unit: "A",
    color: "#2dd4bf",
    axis: "left",
    kind: "line",
  },
  {
    key: "phaseAVoltage",
    label: "Phase A voltage",
    unit: "V",
    color: "#4ade80",
    axis: "right",
    kind: "bar",
  },
  {
    key: "phaseBCurrent",
    label: "Phase B current",
    unit: "A",
    color: "#fbbf24",
    axis: "left",
    kind: "line",
  },
  {
    key: "phaseBVoltage",
    label: "Phase B voltage",
    unit: "V",
    color: "#fb7185",
    axis: "right",
    kind: "bar",
  },
  {
    key: "phaseCCurrent",
    label: "Phase C current",
    unit: "A",
    color: "#a78bfa",
    axis: "left",
    kind: "line",
  },
  {
    key: "phaseCVoltage",
    label: "Phase C voltage",
    unit: "V",
    color: "#60a5fa",
    axis: "right",
    kind: "bar",
  },
];

export const WEATHER_FIELDS: OperationWeatherChart["fields"] = {
  temperature: {
    label: "Air temperature",
    unit: "C",
    color: "#fb7185",
  },
  windSpeed: {
    label: "Wind speed",
    unit: "m/s",
    color: "#38bdf8",
  },
  ghi: {
    label: "GHI",
    unit: "W/m2",
    color: "#fbbf24",
  },
  poAI: {
    label: "PoAI",
    unit: "W/m2",
    color: "#34d399",
  },
  bomTemp1: {
    label: "BoMT",
    unit: "C",
    color: "#c084fc",
  },
};

interface FetchOperationHistoryInput {
  stationId: number;
  domain: OperationHistoryDomain;
  range: string;
  deviceId?: number;
}

export async function fetchOperationHistory({
  stationId,
  domain,
  range,
  deviceId,
}: FetchOperationHistoryInput): Promise<OperationHistoryData> {
  if (DEVICE_SCOPED_DOMAINS.has(domain) && deviceId === undefined) {
    return emptyHistory(domain);
  }

  const { start, end } = rangeToWindow(range);
  const params = new URLSearchParams({
    stationId: String(stationId),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isTakeSampling: "true",
  });
  if (DEVICE_SCOPED_DOMAINS.has(domain) && deviceId !== undefined) {
    params.set("deviceId", String(deviceId));
  }

  const res = await webEnergyClient.get<SignalHistoryDto>(
    `${HISTORY_ENDPOINT[domain]}?${params.toString()}`
  );
  return mapHistory(domain, res.list ?? [], deviceId);
}

export function buildMockOperationHistory(
  domain: OperationHistoryDomain,
  range: string
): OperationHistoryData {
  const points = generateMockPoints(domain, range);
  if (domain === "weather") {
    return {
      domain,
      weather: {
        domain,
        points,
        fields: WEATHER_FIELDS,
      },
    };
  }
  return {
    domain,
    electrical: buildElectricalCharts(
      domain,
      domain === "system" || domain === "wind",
      points
    ),
  };
}

function mapHistory(
  domain: OperationHistoryDomain,
  list: SignalHistoryDto[],
  deviceId?: number
): OperationHistoryData {
  const points = list
    .map((record) => {
      const data = (record.data ?? record) as EnergyDataResponseDto;
      const t = parseHistoryTime(record, data);
      if (!t) return null;
      if (domain === "weather") {
        return weatherPoint(t, data.weather);
      }
      return electricalPoint(t, readMultimeter(domain, data, deviceId));
    })
    .filter((point): point is OperationChartPoint => point !== null)
    .sort((a, b) => a.t - b.t);

  if (domain === "weather") {
    return {
      domain,
      weather: {
        domain,
        points,
        fields: WEATHER_FIELDS,
      },
    };
  }

  return {
    domain,
    electrical: buildElectricalCharts(
      domain,
      domain === "system" || domain === "wind",
      points
    ),
  };
}

function emptyHistory(domain: OperationHistoryDomain): OperationHistoryData {
  if (domain === "weather") {
    return {
      domain,
      weather: {
        domain,
        points: [],
        fields: WEATHER_FIELDS,
      },
    };
  }
  return {
    domain,
    electrical: buildElectricalCharts(
      domain,
      domain === "system" || domain === "wind",
      []
    ),
  };
}

function buildElectricalCharts(
  domain: Exclude<OperationHistoryDomain, "weather">,
  phaseAOnly: boolean,
  points: OperationChartPoint[]
): OperationElectricalCharts {
  return {
    domain,
    phaseAOnly,
    power: {
      title: "Power chart",
      leftLabel: "Active power (W)",
      rightLabel: "Reactive power (Var)",
      points,
      series: POWER_SERIES,
    },
    electric: {
      title: "Electric chart",
      leftLabel: "Current (A)",
      rightLabel: "Voltage (V)",
      rightDomain: [150, 250],
      points,
      series: phaseAOnly ? ELECTRIC_SERIES.slice(0, 2) : ELECTRIC_SERIES,
    },
  };
}

function electricalPoint(
  t: number,
  multimeter?: MultimeterDto
): OperationChartPoint {
  return {
    t,
    activePower: numberOrZero(multimeter?.p),
    reactivePower: numberOrZero(multimeter?.q),
    phaseACurrent: numberOrZero(multimeter?.ia),
    phaseAVoltage: numberOrZero(multimeter?.ua),
    phaseBCurrent: numberOrZero(multimeter?.ib),
    phaseBVoltage: numberOrZero(multimeter?.ub),
    phaseCCurrent: numberOrZero(multimeter?.ic),
    phaseCVoltage: numberOrZero(multimeter?.uc),
  };
}

function weatherPoint(t: number, weather?: WeatherDto): OperationChartPoint {
  return {
    t,
    temperature: numberOrZero(weather?.temperature) / 10,
    windSpeed: numberOrZero(weather?.windSpeed),
    ghi: numberOrZero(weather?.ghi),
    poAI: numberOrZero(weather?.poAI),
    bomTemp1: numberOrZero(weather?.bomTemp1) / 10,
  };
}

function readMultimeter(
  domain: Exclude<OperationHistoryDomain, "weather">,
  data: EnergyDataResponseDto,
  deviceId?: number
): MultimeterDto | undefined {
  if (domain === "system") return data.system?.multimeter;
  if (domain === "grid") return data.grid?.multimeter;
  if (domain === "wind") return data.wind?.multimeter;
  if (domain === "solar") return data.solar?.multimeter;
  if (domain === "bess") {
    const list = data.bess ?? [];
    return (
      list.find((item) => item.deviceId === deviceId)?.multimeter ??
      list[0]?.multimeter
    );
  }
  const list = data.charger ?? [];
  return (
    list.find((item) => item.deviceId === deviceId)?.multimeter ??
    list[0]?.multimeter
  );
}

function parseHistoryTime(
  record: SignalHistoryDto,
  data: EnergyDataResponseDto
): number {
  const raw = record.time ?? data.latestTime ?? data.latestOnline;
  const parsed = raw ? Date.parse(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function generateMockPoints(
  domain: OperationHistoryDomain,
  range: string
): OperationChartPoint[] {
  const hours = range === "1h" ? 1 : range === "5h" ? 5 : range === "7d" ? 168 : 24;
  const count = range === "7d" ? 42 : Math.max(12, Math.min(36, hours * 6));
  const end = Date.now();
  const start = end - hours * 3_600_000;

  return Array.from({ length: count }, (_, index) => {
    const ratio = count <= 1 ? 0 : index / (count - 1);
    const t = Math.round(start + (end - start) * ratio);
    if (domain === "weather") return mockWeatherPoint(t, ratio);
    return mockElectricalPoint(domain, t, ratio);
  });
}

function mockElectricalPoint(
  domain: Exclude<OperationHistoryDomain, "weather">,
  t: number,
  ratio: number
): OperationChartPoint {
  const seed = {
    system: 12,
    grid: 9,
    wind: 4,
    solar: 7,
    bess: 5,
    charger: 2,
  }[domain];
  const wave = Math.sin(ratio * Math.PI * 2);
  const secondary = Math.cos(ratio * Math.PI * 3);
  return {
    t,
    activePower: roundChart(seed + wave * seed * 0.25 + secondary * 0.8),
    reactivePower: roundChart(seed * 0.16 - wave * 1.4),
    phaseACurrent: roundChart(12 + seed * 0.6 + wave * 3),
    phaseAVoltage: roundChart(225 + secondary * 6),
    phaseBCurrent: roundChart(11 + seed * 0.55 + Math.sin(ratio * Math.PI * 2.2) * 2.6),
    phaseBVoltage: roundChart(226 + Math.cos(ratio * Math.PI * 2.1) * 5),
    phaseCCurrent: roundChart(10 + seed * 0.5 + Math.sin(ratio * Math.PI * 1.9) * 2.2),
    phaseCVoltage: roundChart(224 + Math.cos(ratio * Math.PI * 2.5) * 4),
  };
}

function mockWeatherPoint(t: number, ratio: number): OperationChartPoint {
  const wave = Math.sin(ratio * Math.PI * 2);
  return {
    t,
    temperature: roundChart(29 + wave * 3),
    windSpeed: roundChart(3.5 + Math.cos(ratio * Math.PI * 3) * 1.2),
    ghi: roundChart(Math.max(0, 780 * Math.sin(ratio * Math.PI))),
    poAI: roundChart(Math.max(0, 690 * Math.sin(ratio * Math.PI))),
    bomTemp1: roundChart(32 + wave * 4),
  };
}

function numberOrZero(value?: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundChart(value: number): number {
  return Math.round(value * 100) / 100;
}

export const DEFAULT_WEATHER_FIELD: OperationWeatherChartField = "temperature";
