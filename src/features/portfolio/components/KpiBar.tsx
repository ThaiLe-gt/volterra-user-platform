"use client";

import { AlertTriangle, Boxes, CircleCheck, Activity } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { usePortfolioKpis } from "../hooks/usePortfolioData";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiBar() {
  const { data, isLoading } = usePortfolioKpis();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Total Assets"
        value={data.totalAssets}
        icon={<Boxes className="size-4" />}
        className="min-w-44"
        deltaSuffix=""
      />
      <StatCard
        label="Online Twins"
        value={data.onlineTwins}
        icon={<Activity className="size-4 text-online" />}
        className="min-w-44"
      />
      <StatCard
        label="Active Alerts"
        value={data.activeAlerts}
        icon={<AlertTriangle className="size-4 text-warning" />}
        className="min-w-44"
      />
      <StatCard
        label="Efficiency (Avg.)"
        value={`${data.efficiencyAvg}%`}
        delta={data.efficiencyDelta}
        deltaSuffix="vs last month"
        icon={<CircleCheck className="size-4 text-online" />}
        className="min-w-44"
      />
    </div>
  );
}
