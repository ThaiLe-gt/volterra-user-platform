import type { Metric } from "@/features/data/repository/webEnergyMappers";
import type { AssetStatus } from "@/features/data/types/domain";

export type OperationControlType = "grid" | "solar" | "bess" | "schedule";

export type OperationNodeKind =
  | "grid"
  | "solar"
  | "bess"
  | "charger"
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
  group: Metric | "grid" | "aux";
  label: string;
  status: AssetStatus;
  stateLabel: string;
  telemetry: OperationTelemetryRow[];
  position: { x: number; y: number };
  image?: string;
  controlType?: OperationControlType;
  deviceId?: number;
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
