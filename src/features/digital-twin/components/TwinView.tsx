"use client";

import { MoreHorizontal, Search, Settings } from "lucide-react";
import { TwinScene } from "./TwinScene";
import { BimStructureTree } from "./BimStructureTree";
import { TwinDashboardWidgets } from "./TwinDashboardWidgets";
import { AssetDetailPanel } from "./AssetDetailPanel";
import { type TwinPanel, useTwinStore } from "../store/twinStore";

interface TwinViewProps {
  siteId: string;
}

export function TwinView({ siteId }: TwinViewProps) {
  const {
    activePanel,
    detailTarget,
    setDetailTarget,
  } = useTwinStore();

  return (
    <div className="relative h-full w-full">
      {/* 3D scene background */}
      <div className="absolute inset-0">
        <TwinScene />
      </div>

      {/* Switchable BIM structure / widget panel */}
      <div className="absolute bottom-24 left-4 right-4 top-4 z-10 md:bottom-6 md:right-auto md:w-[320px]">
        <TwinSidePanel activePanel={activePanel} siteId={siteId} />
      </div>

      {/* Right asset detail panel, opened only from explicit detail actions. */}
      {detailTarget && (
        <div className="absolute bottom-20 left-2 right-2 top-4 z-20 md:bottom-4 md:left-auto md:right-4">
          <AssetDetailPanel
            siteId={siteId}
            assetId={detailTarget.assetId}
            bubbleId={detailTarget.bubbleId}
            operationNodeId={detailTarget.operationNodeId}
            deviceId={detailTarget.deviceId}
            onClose={() => setDetailTarget(null)}
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
