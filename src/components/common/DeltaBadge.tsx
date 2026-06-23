import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Delta } from "@/features/data/types/domain";

interface DeltaBadgeProps {
  delta: Delta;
  suffix?: string;
  className?: string;
}

export function DeltaBadge({ delta, suffix = "vs yesterday", className }: DeltaBadgeProps) {
  const up = delta.direction === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-online" : "text-destructive",
        className
      )}
    >
      <Icon className="size-3" />
      {delta.pct}%
      <span className="ml-1 font-normal text-muted-foreground">{suffix}</span>
    </span>
  );
}
