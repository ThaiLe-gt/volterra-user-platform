"use client";

import { useState } from "react";
import { useAppChromeStore } from "@/components/layout/appChromeStore";
import { useStationControl } from "@/features/digital-twin/hooks/useDeviceControl";
import {
  OPERATIONS_CONTROLS_ENABLED,
  useOperationSnapshot,
  useOperationStations,
} from "../hooks/useOperationData";
import type { OperationNode, OperationSnapshot } from "../types";
import { OperationDiagram } from "./OperationDiagram";
import { OperationInspector } from "./OperationInspector";

type OperationMode =
  | "all"
  | "distribution"
  | "wind"
  | "solar"
  | "bess"
  | "charger"
  | "weather";

const MODES: Array<{
  value: OperationMode;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "distribution", label: "Distribution" },
  { value: "wind", label: "Wind Turbine" },
  { value: "solar", label: "PV Solar" },
  { value: "bess", label: "BESS" },
  { value: "charger", label: "Charger" },
  { value: "weather", label: "Weather" },
];

export function OperationsView() {
  const [mode, setMode] = useState<OperationMode>("all");
  const [nodeOverride, setNodeOverride] = useState<{
    stationId: string;
    nodeId: string;
  } | null>(null);
  const [controlsUnlocked, setControlsUnlocked] = useState<{
    stationId: string;
    value: boolean;
  } | null>(null);
  const { selectedOperationStationId, setSelectedOperationStationId } =
    useAppChromeStore();

  const { data: stations = [] } = useOperationStations();
  const selectedStationId =
    stations.find((station) => station.id === selectedOperationStationId)?.id ??
    stations[0]?.id ??
    null;

  const {
    data: snapshot,
    isLoading: snapshotLoading,
    error,
  } = useOperationSnapshot(selectedStationId);

  const { data: controlContext } = useStationControl(
    OPERATIONS_CONTROLS_ENABLED ? selectedStationId : null
  );

  const scopedNodeId =
    nodeOverride?.stationId === selectedStationId ? nodeOverride.nodeId : null;
  const selectedNodeId = snapshot?.nodes.some((node) => node.id === scopedNodeId)
    ? scopedNodeId
    : snapshot?.nodes[0]?.id ?? null;
  const selectedNode =
    snapshot?.nodes.find((node) => node.id === selectedNodeId) ?? null;

  const focusGroups = modeToFocusGroups(mode);
  const canUnlock = OPERATIONS_CONTROLS_ENABLED && !snapshot?.readOnly;
  const controlsAreUnlocked =
    controlsUnlocked?.stationId === selectedStationId && controlsUnlocked.value;
  const activeStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Diagram canvas */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="flex h-full w-full items-center justify-center px-6 py-4 2xl:pr-[470px]">
          {error ? (
            <ErrorPanel
              message={
                error instanceof Error
                  ? error.message
                  : "Unable to load operations."
              }
            />
          ) : snapshot ? (
            <OperationDiagram
              snapshot={snapshot}
              selectedNodeId={selectedNodeId}
              focusGroups={focusGroups}
              mode={mode}
              modeOptions={MODES}
              onModeChange={(value) => setMode(value as OperationMode)}
              stationId={selectedStationId}
              stationOptions={stations}
              onStationChange={setSelectedOperationStationId}
              canUnlockControls={canUnlock}
              controlsUnlocked={controlsAreUnlocked}
              onControlsUnlockedChange={(value) =>
                selectedStationId
                  ? setControlsUnlocked({ stationId: selectedStationId, value })
                  : null
              }
              onSelect={(nodeId) =>
                selectedStationId
                  ? setNodeOverride({ stationId: selectedStationId, nodeId })
                  : null
              }
            />
          ) : (
            <LoadingCanvas />
          )}
        </div>
      </div>

      {/* Floating KPI strip */}
      {snapshot && snapshot.kpis.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[calc(100vw-2rem)] -translate-x-1/2 2xl:left-[calc(50%-220px)]">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card/85 p-2 backdrop-blur-sm">
            {snapshot.kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="min-w-32 shrink-0 rounded-xl border border-border bg-background/40 px-3 py-2"
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
                  {kpi.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {kpi.value}
                  {kpi.unit ? (
                    <span className="ml-1 text-xs font-medium text-slate-300">
                      {kpi.unit}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating inspector */}
      <div className="absolute bottom-4 left-2 right-2 top-4 z-30 md:left-auto md:right-4 md:w-[430px] md:max-w-[calc(100vw-2rem)]">
        <OperationInspector
          snapshot={snapshot ?? fallbackSnapshot(activeStation)}
          node={selectedNode}
          controlsEnabled={OPERATIONS_CONTROLS_ENABLED}
          controlsUnlocked={controlsAreUnlocked}
          controlContext={controlContext}
          loading={snapshotLoading}
        />
      </div>
    </div>
  );
}

function LoadingCanvas() {
  return (
    <div className="flex h-[640px] w-full max-w-3xl items-center justify-center rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
      <div className="text-sm text-muted-foreground">Loading operations…</div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex h-[640px] w-full max-w-3xl items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive-foreground">
      {message}
    </div>
  );
}

function modeToFocusGroups(mode: OperationMode): OperationNode["group"][] | null {
  if (mode === "distribution") return ["power", "grid", "aux"];
  if (mode === "wind") return ["wind"];
  if (mode === "solar") return ["solar"];
  if (mode === "bess") return ["bess"];
  if (mode === "charger") return ["charger"];
  if (mode === "weather") return ["weather"];
  return null;
}

function fallbackSnapshot(
  station?: { id: string; apiId: number; name: string; code?: string }
): OperationSnapshot {
  const now = new Date().toISOString();
  return {
    station: station ?? {
      id: "vinuni-station-01",
      apiId: 1,
      name: "VinUni Station 01",
    },
    selectedStationId: station?.id ?? "vinuni-station-01",
    readOnly: true,
    latestTimestamp: now,
    status: {
      station: "Loading",
      stationTone: "warning",
      grid: "Loading",
      gridTone: "warning",
      plc: "Loading",
      plcTone: "warning",
      timestamp: now,
    },
    kpis: [],
    nodes: [],
  };
}
