"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "../store/portfolioStore";
import { usePortfolioSites } from "../hooks/usePortfolioData";
import { PortfolioMap } from "./PortfolioMap";
import { KpiBar } from "./KpiBar";
import { AssetTypeFilterBar } from "./AssetTypeFilterBar";
import { SiteDetailPanel } from "./SiteDetailPanel";

export function PortfolioView() {
  const { selectedSiteId, setSelectedSiteId, activeTypes } =
    usePortfolioStore();
  const { data: sites = [] } = usePortfolioSites(activeTypes);

  return (
    <div className="relative h-full w-full">
      {/* Map background */}
      <div className="absolute inset-0">
        <PortfolioMap
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelect={(s) => setSelectedSiteId(s.id)}
        />
      </div>

      {/* Top header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 p-4">
        <div className="pointer-events-auto flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Portfolio</h1>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-online" />
            digital twin
          </span>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets, sites, twins..."
              className="h-10 rounded-xl border-border bg-card/85 pl-9 backdrop-blur-sm"
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card/85 px-3 py-2 text-sm text-foreground backdrop-blur-sm">
            Volterra Portfolio
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          <button
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-card/85 text-muted-foreground backdrop-blur-sm hover:text-foreground"
            aria-label="Notifications">
            <Bell className="size-4" />
          </button>
        </div>
      </header>

      {/* Top-left KPI cards */}
      <div className="pointer-events-none absolute left-4 top-20 z-10">
        <div className="pointer-events-auto">
          <KpiBar />
        </div>
      </div>

      {/* Bottom filter bar */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <div className="pointer-events-auto">
          <AssetTypeFilterBar />
        </div>
      </div>

      {/* Right detail panel */}
      {selectedSiteId && (
        <div className="absolute bottom-4 right-4 top-20 z-20">
          <SiteDetailPanel
            siteId={selectedSiteId}
            onClose={() => setSelectedSiteId(null)}
          />
        </div>
      )}
    </div>
  );
}
