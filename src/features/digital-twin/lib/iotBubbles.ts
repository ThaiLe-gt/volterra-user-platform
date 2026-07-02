import type { IotBubbleConfig } from "@/features/data/config/vinuniSiteConfig";
import { getConfigIotBubbles } from "@/features/bim-viewer/lib/iotBubbleProjection";
import type { BimConfig } from "@/features/bim-viewer";
import type { OperationNode, OperationSnapshot } from "@/features/operations/types";

const LIVE_BUBBLE_KINDS = new Set([
  "grid",
  "solar",
  "bess",
  "charger",
  "wind",
  "weather",
]);

export function buildLiveIotBubbles(
  config: BimConfig,
  snapshots: OperationSnapshot[]
): IotBubbleConfig[] {
  const configuredBubbles = getConfigIotBubbles(config);
  if (!snapshots.length) return configuredBubbles;

  const snapshotsByStation = new Map(
    snapshots.map((snapshot) => [snapshot.station.id, snapshot])
  );
  const siteBubbles = config.site.iotBubbles ?? [];
  const stationBubbles = config.stations.flatMap((station) => {
    const slots = station.iotBubbles ?? [];
    const snapshot = snapshotsByStation.get(station.id);
    if (!snapshot) return slots;

    return bindStationBubbles(station.id, slots, snapshot);
  });

  const bubbles = [...siteBubbles, ...stationBubbles];
  return bubbles.length ? bubbles : configuredBubbles;
}

function bindStationBubbles(
  stationId: string,
  slots: IotBubbleConfig[],
  snapshot: OperationSnapshot
): IotBubbleConfig[] {
  const usedSlotIds = new Set<string>();
  const output: IotBubbleConfig[] = [];
  const groupedNodes = groupRealDeviceNodes(snapshot.nodes);

  for (const [kind, nodes] of groupedNodes) {
    const configuredSlot = findSlotForKind(slots, kind);
    const slot = configuredSlot ?? createFallbackSlot(stationId, kind);
    if (configuredSlot) usedSlotIds.add(configuredSlot.id);

    nodes.forEach((node, index) => {
      output.push(bindNodeToSlot(stationId, slot, node, index, nodes.length));
    });
  }

  for (const slot of slots) {
    if (usedSlotIds.has(slot.id)) continue;
    output.push(slot);
  }

  return output;
}

function groupRealDeviceNodes(
  nodes: OperationNode[]
): Map<string, OperationNode[]> {
  const grouped = new Map<string, OperationNode[]>();

  for (const node of nodes) {
    const kind = node.kind.toLowerCase();
    if (!LIVE_BUBBLE_KINDS.has(kind)) continue;
    if (node.muted || node.deviceId === undefined) continue;

    const items = grouped.get(kind) ?? [];
    items.push(node);
    grouped.set(kind, items);
  }

  return grouped;
}

function findSlotForKind(
  slots: IotBubbleConfig[],
  kind: string
): IotBubbleConfig | undefined {
  return (
    slots.find((slot) => slot.kind?.toLowerCase() === kind) ??
    slots.find((slot) => slot.label.toLowerCase().includes(kind))
  );
}

function createFallbackSlot(stationId: string, kind: string): IotBubbleConfig {
  return {
    id: `${stationId}-${kind}`,
    assetId: stationId,
    label: fallbackLabel(kind),
    kind,
    status: "online",
    anchor: {
      relativeTo: stationId,
      position: fallbackPosition(kind),
    },
  };
}

function fallbackLabel(kind: string): string {
  if (kind === "solar") return "PV Solar";
  if (kind === "bess") return "BESS";
  if (kind === "charger") return "EV Charger";
  if (kind === "wind") return "Wind Turbine";
  if (kind === "weather") return "Weather";
  if (kind === "grid") return "Grid";
  return kind;
}

function fallbackPosition(kind: string): IotBubbleConfig["anchor"]["position"] {
  const positions: Record<string, IotBubbleConfig["anchor"]["position"]> = {
    grid: { x: -18, y: -10, z: 32 },
    solar: { x: -9, y: 12, z: 34 },
    bess: { x: 8, y: -7, z: 31 },
    charger: { x: 20, y: 10, z: 30 },
    wind: { x: -22, y: 20, z: 34 },
    weather: { x: 0, y: 24, z: 36 },
  };

  return positions[kind] ?? { x: 0, y: 0, z: 32 };
}

function bindNodeToSlot(
  stationId: string,
  slot: IotBubbleConfig,
  node: OperationNode,
  index: number,
  count: number
): IotBubbleConfig {
  const id = index === 0 ? slot.id : `${slot.id}-${node.id}`;

  return {
    ...slot,
    id,
    assetId: stationId,
    label: node.label,
    kind: node.kind,
    status: node.status,
    operationNodeId: node.id,
    deviceId: node.deviceId,
    anchor: {
      ...slot.anchor,
      relativeTo: stationId,
      position: offsetBubblePosition(slot.anchor.position, index, count),
    },
  };
}

function offsetBubblePosition(
  position: IotBubbleConfig["anchor"]["position"],
  index: number,
  count: number
): IotBubbleConfig["anchor"]["position"] {
  if (count <= 1) return position;

  const spread = 7;
  const centered = index - (count - 1) / 2;
  const row = index % 2 === 0 ? -1 : 1;

  return {
    ...position,
    x: (position.x ?? 0) + centered * spread,
    y: (position.y ?? 0) + row * Math.min(4, spread / 2),
  };
}
