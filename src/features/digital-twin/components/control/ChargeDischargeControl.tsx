"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ApplyButton,
  ControlCard,
  EMPTY_WINDOW,
  TimeWindowRow,
  type TimeWindow,
} from "./ControlField";
import { useChargeDischargeControl } from "../../hooks/useDeviceControl";
import type {
  ChargeDischargeRequestDto,
  ChargeDischargeResponseDto,
} from "@/features/data/types/webEnergyControl";

interface ChargeDischargeControlProps {
  stationId: number;
  deviceId: number;
}

type Kind = "charge" | "discharge";

function readWindow(
  data: ChargeDischargeResponseDto,
  kind: Kind,
  index: 1 | 2 | 3
): TimeWindow {
  const key = (part: string) =>
    `${kind}${part}${index}` as keyof ChargeDischargeResponseDto;
  return {
    startH: data[key("StartHour")] ?? 0,
    startM: data[key("StartMinute")] ?? 0,
    endH: data[key("EndHour")] ?? 0,
    endM: data[key("EndMinute")] ?? 0,
  };
}

function writeWindows(
  windows: TimeWindow[],
  kind: Kind
): Record<string, number> {
  return windows.reduce<Record<string, number>>((acc, window, i) => {
    const index = i + 1;
    acc[`${kind}StartHour${index}`] = window.startH;
    acc[`${kind}StartMinute${index}`] = window.startM;
    acc[`${kind}EndHour${index}`] = window.endH;
    acc[`${kind}EndMinute${index}`] = window.endM;
    return acc;
  }, {});
}

const THREE_EMPTY: TimeWindow[] = [EMPTY_WINDOW, EMPTY_WINDOW, EMPTY_WINDOW];

export function ChargeDischargeControl({
  stationId,
  deviceId,
}: ChargeDischargeControlProps) {
  const { config, mutation } = useChargeDischargeControl(stationId, deviceId);
  const [charge, setCharge] = useState<TimeWindow[]>(THREE_EMPTY);
  const [discharge, setDischarge] = useState<TimeWindow[]>(THREE_EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [seeded, setSeeded] = useState<unknown>(undefined);

  // Seed the form from the fetched config (adjust-state-during-render pattern).
  if (config.data && config.data !== seeded) {
    const data = config.data;
    setSeeded(data);
    setCharge([
      readWindow(data, "charge", 1),
      readWindow(data, "charge", 2),
      readWindow(data, "charge", 3),
    ]);
    setDischarge([
      readWindow(data, "discharge", 1),
      readWindow(data, "discharge", 2),
      readWindow(data, "discharge", 3),
    ]);
  }

  const updateAt = (
    setter: typeof setCharge,
    index: number,
    value: TimeWindow
  ) =>
    setter((prev) => prev.map((window, i) => (i === index ? value : window)));

  const apply = () => {
    const dto = {
      stationId,
      deviceId,
      ...writeWindows(charge, "charge"),
      ...writeWindows(discharge, "discharge"),
    } as unknown as ChargeDischargeRequestDto;
    mutation.mutate(dto, { onSuccess: () => setConfirm(false) });
  };

  return (
    <ControlCard title="Charge / Discharge Schedule" loading={config.isLoading}>
      <p className="text-xs font-medium text-foreground">Charge windows</p>
      {charge.map((window, index) => (
        <TimeWindowRow
          key={`charge-${index}`}
          label={`Charge ${index + 1}`}
          value={window}
          onChange={(value) => updateAt(setCharge, index, value)}
          disabled={mutation.isPending}
        />
      ))}
      <p className="pt-1 text-xs font-medium text-foreground">Discharge windows</p>
      {discharge.map((window, index) => (
        <TimeWindowRow
          key={`discharge-${index}`}
          label={`Discharge ${index + 1}`}
          value={window}
          onChange={(value) => updateAt(setDischarge, index, value)}
          disabled={mutation.isPending}
        />
      ))}
      <ApplyButton onClick={() => setConfirm(true)} pending={mutation.isPending} />

      <ConfirmDialog
        open={confirm}
        title="Apply charge/discharge schedule?"
        description={`Write the charge/discharge time windows to the BESS on station ${stationId}.`}
        loading={mutation.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={apply}
      />
    </ControlCard>
  );
}
