"use client";

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

      {/* Top-left KPI cards */}
      <div className="pointer-events-none absolute left-4 top-4 z-10">
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
        <div className="absolute bottom-4 right-4 top-4 z-20">
          <SiteDetailPanel
            siteId={selectedSiteId}
            onClose={() => setSelectedSiteId(null)}
          />
        </div>
      )}
    </div>
  );
}
