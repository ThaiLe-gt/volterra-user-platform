"use client";

import { cn } from "@/lib/utils";
import { ASSET_TYPES } from "@/constants/assetTypes";
import { usePortfolioStore } from "../store/portfolioStore";

export function AssetTypeFilterBar() {
  const { activeTypes, toggleType, clearTypes } = usePortfolioStore();
  const allActive = activeTypes.length === 0;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card/85 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-3 pr-3 text-xs text-muted-foreground">
        <Legend className="bg-online" label="Online" />
        <Legend className="bg-warning" label="Warning" />
        <Legend className="bg-offline" label="Offline" />
      </div>
      <div className="h-5 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Chip active={allActive} onClick={clearTypes}>
          All
        </Chip>
        {ASSET_TYPES.map(({ type, label, icon: Icon }) => (
          <Chip
            key={type}
            active={activeTypes.includes(type)}
            onClick={() => toggleType(type)}
          >
            <Icon className="size-3.5" />
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
