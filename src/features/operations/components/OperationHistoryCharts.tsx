"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { RangeToggle, type ChartRange } from "@/components/common/RangeToggle";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WEATHER_FIELD,
  WEATHER_FIELDS,
} from "../api/operationHistory";
import type {
  OperationChartSeries,
  OperationHistoryData,
  OperationSeriesChart,
  OperationWeatherChartField,
} from "../types";

interface OperationHistoryChartsProps {
  data?: OperationHistoryData;
  loading: boolean;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

const DOMAIN_LABEL: Record<OperationHistoryData["domain"], string> = {
  system: "System Common",
  grid: "Grid",
  wind: "Wind Turbine",
  solar: "PV Solar",
  bess: "BESS",
  charger: "Charger",
  weather: "Weather",
};

export function OperationHistoryCharts({
  data,
  loading,
  range,
  onRangeChange,
}: OperationHistoryChartsProps) {
  if (!data) {
    return (
      <HistoryShell
        title="History"
        range={range}
        onRangeChange={onRangeChange}
        windowLabel="No history target"
      >
        <EmptyHistory>Telemetry history is not available for this node.</EmptyHistory>
      </HistoryShell>
    );
  }

  const windowLabel = formatWindow(data);
  const title = `${DOMAIN_LABEL[data.domain]} history`;

  return (
    <HistoryShell
      title={title}
      range={range}
      onRangeChange={onRangeChange}
      windowLabel={windowLabel}
    >
      {loading ? (
        <EmptyHistory>Loading history...</EmptyHistory>
      ) : data.weather ? (
        <WeatherChart data={data} />
      ) : data.electrical ? (
        <div className="space-y-4">
          <SeriesChart chart={data.electrical.power} height={220} />
          <SeriesChart chart={data.electrical.electric} height={250} />
        </div>
      ) : (
        <EmptyHistory>No telemetry for this range.</EmptyHistory>
      )}
    </HistoryShell>
  );
}

function HistoryShell({
  title,
  range,
  onRangeChange,
  windowLabel,
  children,
}: {
  title: string;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  windowLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{windowLabel}</div>
        </div>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SeriesChart({
  chart,
  height,
}: {
  chart: OperationSeriesChart;
  height: number;
}) {
  if (!chart.points.length) {
    return <EmptyHistory height={height}>No telemetry for this range.</EmptyHistory>;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{chart.title}</div>
          <div className="text-xs text-muted-foreground">
            {chart.leftLabel}
            {chart.rightLabel ? ` / ${chart.rightLabel}` : ""}
          </div>
        </div>
        <SeriesLegend series={chart.series} />
      </div>

      <div className="mt-3">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chart.points}
            margin={{ top: 8, right: 6, bottom: 0, left: -12 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 6"
              vertical={false}
              opacity={0.72}
            />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatTickTime}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              width={42}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactNumber}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            {chart.rightLabel ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                width={42}
                tickLine={false}
                axisLine={false}
                domain={chart.rightDomain ?? ["auto", "auto"]}
                tickFormatter={compactNumber}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
            ) : null}
            <Tooltip
              cursor={{
                stroke: "var(--primary)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              content={(props) => (
                <SeriesTooltip {...props} series={chart.series} />
              )}
              isAnimationActive={false}
            />
            {chart.series.map((series) =>
              series.kind === "bar" ? (
                <Bar
                  key={series.key}
                  yAxisId={series.axis}
                  dataKey={series.key}
                  name={series.label}
                  fill={series.color}
                  barSize={8}
                  radius={[2, 2, 0, 0]}
                  opacity={0.78}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={series.key}
                  yAxisId={series.axis}
                  dataKey={series.key}
                  name={series.label}
                  type="monotone"
                  stroke={series.color}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{
                    r: 3.5,
                    stroke: "var(--card)",
                    strokeWidth: 1.5,
                    fill: series.color,
                  }}
                  isAnimationActive={false}
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WeatherChart({ data }: { data: OperationHistoryData }) {
  const [field, setField] =
    useState<OperationWeatherChartField>(DEFAULT_WEATHER_FIELD);
  const selectedField = WEATHER_FIELDS[field] ? field : DEFAULT_WEATHER_FIELD;
  const fieldConfig = WEATHER_FIELDS[selectedField];
  const chart: OperationSeriesChart = {
    title: "Weather index",
    leftLabel: `${fieldConfig.label} (${fieldConfig.unit})`,
    points: data.weather?.points ?? [],
    series: [
      {
        key: selectedField,
        label: fieldConfig.label,
        unit: fieldConfig.unit,
        color: fieldConfig.color,
        axis: "left",
        kind: "line",
      },
    ],
  };

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Selection Field
        <select
          value={selectedField}
          onChange={(event) =>
            setField(event.target.value as OperationWeatherChartField)
          }
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/50 focus:border-primary"
        >
          {(Object.keys(WEATHER_FIELDS) as OperationWeatherChartField[]).map(
            (key) => (
              <option key={key} value={key}>
                {WEATHER_FIELDS[key].label}
              </option>
            )
          )}
        </select>
      </label>
      <SeriesChart chart={chart} height={250} />
    </div>
  );
}

function SeriesLegend({ series }: { series: OperationChartSeries[] }) {
  return (
    <div className="flex max-w-full flex-wrap justify-end gap-x-3 gap-y-1">
      {series.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span
            className={cn(
              "size-2 shrink-0",
              item.kind === "line" ? "rounded-full" : "rounded-sm"
            )}
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function SeriesTooltip({
  active,
  payload,
  label,
  series,
}: TooltipContentProps & {
  series: OperationChartSeries[];
}) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(series.map((item) => [item.key, item]));

  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <div className="text-muted-foreground">{formatTooltipTime(label)}</div>
      <div className="mt-1 space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey);
          const meta = byKey.get(key);
          if (!meta) return null;
          return (
            <div key={key} className="flex items-center gap-2 text-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              <span>{meta.label}</span>
              <span className="font-semibold">
                {formatValue(item.value)}
                {meta.unit ? ` ${meta.unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyHistory({
  children,
  height = 180,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border/80 text-sm text-muted-foreground"
      style={{ height }}
    >
      {children}
    </div>
  );
}

function formatWindow(data: OperationHistoryData): string {
  const points = data.weather?.points ?? data.electrical?.power.points ?? [];
  if (!points.length) return "No samples in selected range";
  return `${formatTooltipTime(points[0].t)} - ${formatTooltipTime(points[points.length - 1].t)}`;
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
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
  }).format(value);
}
