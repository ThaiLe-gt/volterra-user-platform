"use client";

import { useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Cpu,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusDot } from "@/components/common/StatusDot";
import type { BimNode } from "@/features/data/types/domain";
import { useBimTree } from "../hooks/useTwinData";
import { useTwinStore } from "../store/twinStore";

interface BimStructureTreeProps {
  siteId: string;
}

export function BimStructureTree({ siteId }: BimStructureTreeProps) {
  const { data: tree } = useBimTree(siteId);

  return (
    <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
      {tree ? (
        <TreeNode node={tree} depth={0} defaultOpen />
      ) : (
        <p className="px-2 py-4 text-xs text-muted-foreground">Loading…</p>
      )}
    </ScrollArea>
  );
}

function NodeIcon({
  kind,
  className,
}: {
  kind: BimNode["kind"];
  className?: string;
}) {
  if (kind === "floor") return <Layers className={className} />;
  if (kind === "asset") return <Cpu className={className} />;
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
    selectedAssetId,
    selectedTarget,
    setSelectedAssetId,
    setSelectedTarget,
  } = useTwinStore();
  const hasChildren = !!node.children?.length;
  const isAsset = node.kind === "asset";
  const isSite = node.kind === "site";
  const focused =
    (isAsset &&
      !!node.assetId &&
      selectedTarget?.kind === "asset" &&
      selectedTarget.id === node.assetId) ||
    (isSite &&
      selectedTarget?.kind === "site" &&
      selectedTarget.id === node.id);
  const showingDetails = isAsset && node.assetId === selectedAssetId;
  const selected = focused || showingDetails;

  const focusNode = () => {
    if (isSite) {
      setSelectedTarget({ kind: "site", id: node.id });
    } else if (isAsset && node.assetId) {
      setSelectedTarget({ kind: "asset", id: node.assetId });
    }
  };

  const selectLabel = () => {
    if (isAsset && node.assetId) {
      setSelectedAssetId(node.assetId);
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
          <NodeIcon kind={node.kind} className="size-3.5" />
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
