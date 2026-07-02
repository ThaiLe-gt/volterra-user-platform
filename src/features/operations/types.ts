import type { Metric } from "@/features/data/repository/webEnergyMappers";
import type { AssetStatus } from "@/features/data/types/domain";

export type OperationControlType = "grid" | "solar" | "bess" | "schedule";

export type OperationHistoryDomain =
  | "system"
  | "grid"
  | "wind"
  | "solar"
  | "bess"
  | "charger"
  | "weather";

export type OperationWeatherChartField =
  | "temperature"
  | "windSpeed"
  | "ghi"
  | "poAI"
  | "bomTemp1";

export type OperationChartAxis = "left" | "right";

export type OperationChartSeriesKind = "line" | "bar";

export interface OperationChartPoint {
  t: number;
  [key: string]: number;
}

export interface OperationChartSeries {
  key: string;
  label: string;
  unit: string;
  color: string;
  axis: OperationChartAxis;
  kind: OperationChartSeriesKind;
}

export interface OperationSeriesChart {
  title: string;
  leftLabel: string;
  rightLabel?: string;
  rightDomain?: [number, number];
  points: OperationChartPoint[];
  series: OperationChartSeries[];
}

export interface OperationElectricalCharts {
  domain: Exclude<OperationHistoryDomain, "weather">;
  phaseAOnly: boolean;
  power: OperationSeriesChart;
  electric: OperationSeriesChart;
}

export interface OperationWeatherChart {
  domain: "weather";
  points: OperationChartPoint[];
  fields: Record<
    OperationWeatherChartField,
    {
      label: string;
      unit: string;
      color: string;
    }
  >;
}

export interface OperationHistoryData {
  domain: OperationHistoryDomain;
  electrical?: OperationElectricalCharts;
  weather?: OperationWeatherChart;
}

export type OperationNodeKind =
  | "system"
  | "grid"
  | "wind"
  | "solar"
  | "bess"
  | "charger"
  | "weather"
  | "breaker"
  | "ats"
  | "load"
  | "plc";

export type OperationNodeVisual = "card" | "breaker" | "device" | "ats" | "pill";

export interface OperationTelemetryRow {
  label: string;
  value: string | number;
  unit?: string;
  muted?: boolean;
}

export interface OperationNode {
  id: string;
  kind: OperationNodeKind;
  visual: OperationNodeVisual;
  group: Metric | "grid" | "wind" | "weather" | "aux";
  label: string;
  status: AssetStatus;
  stateLabel: string;
  telemetry: OperationTelemetryRow[];
  position: { x: number; y: number };
  image?: string;
  controlType?: OperationControlType;
  deviceId?: number;
  historyDomain?: OperationHistoryDomain;
  metric?: Metric;
  muted?: boolean;
}

export interface OperationStationOption {
  id: string;
  apiId: number;
  name: string;
  code?: string;
}

export interface OperationStatusStrip {
  station: string;
  stationTone: AssetStatus;
  grid: string;
  gridTone: AssetStatus;
  plc: string;
  plcTone: AssetStatus;
  timestamp: string;
}

export interface OperationKpi {
  label: string;
  value: string | number;
  unit?: string;
}

export interface OperationSnapshot {
  station: OperationStationOption;
  status: OperationStatusStrip;
  kpis: OperationKpi[];
  nodes: OperationNode[];
  selectedStationId: string;
  latestTimestamp?: string;
  readOnly: boolean;
}
