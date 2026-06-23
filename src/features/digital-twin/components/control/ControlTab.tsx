"use client";

import { useStationControl } from "../../hooks/useDeviceControl";
import { GridControl } from "./GridControl";
import { SolarControl } from "./SolarControl";
import { BessControl } from "./BessControl";
import { ChargeDischargeControl } from "./ChargeDischargeControl";

interface ControlTabProps {
  assetId: string;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Device-control surface for a station. Only the present devices render. */
export function ControlTab({ assetId }: ControlTabProps) {
  const { data: ctx, isLoading } = useStationControl(assetId);

  if (isLoading) return <Hint>Loading control context…</Hint>;
  if (!ctx) return <Hint>This asset has no controllable station.</Hint>;

  const { stationId, gridDeviceId, solarDeviceId, bessDeviceId } = ctx;
  const hasAny =
    gridDeviceId !== undefined ||
    solarDeviceId !== undefined ||
    bessDeviceId !== undefined;

  if (!hasAny) return <Hint>No controllable devices found for this station.</Hint>;

  return (
    <div className="space-y-3">
      {gridDeviceId !== undefined && (
        <GridControl stationId={stationId} deviceId={gridDeviceId} />
      )}
      {solarDeviceId !== undefined && (
        <SolarControl stationId={stationId} deviceId={solarDeviceId} />
      )}
      {bessDeviceId !== undefined && (
        <BessControl stationId={stationId} deviceId={bessDeviceId} />
      )}
      {bessDeviceId !== undefined && (
        <ChargeDischargeControl stationId={stationId} deviceId={bessDeviceId} />
      )}
    </div>
  );
}
