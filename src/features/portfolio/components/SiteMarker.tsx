"use client";

import { cn } from "@/lib/utils";
import type { Site } from "@/features/data/types/domain";
import { ASSET_TYPE_MAP } from "@/constants/assetTypes";

const STATUS_RING: Record<Site["status"], string> = {
  online: "border-online/60",
  warning: "border-warning/70",
  offline: "border-offline/60",
};

const STATUS_TEXT: Record<Site["status"], string> = {
  online: "text-online",
  warning: "text-warning",
  offline: "text-offline",
};

interface SiteMarkerProps {
  site: Site;
  selected: boolean;
  onSelect: (site: Site) => void;
}

export function SiteMarker({ site, selected, onSelect }: SiteMarkerProps) {
  const config = ASSET_TYPE_MAP[site.assetType];
  const Icon = config.icon;
  const statusLabel =
    site.status === "warning"
      ? "Warning"
      : site.status === "offline"
        ? "Offline"
        : site.kpi.totalPower > 0
          ? `${site.kpi.totalPower} MW`
          : "Online";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(site);
      }}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-card/90 px-2.5 py-1.5 shadow-md backdrop-blur-sm transition-all hover:bg-card",
        STATUS_RING[site.status],
        selected && "ring-2 ring-primary"
      )}
    >
      <Icon className={cn("size-4 shrink-0", STATUS_TEXT[site.status])} />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs font-medium text-foreground">{site.name}</span>
        <span className={cn("text-[10px]", STATUS_TEXT[site.status])}>
          {statusLabel}
        </span>
      </span>
    </button>
  );
}
