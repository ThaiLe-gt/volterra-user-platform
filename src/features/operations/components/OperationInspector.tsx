"use client";

import { useState } from "react";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";
import type { ChartRange } from "@/components/common/RangeToggle";
import { StatusDot } from "@/components/common/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StationControlContext } from "@/features/digital-twin/hooks/useDeviceControl";
import { GridControl } from "@/features/digital-twin/components/control/GridControl";
import { SolarControl } from "@/features/digital-twin/components/control/SolarControl";
import { BessControl } from "@/features/digital-twin/components/control/BessControl";
import { ChargeDischargeControl } from "@/features/digital-twin/components/control/ChargeDischargeControl";
import { cn } from "@/lib/utils";
import { useOperationHistory } from "../hooks/useOperationHistory";
import type { OperationNode, OperationSnapshot } from "../types";
import { OperationHistoryCharts } from "./OperationHistoryCharts";

interface OperationInspectorProps {
  snapshot: OperationSnapshot;
  node: OperationNode | null;
  controlsEnabled: boolean;
  controlsUnlocked: boolean;
  controlContext?: StationControlContext | null;
  loading?: boolean;
}

export function OperationInspector({
  snapshot,
  node,
  controlsEnabled,
  controlsUnlocked,
  controlContext,
  loading = false,
}: OperationInspectorProps) {
  const [range, setRange] = useState<ChartRange>("5h");
  const { data: history, isLoading: historyLoading } = useOperationHistory(
    snapshot.station.apiId,
    node,
    range
  );
  const deviceId = resolveControlDeviceId(node, controlContext);
  const stationId = controlContext?.stationId ?? snapshot.station.apiId;

  if (!node) {
    return (
      <aside className="flex h-full flex-col items-center justify-center rounded-xl border border-border bg-card/95 p-6 text-center text-sm text-muted-foreground shadow-2xl backdrop-blur-md">
        {loading ? "Loading operations…" : "Select a node to inspect telemetry and controls."}
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {node.label}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent",
                  node.status === "online" && "bg-emerald-500/10 text-emerald-300",
                  node.status === "warning" && "bg-amber-500/10 text-amber-300",
                  node.status === "offline" && "bg-red-500/10 text-red-300"
                )}
              >
                <StatusDot status={node.status} />
                <span className="ml-1">{node.stateLabel}</span>
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {snapshot.station.name} / {formatDateTime(snapshot.latestTimestamp)}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {node.kind.toUpperCase()}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="telemetry" className="min-h-0 flex-1 gap-0">
        <TabsList className="mx-4 mt-4 grid h-9 w-auto grid-cols-2 bg-background/60">
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="telemetry" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <section className="grid grid-cols-2 gap-3">
                {node.telemetry.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div
                      className={cn(
                        "mt-1 truncate text-lg font-semibold text-foreground",
                        row.muted && "text-muted-foreground"
                      )}
                    >
                      {row.value}
                      {row.unit ? ` ${row.unit}` : ""}
                    </div>
                  </div>
                ))}
              </section>

              <OperationHistoryCharts
                data={history}
                loading={historyLoading}
                range={range}
                onRangeChange={setRange}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="controls" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <ControlStateBanner
                node={node}
                controlsEnabled={controlsEnabled}
                controlsUnlocked={controlsUnlocked}
                readOnly={snapshot.readOnly}
                deviceId={deviceId}
              />
              <ControlRenderer
                node={node}
                stationId={stationId}
                deviceId={deviceId}
                controlsEnabled={controlsEnabled}
                controlsUnlocked={controlsUnlocked}
                readOnly={snapshot.readOnly}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function ControlStateBanner({
  node,
  controlsEnabled,
  controlsUnlocked,
  readOnly,
  deviceId,
}: {
  node: OperationNode;
  controlsEnabled: boolean;
  controlsUnlocked: boolean;
  readOnly: boolean;
  deviceId?: number;
}) {
  const blocked =
    readOnly ||
    !controlsEnabled ||
    !node.controlType ||
    !controlsUnlocked ||
    deviceId === undefined;
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        blocked
          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        {blocked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
        Hardware Write Guard
      </div>
      <p className="mt-1 text-xs opacity-90">
        {readOnly || !controlsEnabled
          ? "This session is read-only. Controls are only available in web-energy mode."
          : !node.controlType
            ? "This node is telemetry-only in v1."
            : deviceId === undefined
              ? "No controllable backend device was found for this node."
              : !controlsUnlocked
                ? "Unlock controls in the page header before applying hardware changes."
                : "Controls are unlocked. Every apply action still requires confirmation."}
      </p>
    </div>
  );
}

function ControlRenderer({
  node,
  stationId,
  deviceId,
  controlsEnabled,
  controlsUnlocked,
  readOnly,
}: {
  node: OperationNode;
  stationId: number;
  deviceId?: number;
  controlsEnabled: boolean;
  controlsUnlocked: boolean;
  readOnly: boolean;
}) {
  if (readOnly || !controlsEnabled || !node.controlType) {
    return (
      <ReadOnlyControlCopy text="No write form is available for this node in the current mode." />
    );
  }
  if (!controlsUnlocked) {
    return <ReadOnlyControlCopy text="Unlock controls to reveal the apply form." />;
  }
  if (deviceId === undefined) {
    return <ReadOnlyControlCopy text="Backend device id is missing for this target." />;
  }

  if (node.controlType === "grid") {
    return <GridControl stationId={stationId} deviceId={deviceId} />;
  }
  if (node.controlType === "solar") {
    return <SolarControl stationId={stationId} deviceId={deviceId} />;
  }
  if (node.controlType === "bess") {
    return <BessControl stationId={stationId} deviceId={deviceId} />;
  }
  return <ChargeDischargeControl stationId={stationId} deviceId={deviceId} />;
}

function ReadOnlyControlCopy({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
      <div className="mb-2 flex items-center gap-2 text-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Guarded Operations
      </div>
      {text}
      <div className="mt-4">
        <Button size="sm" variant="outline" disabled>
          Apply unavailable
        </Button>
      </div>
    </div>
  );
}

function resolveControlDeviceId(
  node: OperationNode | null,
  context?: StationControlContext | null
): number | undefined {
  if (!node?.controlType) return undefined;
  if (node.deviceId !== undefined) return node.deviceId;
  if (node.controlType === "grid") return context?.gridDeviceId;
  if (node.controlType === "solar") return context?.solarDeviceId;
  return context?.bessDeviceId;
}

function formatDateTime(value?: string): string {
  if (!value) return "No timestamp";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}
