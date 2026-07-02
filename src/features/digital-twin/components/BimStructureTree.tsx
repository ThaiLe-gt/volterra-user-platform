"use client";

import { useMemo, useState } from "react";
import {
  BatteryCharging,
  Box,
  ChevronDown,
  ChevronRight,
  Cpu,
  Layers,
  PlugZap,
  RadioTower,
  Sun,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusDot } from "@/components/common/StatusDot";
import type { AssetStatus, BimNode } from "@/features/data/types/domain";
import { useOperationSnapshots } from "@/features/operations/hooks/useOperationData";
import type {
  OperationNode,
  OperationSnapshot,
} from "@/features/operations/types";
import { useBimTree } from "../hooks/useTwinData";
import { useTwinStore } from "../store/twinStore";

interface BimStructureTreeProps {
  siteId: string;
}

export function BimStructureTree({ siteId }: BimStructureTreeProps) {
  const { data: tree } = useBimTree(siteId);
  const stationIds = useMemo(() => (tree ? collectStationIds(tree) : []), [tree]);
  const operationSnapshotResults = useOperationSnapshots(stationIds);
  const operationSnapshots = useMemo(
    () =>
      operationSnapshotResults.flatMap((result) =>
        result.data ? [result.data] : []
      ),
    [operationSnapshotResults]
  );
  const liveTree = useMemo(
    () => (tree ? applyLiveStatuses(tree, operationSnapshots) : null),
    [operationSnapshots, tree]
  );

  return (
    <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
      {liveTree ? (
        <TreeNode node={liveTree} depth={0} defaultOpen />
      ) : (
        <p className="px-2 py-4 text-xs text-muted-foreground">Loading…</p>
      )}
    </ScrollArea>
  );
}

function collectStationIds(tree: BimNode): string[] {
  const ids = new Set<string>();
  const visit = (node: BimNode) => {
    if (node.kind === "asset" && node.assetId && node.children?.length) {
      ids.add(node.assetId);
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  return [...ids];
}

function applyLiveStatuses(
  node: BimNode,
  snapshots: OperationSnapshot[]
): BimNode {
  const snapshotsByStation = new Map(
    snapshots.map((snapshot) => [snapshot.station.id, snapshot])
  );

  const visit = (item: BimNode): BimNode => {
    const children = item.children?.map(visit);
    const liveStatus = resolveLiveStatus(item, snapshotsByStation);
    const childStatus =
      children &&
      ["site", "group", "system"].includes(item.kind)
        ? aggregateStatus(children)
        : undefined;

    return {
      ...item,
      ...(children ? { children } : {}),
      status: liveStatus ?? childStatus ?? item.status,
    };
  };

  return visit(node);
}

function resolveLiveStatus(
  node: BimNode,
  snapshotsByStation: Map<string, OperationSnapshot>
): AssetStatus | undefined {
  const stationId = node.assetId ?? node.id;
  const snapshot = snapshotsByStation.get(stationId);
  if (!snapshot) return undefined;

  if (node.kind === "asset" && node.assetId && node.children?.length) {
    return snapshot.status.stationTone;
  }

  if (!node.bubbleId) return undefined;
  if (node.bubbleKind?.toLowerCase() === "station") {
    return snapshot.status.stationTone;
  }

  return findMatchingOperationNode(node, snapshot.nodes)?.status;
}

function findMatchingOperationNode(
  node: BimNode,
  nodes: OperationNode[]
): OperationNode | undefined {
  if (node.operationNodeId) {
    const exact = nodes.find((item) => item.id === node.operationNodeId);
    if (exact) return exact;
  }

  const kind = node.bubbleKind?.toLowerCase();
  if (node.deviceId !== undefined) {
    const exactDevice = nodes.find(
      (item) =>
        item.deviceId === node.deviceId &&
        (!kind ||
          item.kind.toLowerCase() === kind ||
          item.group.toLowerCase() === kind)
    );
    if (exactDevice) return exactDevice;
  }

  const embeddedId = nodes.find((item) => node.bubbleId?.endsWith(`-${item.id}`));
  if (embeddedId) return embeddedId;
  if (!kind) return undefined;

  const candidates = nodes.filter((item) => {
    const nodeKind = item.kind.toLowerCase();
    const group = item.group.toLowerCase();
    return nodeKind === kind || group === kind;
  });

  return (
    candidates.find((item) => item.visual === "card" && !item.muted) ??
    candidates.find((item) => !item.muted) ??
    candidates[0]
  );
}

function aggregateStatus(nodes: BimNode[]): AssetStatus | undefined {
  const statuses = nodes.flatMap((node) => (node.status ? [node.status] : []));
  if (!statuses.length) return undefined;
  if (statuses.every((status) => status === "online")) return "online";
  if (statuses.every((status) => status === "offline")) return "offline";
  return "warning";
}

function NodeIcon({ node, className }: { node: BimNode; className?: string }) {
  const bubbleKind = node.bubbleKind?.toLowerCase();
  if (bubbleKind === "solar") return <Sun className={className} />;
  if (bubbleKind === "bess") return <BatteryCharging className={className} />;
  if (bubbleKind === "charger") return <PlugZap className={className} />;
  if (bubbleKind === "grid") return <Zap className={className} />;
  if (node.bubbleId) return <RadioTower className={className} />;
  if (node.kind === "floor") return <Layers className={className} />;
  if (node.kind === "asset") return <Cpu className={className} />;
  return <Box className={className} />;
}

function TreeNode({
  node,
  depth,
  defaultOpen = false,
}: {
  node: BimNode;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const {
    detailTarget,
    selectedTarget,
    setDetailTarget,
    setSelectedAssetId,
    setSelectedTarget,
  } = useTwinStore();
  const hasChildren = !!node.children?.length;
  const isAsset = node.kind === "asset";
  const isSite = node.kind === "site";
  const isBubble = isAsset && !!node.assetId && !!node.bubbleId;
  const focused =
    (isBubble &&
      selectedTarget?.kind === "bubble" &&
      selectedTarget.id === node.bubbleId) ||
    (!isBubble &&
      isAsset &&
      !!node.assetId &&
      selectedTarget?.kind === "asset" &&
      selectedTarget.id === node.assetId) ||
    (isSite &&
      selectedTarget?.kind === "site" &&
      selectedTarget.id === node.id);
  const showingDetails =
    !isBubble && isAsset && node.assetId === detailTarget?.assetId;
  const selected = focused || showingDetails;

  const focusNode = () => {
    if (isSite) {
      setSelectedTarget({ kind: "site", id: node.id });
    } else if (isBubble) {
      setSelectedAssetId(node.assetId!);
      setSelectedTarget({
        kind: "bubble",
        id: node.bubbleId!,
        assetId: node.assetId!,
      });
    } else if (isAsset && node.assetId) {
      setSelectedTarget({ kind: "asset", id: node.assetId });
    }
  };

  const selectLabel = () => {
    if (isBubble) {
      setSelectedAssetId(node.assetId!);
      setSelectedTarget({
        kind: "bubble",
        id: node.bubbleId!,
        assetId: node.assetId!,
      });
    } else if (isAsset && node.assetId) {
      setSelectedAssetId(node.assetId);
      setSelectedTarget({ kind: "asset", id: node.assetId });
      setDetailTarget({ assetId: node.assetId });
    } else if (hasChildren) {
      setOpen((o) => !o);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm transition-colors hover:bg-accent",
          selected && "bg-accent",
          focused && "text-primary"
        )}
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`${open ? "Collapse" : "Expand"} ${node.label}`}
          >
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <button
          type="button"
          onClick={focusNode}
          disabled={!isSite && !isAsset}
          className={cn(
            "flex size-3.5 shrink-0 items-center justify-center transition-colors",
            focused ? "text-primary" : "text-muted-foreground",
            (isSite || isAsset) && "hover:text-primary",
            !isSite && !isAsset && "cursor-default"
          )}
          aria-label={`Focus ${node.label}`}
        >
          <NodeIcon node={node} className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={selectLabel}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-foreground transition-colors hover:text-primary",
            showingDetails && "text-primary"
          )}
        >
          {node.label}
        </button>
        {node.status && <StatusDot status={node.status} className="ml-auto" />}
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
