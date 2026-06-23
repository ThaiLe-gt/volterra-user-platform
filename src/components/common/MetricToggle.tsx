"use client";

import { cn } from "@/lib/utils";
import {
  METRICS,
  METRIC_LABEL,
  type Metric,
} from "@/features/data/repository/webEnergyMappers";

/** Chart stroke colour per telemetry metric (CSS vars from globals.css). */
export const METRIC_COLOR: Record<Metric, string> = {
  power: "var(--chart-power)",
  solar: "var(--chart-solar)",
  bess: "var(--chart-bess)",
  charger: "var(--chart-charger)",
};

export const METRIC_UNIT: Record<Metric, string> = {
  power: "kW",
  solar: "kW",
  bess: "%",
  charger: "kWh",
};

interface MetricToggleProps {
  value: Metric;
  onChange: (metric: Metric) => void;
  className?: string;
}

/** Compact segmented control for switching a chart's telemetry domain. */
export function MetricToggle({ value, onChange, className }: MetricToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Chart metric"
      className={cn(
        "inline-flex rounded-lg border border-border bg-card/60 p-0.5",
        className
      )}
    >
      {METRICS.map((metric) => (
        <button
          key={metric}
          type="button"
          role="tab"
          aria-selected={value === metric}
          onClick={() => onChange(metric)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === metric
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {METRIC_LABEL[metric]}
        </button>
      ))}
    </div>
  );
}

export type { Metric };
export { METRIC_LABEL };
