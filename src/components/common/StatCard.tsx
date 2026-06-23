import { cn } from "@/lib/utils";
import type { Delta, TimeSeriesPoint } from "@/features/data/types/domain";
import { DeltaBadge } from "./DeltaBadge";
import { MiniLineChart } from "./MiniLineChart";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: Delta;
  deltaSuffix?: string;
  icon?: React.ReactNode;
  series?: TimeSeriesPoint[];
  seriesColor?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaSuffix,
  icon,
  series,
  seriesColor,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {delta && <DeltaBadge delta={delta} suffix={deltaSuffix} className="mt-1" />}
      {series && series.length > 0 && (
        <div className="mt-2">
          <MiniLineChart data={series} color={seriesColor} />
        </div>
      )}
    </div>
  );
}
