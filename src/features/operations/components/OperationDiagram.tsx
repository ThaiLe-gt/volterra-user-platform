"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Lock,
  LockOpen,
  Maximize,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { StatusDot } from "@/components/common/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { OperationNode, OperationSnapshot } from "../types";

interface OperationDiagramProps {
  snapshot: OperationSnapshot;
  selectedNodeId: string | null;
  focusGroups?: OperationNode["group"][] | null;
  mode: string;
  modeOptions: Array<{ value: string; label: string }>;
  onModeChange: (mode: string) => void;
  stationId: string | null;
  stationOptions: Array<{ id: string; name: string }>;
  onStationChange: (stationId: string) => void;
  canUnlockControls: boolean;
  controlsUnlocked: boolean;
  onControlsUnlockedChange: (unlocked: boolean) => void;
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

const DIAGRAM_WIDTH = 1180;
const DIAGRAM_HEIGHT = 720;
const FIT_PADDING = 0.96;

export function OperationDiagram({
  snapshot,
  selectedNodeId,
  focusGroups,
  mode,
  modeOptions,
  onModeChange,
  stationId,
  stationOptions,
  onStationChange,
  canUnlockControls,
  controlsUnlocked,
  onControlsUnlockedChange,
  onSelect,
}: OperationDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getFitZoom = () => {
    if (!containerRef.current) return 100;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = Math.max(0, rect.width - 32) / DIAGRAM_WIDTH;
    const scaleY = Math.max(0, rect.height - 32) / DIAGRAM_HEIGHT;
    const fitScale = Math.min(scaleX, scaleY) * FIT_PADDING;
    return Math.round(Math.max(0.5, Math.min(2, fitScale)) * 100);
  };

  const fitToScreen = () => {
    setZoom(getFitZoom());
    setPan({ x: 0, y: 0 });
  };

  const resetZoom = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(200, Math.round((prev + 10) / 10) * 10));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(50, Math.round((prev - 10) / 10) * 10));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input")
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input")
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setZoom(getFitZoom());
        setPan({ x: 0, y: 0 });
      });
    };

    const observer = new ResizeObserver(fit);
    observer.observe(node);
    fit();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 w-full select-none overflow-hidden rounded-2xl border border-border bg-card/40 shadow-2xl shadow-black/30 backdrop-blur-sm">
      {/* Diagram filters */}
      <div className="pointer-events-auto absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        <SelectControl
          id="operation-diagram-station"
          label="Station"
          value={stationId ?? ""}
          onChange={onStationChange}
          options={stationOptions.map((station) => ({
            value: station.id,
            label: station.name,
          }))}
          className="w-[220px]"
        />
        <SelectControl
          id="operation-diagram-scope"
          label="Diagram scope"
          value={mode}
          onChange={onModeChange}
          options={modeOptions}
          className="w-44"
        />
      </div>

      {/* Status and controls */}
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-wrap items-center justify-end gap-2">
        <div className="flex h-9 items-center gap-1 rounded-xl border border-border bg-card/90 px-1 shadow-lg backdrop-blur-sm">
          <StatusPill
            label="Station"
            value={snapshot.status.station}
            tone={snapshot.status.stationTone}
          />
          <StatusPill
            label="Grid"
            value={snapshot.status.grid}
            tone={snapshot.status.gridTone}
          />
          <StatusPill
            label="PLC"
            value={snapshot.status.plc}
            tone={snapshot.status.plcTone}
          />
        </div>
        <div className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card/90 px-3 text-sm shadow-lg backdrop-blur-sm">
          {controlsUnlocked && canUnlockControls ? (
            <LockOpen className="size-4 text-online" />
          ) : (
            <Lock className="size-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {canUnlockControls ? "Controls" : "Read only"}
          </span>
          <Switch
            checked={controlsUnlocked}
            disabled={!canUnlockControls}
            onCheckedChange={onControlsUnlockedChange}
            aria-label="Unlock controls"
          />
        </div>
      </div>

      {/* Diagram controls */}
      <div className="pointer-events-auto absolute left-4 top-1/2 z-20 flex w-9 -translate-y-1/2 flex-col items-center gap-2">
        <button
          type="button"
          onClick={fitToScreen}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card/90 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shadow-lg backdrop-blur-sm"
          title="Fit to Screen">
          <Maximize className="size-4" />
        </button>

        <button
          type="button"
          onClick={resetZoom}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card/90 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shadow-lg backdrop-blur-sm"
          title="Reset Zoom">
          <RotateCcw className="size-4" />
        </button>

        <div className="flex w-9 flex-col items-center gap-2 rounded-xl border border-border bg-card/90 py-2 text-muted-foreground shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 200}
            className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            title="Zoom In">
            <Plus className="size-3.5" />
          </button>
          <span className="select-none text-[11px] font-semibold text-foreground [writing-mode:vertical-rl]">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 50}
            className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            title="Zoom Out">
            <Minus className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <div
          className={cn(
            "relative h-[720px] w-[1180px] shrink-0 origin-center select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}>
          <svg
            viewBox="0 0 1180 720"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden>
            <defs>
              <filter
                id="operation-line-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%">
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
              filter="url(#operation-line-glow)">
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
              filter="url(#operation-line-glow)">
              {FLOW_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>

            {/* Neutral / de-energized conductor */}
            <g
              fill="none"
              stroke="#56657a"
              strokeLinecap="round"
              strokeWidth="2.5">
              <path d="M170 668 H348" />
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
              dimmed={
                !!focusGroups &&
                !focusGroups.includes(node.group) &&
                node.group !== "aux"
              }
              onSelect={() => onSelect(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: OperationSnapshot["status"]["stationTone"];
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1">
      <StatusDot status={tone} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold",
          tone === "online" && "text-online",
          tone === "warning" && "text-warning",
          tone === "offline" && "text-offline"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SelectControl({
  id,
  label,
  value,
  options,
  className,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={options.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-xl border border-border bg-card/90 pl-3 pr-9 text-sm font-semibold text-foreground shadow-lg outline-none backdrop-blur-sm transition-colors hover:border-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
    dimmed && "opacity-40",
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
          node.muted && "grayscale",
        )}
        style={{ left: node.position.x, top: node.position.y }}>
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
          selected ? "border-primary ring-1 ring-primary/40" : "border-border",
        )}
        style={{ left: node.position.x, top: node.position.y }}>
        <span className="text-xs font-semibold text-foreground">
          {node.label}
        </span>
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
          "flex h-10 w-[146px] items-center justify-center gap-1.5 rounded-xl border bg-secondary px-3 text-center text-xs font-semibold text-foreground shadow-lg",
          selected ? "border-primary ring-1 ring-primary/40" : "border-border",
          node.muted && "opacity-55",
        )}
        style={{ left: node.position.x, top: node.position.y }}>
        <StatusDot status={node.status} />
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
        node.muted && "opacity-55",
      )}
      style={{ left: node.position.x, top: node.position.y }}>
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
                node.status === "online" &&
                  "bg-emerald-400/10 text-emerald-300",
                node.status === "warning" && "bg-amber-400/10 text-amber-300",
                node.status === "offline" && "bg-red-400/10 text-red-300",
              )}>
              <StatusDot status={node.status} />
              <span className="ml-1">{node.stateLabel}</span>
            </Badge>
          </div>
          <dl className="mt-2 space-y-1">
            {node.telemetry.slice(0, 3).map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3">
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
