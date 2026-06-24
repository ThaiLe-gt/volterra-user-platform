"use client";

import Image from "next/image";
import { Zap } from "lucide-react";
import { StatusDot } from "@/components/common/StatusDot";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OperationNode, OperationSnapshot } from "../types";

interface OperationDiagramProps {
  snapshot: OperationSnapshot;
  selectedNodeId: string | null;
  focusGroup?: OperationNode["group"] | null;
  onSelect: (nodeId: string) => void;
}

/** Energized conductors — rendered solid, then overlaid with an animated pulse. */
const FLOW_PATHS = [
  "M274 134 H348",
  "M430 134 H454 L470 150 V620",
  "M274 274 H348",
  "M430 274 H454 L470 292",
  "M274 414 H348",
  "M430 414 H454 L470 432",
  "M274 554 H348",
  "M430 554 H454 L470 572",
  "M430 668 H650 V660",
  "M470 306 H516",
  "M585 306 H650",
  "M470 520 H516",
  "M585 520 H650",
  "M650 78 V640",
  "M650 150 H710",
  "M808 150 H902",
  "M650 300 H710",
  "M808 300 H902",
  "M650 450 H710",
  "M808 450 H902",
  "M650 600 H710",
  "M808 600 H902",
] as const;

export function OperationDiagram({
  snapshot,
  selectedNodeId,
  focusGroup,
  onSelect,
}: OperationDiagramProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 shadow-2xl shadow-black/30 backdrop-blur-sm">
      <div className="flex items-center justify-center border-b border-border px-4 py-2">
        <div className="inline-flex rounded-lg border border-primary/30 bg-primary px-16 py-2 text-primary-foreground shadow-[0_0_18px_rgba(47,128,237,0.4)]">
          <Zap className="size-5" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative h-[720px] min-w-[1180px] overflow-hidden">
          <svg
            viewBox="0 0 1180 720"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <filter id="operation-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Energized conductors (solid base) */}
            <g
              fill="none"
              stroke="#ff424d"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              opacity="0.55"
              filter="url(#operation-line-glow)"
            >
              {FLOW_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>

            {/* Animated flow pulse travelling along the conductors */}
            <g
              className="operation-flow"
              fill="none"
              stroke="#ffe2e4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              filter="url(#operation-line-glow)"
            >
              {FLOW_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>

            {/* Neutral / de-energized conductor */}
            <g fill="none" stroke="#56657a" strokeLinecap="round" strokeWidth="2.5">
              <path d="M285 668 H348" />
            </g>

            <g fill="none" stroke="#4f5d70" strokeWidth="2">
              <path d="M454 76 V620" opacity="0.35" />
              <path d="M650 76 V640" opacity="0.35" />
            </g>
          </svg>

          <div className="absolute left-[454px] top-[72px] h-[555px] w-1 bg-[#ff424d] shadow-[0_0_16px_rgba(255,66,77,0.45)]" />
          <div className="absolute left-[648px] top-[72px] h-[570px] w-1 bg-[#ff424d] shadow-[0_0_16px_rgba(255,66,77,0.45)]" />

          {snapshot.nodes.map((node) => (
            <OperationNodeButton
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              dimmed={!!focusGroup && node.group !== focusGroup && node.group !== "aux"}
              onSelect={() => onSelect(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OperationNodeButton({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: OperationNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const common = cn(
    "absolute isolate text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-primary/40",
    selected && "z-20 scale-[1.02]",
    dimmed && "opacity-40"
  );

  if (node.visual === "breaker") {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          common,
          "flex h-[84px] w-[98px] flex-col items-center justify-center rounded-xl border bg-secondary px-2 text-center shadow-lg",
          selected ? "border-primary ring-1 ring-primary/40" : "border-border",
          node.muted && "grayscale"
        )}
        style={{ left: node.position.x, top: node.position.y }}
      >
        {node.image && (
          <Image
            src={node.image}
            alt=""
            width={48}
            height={48}
            className="mb-1 h-10 w-10 rounded-md bg-white object-contain p-1"
          />
        )}
        <span className="line-clamp-2 text-xs font-semibold text-foreground">
          {node.label}
        </span>
        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <StatusDot status={node.status} /> {node.stateLabel}
        </span>
      </button>
    );
  }

  if (node.visual === "ats") {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          common,
          "flex h-[122px] w-[72px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-secondary/80 text-center shadow-lg",
          selected ? "border-primary ring-1 ring-primary/40" : "border-border"
        )}
        style={{ left: node.position.x, top: node.position.y }}
      >
        <span className="text-xs font-semibold text-foreground">{node.label}</span>
        <span className="size-3 rounded-full bg-[#ff424d]" />
        <span className="size-3 rounded-full bg-muted-foreground" />
      </button>
    );
  }

  if (node.visual === "pill") {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          common,
          "h-10 w-[146px] rounded-xl border bg-secondary px-4 text-center text-xs font-semibold text-foreground shadow-lg",
          selected ? "border-primary ring-1 ring-primary/40" : "border-border"
        )}
        style={{ left: node.position.x, top: node.position.y }}
      >
        {node.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        common,
        "h-[112px] w-[238px] rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-sm",
        selected ? "border-primary ring-1 ring-primary/40" : "border-border",
        node.muted && "opacity-55"
      )}
      style={{ left: node.position.x, top: node.position.y }}
    >
      <div className="flex items-start gap-3">
        {node.image && (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
            <Image
              src={node.image}
              alt=""
              width={72}
              height={72}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <span className="truncate text-base font-semibold text-foreground">
              {node.label}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 border-transparent px-1.5 py-0 text-[11px]",
                node.status === "online" && "bg-emerald-400/10 text-emerald-300",
                node.status === "warning" && "bg-amber-400/10 text-amber-300",
                node.status === "offline" && "bg-red-400/10 text-red-300"
              )}
            >
              <StatusDot status={node.status} />
              <span className="ml-1">{node.stateLabel}</span>
            </Badge>
          </div>
          <dl className="mt-2 space-y-1">
            {node.telemetry.slice(0, 3).map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <dt className="truncate text-xs font-medium text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="shrink-0 text-xs font-semibold text-foreground">
                  {row.value}
                  {row.unit ? ` ${row.unit}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </button>
  );
}
