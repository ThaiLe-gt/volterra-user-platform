"use client";

import { useState } from "react";
import {
  BatteryCharging,
  Bell,
  ChevronDown,
  Home,
  Info,
  Lock,
  LockOpen,
  Network,
  PlugZap,
  Sun,
} from "lucide-react";
import { StatusDot } from "@/components/common/StatusDot";
import { Switch } from "@/components/ui/switch";
import { useStationControl } from "@/features/digital-twin/hooks/useDeviceControl";
import { cn } from "@/lib/utils";
import {
  OPERATIONS_CONTROLS_ENABLED,
  useOperationSnapshot,
  useOperationStations,
} from "../hooks/useOperationData";
import type { OperationNode, OperationSnapshot } from "../types";
import { OperationDiagram } from "./OperationDiagram";
import { OperationInspector } from "./OperationInspector";

type OperationMode =
  | "dashboard"
  | "distribution"
  | "solar"
  | "bess"
  | "charger"
  | "introduction";

const MODES: Array<{
  value: OperationMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "dashboard", label: "Dashboard", icon: Home },
  { value: "distribution", label: "Distribution", icon: Network },
  { value: "solar", label: "PV Solar", icon: Sun },
  { value: "bess", label: "BESS", icon: BatteryCharging },
  { value: "charger", label: "Charger", icon: PlugZap },
  { value: "introduction", label: "Introduction", icon: Info },
];

export function OperationsView() {
  const [mode, setMode] = useState<OperationMode>("distribution");
  const [stationOverride, setStationOverride] = useState<string | null>(null);
  const [nodeOverride, setNodeOverride] = useState<string | null>(null);
  const [controlsUnlocked, setControlsUnlocked] = useState(false);

  const { data: stations = [], isLoading: stationsLoading } =
    useOperationStations();
  const selectedStationId = stationOverride ?? stations[0]?.id ?? null;

  const {
    data: snapshot,
    isLoading: snapshotLoading,
    error,
  } = useOperationSnapshot(selectedStationId);

  const { data: controlContext } = useStationControl(
    OPERATIONS_CONTROLS_ENABLED ? selectedStationId : null
  );

  const selectedNodeId = snapshot?.nodes.some((node) => node.id === nodeOverride)
    ? nodeOverride
    : snapshot?.nodes[0]?.id ?? null;
  const selectedNode =
    snapshot?.nodes.find((node) => node.id === selectedNodeId) ?? null;

  const focusGroup = modeToFocusGroup(mode);
  const canUnlock = OPERATIONS_CONTROLS_ENABLED && !snapshot?.readOnly;
  const activeStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Diagram canvas */}
      <div className="absolute inset-0 overflow-auto">
        <div className="flex min-h-full min-w-full items-center justify-center px-6 pb-28 pt-24 2xl:pr-[440px]">
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
              focusGroup={focusGroup}
              onSelect={setNodeOverride}
            />
          ) : (
            <LoadingCanvas />
          )}
        </div>
      </div>

      {/* Floating header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Operations
            </h1>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-online" />
              single-line
            </span>
          </div>

          <div className="relative">
            <label className="sr-only" htmlFor="operation-station">
              Station
            </label>
            <select
              id="operation-station"
              value={selectedStationId ?? ""}
              disabled={stationsLoading || stations.length === 0}
              onChange={(event) => {
                setStationOverride(event.target.value);
                setNodeOverride(null);
                setControlsUnlocked(false);
              }}
              className="h-10 appearance-none rounded-xl border border-border bg-card/85 pl-3 pr-9 text-sm font-medium text-foreground backdrop-blur-sm outline-none transition-colors hover:border-primary/50 focus:border-primary"
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {snapshot && (
            <div className="hidden items-center gap-1 rounded-xl border border-border bg-card/85 px-1 py-1 backdrop-blur-sm lg:flex">
              <StatusPill
                label="Station"
                value={snapshot.status.station}
                tone={snapshot.status.stationTone}
              />
              <StatusPill
                label="Grid"
                value={snapshot.status.grid}
                tone={snapshot.status.gridTone}
              />
              <StatusPill
                label="PLC"
                value={snapshot.status.plc}
                tone={snapshot.status.plcTone}
              />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/85 px-3 py-2 text-sm backdrop-blur-sm">
            {controlsUnlocked && canUnlock ? (
              <LockOpen className="size-4 text-online" />
            ) : (
              <Lock className="size-4 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {canUnlock ? "Controls" : "Read only"}
            </span>
            <Switch
              checked={controlsUnlocked}
              disabled={!canUnlock}
              onCheckedChange={setControlsUnlocked}
              aria-label="Unlock controls"
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

      {/* Floating mode toggle */}
      <div className="pointer-events-none absolute left-4 top-20 z-20 max-w-[calc(100vw-2rem)]">
        <div className="pointer-events-auto flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/85 p-1 backdrop-blur-sm">
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
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
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">
                  {kpi.value}
                  {kpi.unit ? (
                    <span className="ml-1 text-xs text-muted-foreground">
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
      <div className="absolute bottom-4 left-2 right-2 top-32 z-30 md:left-auto md:right-4 md:top-20 md:w-[400px] md:max-w-[calc(100vw-2rem)]">
        <OperationInspector
          snapshot={snapshot ?? fallbackSnapshot(activeStation)}
          node={selectedNode}
          controlsEnabled={OPERATIONS_CONTROLS_ENABLED}
          controlsUnlocked={controlsUnlocked}
          controlContext={controlContext}
          loading={snapshotLoading}
        />
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: OperationSnapshot["status"]["stationTone"];
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1">
      <StatusDot status={tone} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold",
          tone === "online" && "text-online",
          tone === "warning" && "text-warning",
          tone === "offline" && "text-offline"
        )}
      >
        {value}
      </span>
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

function modeToFocusGroup(mode: OperationMode): OperationNode["group"] | null {
  if (mode === "solar") return "solar";
  if (mode === "bess") return "bess";
  if (mode === "charger") return "charger";
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
