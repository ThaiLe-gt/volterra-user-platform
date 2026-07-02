"use client";

import { useMemo, useState } from "react";
import {
  BatteryCharging,
  PlugZap,
  RadioTower,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetStatus } from "@/features/data/types/domain";
import type { IotBubbleConfig } from "@/features/data/config/vinuniSiteConfig";
import type { IotBubbleTelemetry } from "@/features/digital-twin/lib/iotBubbleTelemetry";
import type { ProjectedIotBubble } from "../lib/iotBubbleProjection";

interface BimIotBubbleOverlayProps {
  bubbles: ProjectedIotBubble[];
  selectedBubbleId: string | null;
  telemetryByBubbleId?: Record<string, IotBubbleTelemetry>;
  onSelectBubble: (bubble: IotBubbleConfig) => void;
  onCloseBubble: () => void;
  onViewDetails: (bubble: IotBubbleConfig) => void;
}

const STATUS_CLASS: Record<AssetStatus, string> = {
  online:
    "border-online/70 bg-online/20 text-online shadow-[0_0_18px_rgba(19,210,142,0.45)]",
  warning:
    "border-warning/70 bg-warning/20 text-warning shadow-[0_0_18px_rgba(255,188,66,0.38)]",
  offline:
    "border-offline/70 bg-offline/20 text-offline shadow-[0_0_18px_rgba(255,88,88,0.38)]",
};

export function BimIotBubbleOverlay({
  bubbles,
  selectedBubbleId,
  telemetryByBubbleId = {},
  onSelectBubble,
  onCloseBubble,
  onViewDetails,
}: BimIotBubbleOverlayProps) {
  const visibleBubbles = useMemo(
    () => bubbles.filter((item) => item.visible),
    [bubbles]
  );

  if (visibleBubbles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]">
      {visibleBubbles.map(({ bubble, x, y }) => {
        const telemetry = telemetryByBubbleId[bubble.id];
        const status = telemetry?.status ?? bubble.status ?? "online";
        const active = selectedBubbleId === bubble.id;
        return (
          <div
            key={bubble.id}
            className="absolute left-0 top-0"
            style={{
              transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
            }}
          >
            <button
              type="button"
              title={bubble.label}
              aria-label={`Open ${bubble.label} details`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectBubble(bubble);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              className={cn(
                "group pointer-events-auto relative flex size-12 items-center justify-center rounded-full text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                status === "online" && "text-online",
                status === "warning" && "text-warning",
                status === "offline" && "text-offline"
              )}
            >
              <span
                className={cn(
                  "absolute size-8 rounded-full border backdrop-blur-sm transition-colors group-hover:bg-card/70 group-hover:shadow-[0_0_24px_rgba(47,128,237,0.35)]",
                  STATUS_CLASS[status],
                  active &&
                    "bg-card/80 ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              />
              <span className="absolute size-12 rounded-full border border-current opacity-25 transition-opacity group-hover:opacity-50" />
              <BubbleIcon kind={bubble.kind} className="relative size-4" />
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card/95 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {bubble.label}
              </span>
            </button>
            {active && (
              <BubbleDetailCard
                label={telemetry?.title ?? bubble.label}
                kind={bubble.kind}
                status={status}
                telemetry={telemetry}
                onClose={onCloseBubble}
                onViewDetails={() => onViewDetails(bubble)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BubbleIcon({
  kind,
  className,
}: {
  kind?: string;
  className?: string;
}) {
  const normalized = kind?.toLowerCase();
  if (normalized === "solar") return <Sun className={className} />;
  if (normalized === "bess") return <BatteryCharging className={className} />;
  if (normalized === "charger") return <PlugZap className={className} />;
  if (normalized === "grid") return <Zap className={className} />;
  return <RadioTower className={className} />;
}

function BubbleDetailCard({
  label,
  kind,
  status,
  telemetry,
  onClose,
  onViewDetails,
}: {
  label: string;
  kind?: string;
  status: AssetStatus;
  telemetry?: IotBubbleTelemetry;
  onClose: () => void;
  onViewDetails: () => void;
}) {
  const mainValue = telemetry?.mainValue ?? statusLabel(status);
  const mainUnit = telemetry?.mainUnit;
  const firstRowValue = telemetry?.rows[0]?.value;
  const chartSeed = useMemo(
    () => numericValue(mainValue) ?? numericValue(firstRowValue) ?? 1,
    [firstRowValue, mainValue]
  );

  return (
    <div
      className="pointer-events-auto absolute left-full top-1/2 ml-4 w-56 -translate-y-1/2 rounded-2xl border border-border bg-card/95 p-4 text-foreground shadow-2xl backdrop-blur-md"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close bubble details"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border",
            STATUS_CLASS[status]
          )}
        >
          <BubbleIcon kind={kind} className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{label}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "online" && "bg-online",
                status === "warning" && "bg-warning",
                status === "offline" && "bg-offline"
              )}
            />
            {status}
          </div>
        </div>
      </div>
      {telemetry?.mainLabel ? (
        <div className="mt-4 text-xs text-muted-foreground">
          {telemetry.mainLabel}
        </div>
      ) : null}
      <div className="mt-1 text-3xl font-semibold leading-none">
        {mainValue}
        {mainUnit ? (
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {mainUnit}
          </span>
        ) : null}
      </div>
      {telemetry?.rows.length ? (
        <div className="mt-3 space-y-1.5">
          {telemetry.rows.slice(0, 3).map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="truncate text-muted-foreground">{row.label}</span>
              <span className="shrink-0 font-medium text-foreground">
                {row.value}
                {row.unit ? (
                  <span className="ml-1 text-muted-foreground">{row.unit}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {telemetry?.updatedAt ? (
        <div className="mt-3 text-[11px] text-muted-foreground">
          Updated {formatTime(telemetry.updatedAt)}
        </div>
      ) : null}
      <InteractiveSparkline
        seed={chartSeed}
        unit={mainUnit}
        className="mt-4 text-online"
      />
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails();
          }}
          className="h-9 min-w-40 rounded-lg bg-primary px-5 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          View details
        </button>
      </div>
    </div>
  );
}

function statusLabel(status: AssetStatus): string {
  if (status === "online") return "Live";
  if (status === "warning") return "Check";
  return "Offline";
}

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function InteractiveSparkline({
  seed,
  unit,
  className,
}: {
  seed: number;
  unit?: string;
  className?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const values = useMemo(() => buildSparklineValues(seed), [seed]);
  const points = useMemo(() => toSparklinePoints(values), [values]);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const activePoint =
    hoverIndex === null ? null : points[Math.min(hoverIndex, points.length - 1)];
  const activeValue =
    hoverIndex === null
      ? null
      : values[Math.min(hoverIndex, values.length - 1)];

  return (
    <div className={cn("relative h-12 w-full", className)}>
      <svg
        className="h-full w-full"
        viewBox="0 0 160 44"
        fill="none"
        role="img"
        aria-label="Recent telemetry trend"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 160;
          const nextIndex = Math.round((x / 160) * (values.length - 1));
          const boundedIndex = Math.max(
            0,
            Math.min(values.length - 1, nextIndex)
          );
          setHoverIndex((previous) =>
            previous === boundedIndex ? previous : boundedIndex
          );
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <path
          d="M2 34 H158"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 5"
          opacity="0.18"
        />
        <path
          d={path}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {activePoint ? (
          <>
            <path
              d={`M${activePoint.x} 6 V38`}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.35"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4"
              fill="currentColor"
            />
          </>
        ) : null}
      </svg>
      {activePoint && activeValue !== null ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-1 rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-semibold text-popover-foreground shadow-lg"
          style={{
            left: `${(activePoint.x / 160) * 100}%`,
          }}
        >
          {formatChartValue(activeValue, unit)}
        </div>
      ) : null}
    </div>
  );
}

function buildSparklineValues(seed: number): number[] {
  const magnitude = Math.max(Math.abs(seed), 1);
  return Array.from({ length: 13 }, (_, index) => {
    const wave = Math.sin(index * 0.78) * 0.16 + Math.cos(index * 0.36) * 0.08;
    const ramp = (index - 6) * 0.012;
    return seed + magnitude * (wave + ramp);
  });
}

function toSparklinePoints(values: number[]): { x: number; y: number }[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => ({
    x: 2 + (index / Math.max(values.length - 1, 1)) * 156,
    y: 36 - ((value - min) / range) * 26,
  }));
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!normalized) return null;
  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatChartValue(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}
