"use client";

import { cn } from "@/lib/utils";

export type ChartRange = "1h" | "5h" | "1d" | "7d";

export const CHART_RANGES: ChartRange[] = ["1h", "5h", "1d", "7d"];

interface RangeToggleProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  className?: string;
}

export function RangeToggle({ value, onChange, className }: RangeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Chart range"
      className={cn(
        "inline-flex rounded-lg border border-border bg-card/60 p-0.5",
        className
      )}
    >
      {CHART_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          role="tab"
          aria-selected={value === range}
          onClick={() => onChange(range)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === range
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
