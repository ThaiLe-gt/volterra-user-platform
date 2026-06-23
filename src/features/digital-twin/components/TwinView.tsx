"use client";

import { Bell, MoreHorizontal, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TwinScene } from "./TwinScene";
import { BimStructureTree } from "./BimStructureTree";
import { TwinDashboardWidgets } from "./TwinDashboardWidgets";
import { AssetDetailPanel } from "./AssetDetailPanel";
import { ViewModeToggle } from "./ViewModeToggle";
import { useBimTree } from "../hooks/useTwinData";
import { type TwinPanel, useTwinStore } from "../store/twinStore";

interface TwinViewProps {
  siteId: string;
}

export function TwinView({ siteId }: TwinViewProps) {
  const { activePanel, selectedAssetId, setSelectedAssetId } = useTwinStore();
  const { data: tree } = useBimTree(siteId);
  const title = tree?.label ?? "Digital Twin";

  return (
    <div className="relative h-full w-full">
      {/* 3D scene background */}
      <div className="absolute inset-0">
        <TwinScene />
      </div>

      {/* Top header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 p-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">
            {title}
          </h1>
          <span className="flex items-center gap-1.5 rounded-full bg-online/15 px-2 py-0.5 text-xs text-online">
            <span className="size-1.5 rounded-full bg-online" />
            Online
          </span>
        </div>
        <div className="pointer-events-auto hidden items-center gap-3 md:flex">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search anything..."
              className="h-10 rounded-xl border-border bg-card/85 pl-9 backdrop-blur-sm"
            />
          </div>
          <button
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-card/85 text-muted-foreground backdrop-blur-sm hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </header>

      {/* View-mode toggle under the title */}
      <div className="absolute left-4 top-20 z-10">
        <ViewModeToggle />
      </div>

      {/* Switchable BIM structure / widget panel */}
      <div className="absolute bottom-24 left-4 right-4 top-32 z-10 md:bottom-6 md:right-auto md:w-[320px]">
        <TwinSidePanel activePanel={activePanel} siteId={siteId} />
      </div>

      {/* Right asset detail panel */}
      {selectedAssetId && (
        <div className="absolute bottom-20 left-2 right-2 top-24 z-20 md:bottom-4 md:left-auto md:right-4 md:top-20">
          <AssetDetailPanel
            siteId={siteId}
            assetId={selectedAssetId}
            onClose={() => setSelectedAssetId(null)}
          />
        </div>
      )}
    </div>
  );
}

function TwinSidePanel({
  activePanel,
  siteId,
}: {
  activePanel: TwinPanel;
  siteId: string;
}) {
  const title = activePanel === "structure" ? "BIM Structure" : "Preset Dashboard";

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card/90 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {activePanel === "structure" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="size-4" />
            <MoreHorizontal className="size-4" />
          </div>
        ) : (
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Widget settings"
          >
            <Settings className="size-4" />
          </button>
        )}
      </div>
      {activePanel === "structure" ? (
        <BimStructureTree siteId={siteId} />
      ) : (
        <TwinDashboardWidgets siteId={siteId} />
      )}
    </aside>
  );
}
