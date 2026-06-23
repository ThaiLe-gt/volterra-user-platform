import { cn } from "@/lib/utils";
import type { Delta } from "@/features/data/types/domain";

interface DeltaBadgeProps {
  delta: Delta;
  suffix?: string;
  className?: string;
}

export function DeltaBadge({ delta, suffix = "vs yesterday", className }: DeltaBadgeProps) {
  const up = delta.direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        up ? "text-online" : "text-destructive",
        className
      )}
    >
      <span>{up ? "▲" : "▼"}</span>
      <span>{delta.pct}%</span>
      <span className="ml-1 font-normal text-muted-foreground">{suffix}</span>
    </span>
  );
}
