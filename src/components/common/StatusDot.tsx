import { cn } from "@/lib/utils";
import type { AssetStatus } from "@/features/data/types/domain";

const STATUS_CLASS: Record<AssetStatus, string> = {
  online: "bg-online shadow-[0_0_8px_2px_var(--status-online)]",
  warning: "bg-warning shadow-[0_0_8px_2px_var(--status-warning)]",
  offline: "bg-offline",
};

const STATUS_LABEL: Record<AssetStatus, string> = {
  online: "Online",
  warning: "Warning",
  offline: "Offline",
};

interface StatusDotProps {
  status: AssetStatus;
  withLabel?: boolean;
  className?: string;
}

export function StatusDot({ status, withLabel, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-2 rounded-full", STATUS_CLASS[status])} />
      {withLabel && (
        <span className="text-xs text-muted-foreground">
          {STATUS_LABEL[status]}
        </span>
      )}
    </span>
  );
}

export { STATUS_LABEL };
