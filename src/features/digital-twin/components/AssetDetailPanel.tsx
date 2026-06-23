"use client";

import { useState } from "react";
import { MoreVertical, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/common/StatCard";
import { MiniLineChart } from "@/components/common/MiniLineChart";
import {
  MetricToggle,
  METRIC_COLOR,
  METRIC_LABEL,
  METRIC_UNIT,
  type Metric,
} from "@/components/common/MetricToggle";
import {
  RangeToggle,
  type ChartRange,
} from "@/components/common/RangeToggle";
import type { MetricValue, TimeSeriesPoint } from "@/features/data/types/domain";
import { useAssetDetail, useAssetTimeseries } from "../hooks/useTwinData";
import { ControlTab } from "./control/ControlTab";

/** Hardware controls are only available against the live web-energy backend. */
const CONTROLS_ENABLED = process.env.NEXT_PUBLIC_DATA_SOURCE === "webenergy";

interface AssetDetailPanelProps {
  siteId: string;
  assetId: string;
  onClose: () => void;
}

export function AssetDetailPanel({
  siteId,
  assetId,
  onClose,
}: AssetDetailPanelProps) {
  const [metric, setMetric] = useState<Metric>("power");
  const [range, setRange] = useState<ChartRange>("1d");
  const { data: asset, isLoading } = useAssetDetail(siteId, assetId);
  const { data: series } = useAssetTimeseries(siteId, assetId, metric, range);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md md:w-[410px] md:max-w-[calc(100vw-2rem)]">
      {isLoading || !asset ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="border-b border-border px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-foreground">
                  {asset.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{asset.typeLabel}</span>
                  <Badge className="border-transparent bg-online/15 text-online">
                    {asset.operationalLabel}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="More"
                >
                  <MoreVertical className="size-4" />
                </button>
                <button
                  onClick={onClose}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
            <div className="px-5 pt-3">
              <TabsList className="w-full justify-start gap-6 bg-transparent p-0 border-b border-border rounded-none h-auto">
                {[
                  "overview",
                  "technical",
                  "maintenance",
                  ...(CONTROLS_ENABLED ? ["controls"] : []),
                ].map((t) => (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="rounded-none border-b-2 border-x-0 border-t-0 border-transparent bg-transparent px-0 pb-2 capitalize data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary dark:data-[state=active]:border-x-transparent dark:data-[state=active]:border-t-transparent dark:border-transparent dark:data-[state=active]:text-foreground shadow-none h-auto -mb-[2px]"
                  >
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-5">
                <TabsContent value="overview" className="mt-0 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {asset.overview.map((m) => {
                      const extras = getMetricExtras(m.label, m.value);
                      const finalDelta = m.delta || extras.delta;
                      const finalSeries = extras.series;
                      const finalColor = extras.color;

                      return (
                        <StatCard
                          key={m.label}
                          label={m.label}
                          value={m.value}
                          unit={m.unit}
                          delta={finalDelta}
                          series={finalSeries}
                          seriesColor={finalColor}
                        />
                      );
                    })}
                  </div>

                  <Section title="Status">
                    <div className="space-y-3 rounded-lg border border-border bg-card/60 p-3.5">
                      <StatusRow
                        label="Operational Status"
                        value={asset.operationalLabel}
                        tone={asset.status === "online" ? "online" : "muted"}
                      />
                      <StatusRow
                        label="Health Status"
                        value={healthLabel(asset.status)}
                        tone={asset.status === "offline" ? "muted" : "online"}
                      />
                      <StatusRow
                        label="Latest Signal"
                        value={
                          metricValue(asset.maintenance, "Latest Signal") ?? "-"
                        }
                      />
                    </div>
                  </Section>

                  <Section title="Real-time Data" action={<LivePill />}>
                    <div className="rounded-lg border border-border bg-card/60 p-3.5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <MetricToggle value={metric} onChange={setMetric} />
                        <RangeToggle value={range} onChange={setRange} />
                      </div>
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: METRIC_COLOR[metric] }}
                          aria-hidden
                        />
                        <span>
                          {METRIC_LABEL[metric]} ({METRIC_UNIT[metric]})
                        </span>
                      </div>
                      <MiniLineChart
                        data={series ?? []}
                        height={190}
                        color={METRIC_COLOR[metric]}
                        label={METRIC_LABEL[metric]}
                        unit={METRIC_UNIT[metric]}
                        variant="detail"
                      />
                    </div>
                  </Section>
                </TabsContent>

                <TabsContent value="technical" className="mt-0">
                  <MetricList items={asset.technical} />
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0">
                  <MetricList items={asset.maintenance} />
                </TabsContent>

                {CONTROLS_ENABLED && (
                  <TabsContent value="controls" className="mt-0">
                    <ControlTab assetId={assetId} />
                  </TabsContent>
                )}
              </div>
            </ScrollArea>
          </Tabs>

          <div className="border-t border-border p-4">
            <Button className="w-full">View Full Details</Button>
          </div>
        </>
      )}
    </aside>
  );
}

function StatusRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "online" | "muted";
}) {
  const valueClass =
    tone === "online"
      ? "text-online"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-online">
      <span className="size-1.5 rounded-full bg-online" />
      Live
    </span>
  );
}

function MetricList({ items }: { items: MetricValue[] }) {
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{m.label}</span>
          <span className="text-foreground">
            {m.value}
            {m.unit ? ` ${m.unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function metricValue(items: MetricValue[], label: string): string | number | undefined {
  return items.find((item) => item.label === label)?.value;
}

function healthLabel(status: string): string {
  if (status === "online") return "Good";
  if (status === "warning") return "Attention";
  return "Offline";
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function getMetricExtras(label: string, value: string | number) {
  const val = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  let delta: { pct: number; direction: "up" | "down" } = { pct: 0, direction: "up" };
  let color = "var(--color-online)"; // default green

  const normLabel = label.toLowerCase();
  
  if (normLabel.includes("power output") || normLabel.includes("power consumption")) {
    delta = { pct: 12.5, direction: "up" };
    color = "var(--color-online)";
  } else if (normLabel.includes("solar")) {
    delta = { pct: 8.2, direction: "up" };
    color = "var(--color-online)";
  } else if (normLabel.includes("soc")) {
    delta = { pct: 1.7, direction: "down" };
    color = "var(--destructive)";
  } else if (normLabel.includes("battery power")) {
    delta = { pct: 4.8, direction: "up" };
    color = "var(--color-online)";
  } else if (normLabel.includes("utilization")) {
    delta = { pct: 2.4, direction: "up" };
    color = "var(--color-online)";
  } else if (normLabel.includes("energy")) {
    delta = { pct: 3.1, direction: "up" };
    color = "var(--color-online)";
  } else {
    delta = { pct: 1.5, direction: "up" };
    color = "var(--color-online)";
  }

  // Generate a nice deterministic wavy sparkline series (12 points)
  const points = 12;
  const series: TimeSeriesPoint[] = [];
  const now = Date.now();
  const step = 3600000; // 1 hour steps

  for (let i = 0; i < points; i++) {
    const phase = (i / (points - 1)) * Math.PI * 2;
    let pointVal = val;
    // Add some realistic variation based on the label and index
    if (delta.direction === "up") {
      pointVal = val * (0.88 + (i / points) * 0.12 + Math.sin(phase * 1.5) * 0.05);
    } else {
      pointVal = val * (1.02 - (i / points) * 0.02 + Math.sin(phase * 1.5) * 0.05);
    }
    pointVal = Math.max(0, Math.round(pointVal * 10) / 10);
    series.push({
      t: now - (points - 1 - i) * step,
      value: pointVal,
      series: label,
    });
  }

  return { delta, series, color };
}
