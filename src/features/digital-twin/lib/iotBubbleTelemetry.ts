import type { IotBubbleConfig } from "@/features/data/config/vinuniSiteConfig";
import type { AssetStatus } from "@/features/data/types/domain";
import type {
  OperationNode,
  OperationSnapshot,
  OperationTelemetryRow,
} from "@/features/operations/types";

export interface IotBubbleTelemetry {
  title: string;
  status: AssetStatus;
  statusLabel: string;
  mainLabel: string;
  mainValue: string | number;
  mainUnit?: string;
  rows: OperationTelemetryRow[];
  updatedAt?: string;
}

export function buildBubbleTelemetryMap(
  bubbles: IotBubbleConfig[],
  snapshots: OperationSnapshot[]
): Record<string, IotBubbleTelemetry> {
  const byStation = new Map(
    snapshots.map((snapshot) => [snapshot.station.id, snapshot])
  );

  return bubbles.reduce<Record<string, IotBubbleTelemetry>>((acc, bubble) => {
    const snapshot = byStation.get(resolveBubbleStationId(bubble));
    if (!snapshot) return acc;

    const telemetry =
      bubble.kind?.toLowerCase() === "station"
        ? stationTelemetry(bubble, snapshot)
        : nodeTelemetry(bubble, snapshot);
    if (telemetry) acc[bubble.id] = telemetry;
    return acc;
  }, {});
}

function resolveBubbleStationId(bubble: IotBubbleConfig): string {
  if (
    bubble.anchor.relativeTo &&
    bubble.anchor.relativeTo !== "site"
  ) {
    return bubble.anchor.relativeTo;
  }
  return bubble.assetId;
}

function stationTelemetry(
  bubble: IotBubbleConfig,
  snapshot: OperationSnapshot
): IotBubbleTelemetry {
  const main =
    snapshot.kpis.find((item) => item.label === "Total Power") ??
    snapshot.kpis[0] ?? { label: "Status", value: snapshot.status.station };
  return {
    title: bubble.label,
    status: snapshot.status.stationTone,
    statusLabel: snapshot.status.station,
    mainLabel: main.label,
    mainValue: main.value,
    mainUnit: main.unit,
    rows: snapshot.kpis
      .filter((item) => item.label !== main.label)
      .slice(0, 3)
      .map((item) => ({
        label: item.label,
        value: item.value,
        unit: item.unit,
      })),
    updatedAt: snapshot.latestTimestamp,
  };
}

function nodeTelemetry(
  bubble: IotBubbleConfig,
  snapshot: OperationSnapshot
): IotBubbleTelemetry | null {
  const node = findMatchingNode(bubble, snapshot.nodes);
  if (!node) return stationTelemetry(bubble, snapshot);

  const rows = node.telemetry.filter((row) => !row.muted);
  const main = rows[0] ?? { label: "Status", value: node.stateLabel };
  return {
    title: node.label || bubble.label,
    status: node.status,
    statusLabel: node.stateLabel,
    mainLabel: main.label,
    mainValue: main.value,
    mainUnit: main.unit,
    rows: rows.slice(1, 4),
    updatedAt: snapshot.latestTimestamp,
  };
}

function findMatchingNode(
  bubble: IotBubbleConfig,
  nodes: OperationNode[]
): OperationNode | undefined {
  const kind = bubble.kind?.toLowerCase();
  if (bubble.operationNodeId) {
    const exact = nodes.find((node) => node.id === bubble.operationNodeId);
    if (exact) return exact;
  }

  if (bubble.deviceId !== undefined) {
    const exactDevice = nodes.find(
      (node) =>
        node.deviceId === bubble.deviceId &&
        (!kind || node.kind.toLowerCase() === kind || node.group.toLowerCase() === kind)
    );
    if (exactDevice) return exactDevice;
  }

  if (!kind) return undefined;

  const candidates = nodes.filter((node) => {
    const nodeKind = node.kind.toLowerCase();
    const group = node.group.toLowerCase();
    return nodeKind === kind || group === kind;
  });

  return (
    candidates.find((node) => node.visual === "card" && !node.muted) ??
    candidates.find((node) => !node.muted) ??
    candidates[0]
  );
}
