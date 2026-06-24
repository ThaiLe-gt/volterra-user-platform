"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { TimeSeriesPoint } from "@/features/data/types/domain";

interface MiniLineChartProps {
  data: TimeSeriesPoint[];
  color?: string;
  height?: number;
  variant?: "sparkline" | "detail";
  label?: string;
  unit?: string;
}

/** Compact sparkline by default; richer detail chart for inspector panels. */
export function MiniLineChart({
  data,
  color = "var(--chart-power)",
  height = 36,
  variant = "sparkline",
  label = "Value",
  unit,
}: MiniLineChartProps) {
  const gradientId = `sparkline-fill-${useId().replace(/:/g, "")}`;

  if (variant === "detail") {
    return (
      <DetailLineChart
        data={data}
        color={color}
        height={height}
        label={label}
        unit={unit}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DetailLineChart({
  data,
  color,
  height,
  label,
  unit,
}: Required<Pick<MiniLineChartProps, "data" | "color" | "height" | "label">> &
  Pick<MiniLineChartProps, "unit">) {
  const gradientId = `chart-fill-${useId().replace(/:/g, "")}`;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-border/80 text-sm text-muted-foreground"
        style={{ height }}
      >
        No telemetry for this range
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="75%" stopColor={color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="var(--border)"
          strokeDasharray="3 6"
          vertical={false}
          opacity={0.7}
        />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatTickTime}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          width={42}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
          tickFormatter={(value: number) => compactNumber(value)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          cursor={{
            stroke: color,
            strokeWidth: 1,
            strokeDasharray: "4 4",
          }}
          content={(props) => (
            <ChartTooltip {...props} labelText={label} unit={unit} color={color} />
          )}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={label}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: color }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  labelText,
  unit,
  color,
}: TooltipContentProps & {
  labelText: string;
  unit?: string;
  color: string;
}) {
  const value = payload?.[0]?.value;
  if (!active || value === undefined) return null;

  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <div className="text-muted-foreground">{formatTooltipTime(label)}</div>
      <div className="mt-1 flex items-center gap-2 text-foreground">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span>{labelText}</span>
        <span className="font-semibold">
          {formatValue(value)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}

function formatTickTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatTooltipTime(value?: string | number): string {
  if (typeof value !== "number") return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatValue(value: TooltipContentProps["payload"][number]["value"]): string {
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(" - ");
  if (typeof value === "string") return value;
  if (typeof value !== "number") return "";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
