"use client";

import { Battery, Snowflake, Users, Zap } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { cn } from "@/lib/utils";
import type { MetricValue } from "@/features/data/types/domain";
import { useTwinKpis } from "../hooks/useTwinData";

const ICONS = [Zap, Snowflake, Users, Battery];

export function TwinKpiCards({
  siteId,
  compact = false,
}: {
  siteId: string;
  compact?: boolean;
}) {
  const { data } = useTwinKpis(siteId);
  if (!data) return null;

  const cards: MetricValue[] = [
    data.totalPower,
    data.coolingEfficiency,
    data.occupancy,
    data.batterySoc,
  ];

  return (
    <div
      className={cn(
        compact ? "grid grid-cols-2 gap-2" : "flex flex-row flex-wrap gap-3"
      )}
    >
      {cards.map((kpi, i) => {
        const Icon = ICONS[i];
        return (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            delta={kpi.delta}
            icon={<Icon className="size-4" />}
            className={cn(compact ? "min-w-0 rounded-lg" : "w-44")}
          />
        );
      })}
    </div>
  );
}
