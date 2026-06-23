"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ApplyButton,
  ControlCard,
  NumberField,
  SwitchField,
  clampInt,
} from "./ControlField";
import { useSolarControl } from "../../hooks/useDeviceControl";

interface SolarControlProps {
  stationId: number;
  deviceId: number;
}

export function SolarControl({ stationId, deviceId }: SolarControlProps) {
  const { config, mutation } = useSolarControl(stationId, deviceId);
  const [controlModeOn, setControlModeOn] = useState(false);
  const [isLimit, setIsLimit] = useState(false);
  const [limitSetting, setLimitSetting] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [seeded, setSeeded] = useState<unknown>(undefined);

  // Seed the form from the fetched config (adjust-state-during-render pattern).
  if (config.data && config.data !== seeded) {
    setSeeded(config.data);
    setControlModeOn(config.data.isControlModeOn);
    setIsLimit(config.data.isLimit);
    setLimitSetting(config.data.limitSetting ?? 0);
  }

  const apply = () =>
    mutation.mutate(
      {
        stationId,
        deviceId,
        isControlModeOn: controlModeOn,
        isLimit,
        limitSetting: clampInt(limitSetting, 0, 100),
      },
      { onSuccess: () => setConfirm(false) }
    );

  return (
    <ControlCard title="Solar" loading={config.isLoading}>
      <SwitchField
        label="Control mode"
        id={`solar-mode-${deviceId}`}
        checked={controlModeOn}
        onChange={setControlModeOn}
        disabled={mutation.isPending}
      />
      <SwitchField
        label="Export limit"
        id={`solar-limit-${deviceId}`}
        checked={isLimit}
        onChange={setIsLimit}
        disabled={mutation.isPending}
      />
      <NumberField
        label="Limit setting"
        id={`solar-limit-value-${deviceId}`}
        value={limitSetting}
        onChange={setLimitSetting}
        min={0}
        max={100}
        step={1}
        unit="%"
        disabled={mutation.isPending || !isLimit}
      />
      <ApplyButton onClick={() => setConfirm(true)} pending={mutation.isPending} />

      <ConfirmDialog
        open={confirm}
        title="Apply solar control?"
        description={`Update solar curtailment on station ${stationId}: control ${controlModeOn ? "on" : "off"}, limit ${isLimit ? `${clampInt(limitSetting, 0, 100)}%` : "off"}.`}
        loading={mutation.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={apply}
      />
    </ControlCard>
  );
}
