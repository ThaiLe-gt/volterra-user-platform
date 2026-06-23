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
import { useBessControl } from "../../hooks/useDeviceControl";
import type { ControlBessRequestDto } from "@/features/data/types/webEnergyControl";

interface BessControlProps {
  stationId: number;
  deviceId: number;
}

interface BessForm {
  isControlModeOn: boolean;
  chargeDischargeCmd: number;
  chargeDischargePower: number;
  maxSoc: number;
  minSoc: number;
  reservedSOC: number;
  maxChargingPower: number;
  maxDischargingPower: number;
}

const EMPTY: BessForm = {
  isControlModeOn: false,
  chargeDischargeCmd: 0,
  chargeDischargePower: 0,
  maxSoc: 100,
  minSoc: 10,
  reservedSOC: 10,
  maxChargingPower: 0,
  maxDischargingPower: 0,
};

export function BessControl({ stationId, deviceId }: BessControlProps) {
  const { config, mutation } = useBessControl(stationId, deviceId);
  const [form, setForm] = useState<BessForm>(EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [seeded, setSeeded] = useState<unknown>(undefined);

  // Seed the form from the fetched config (adjust-state-during-render pattern).
  if (config.data && config.data !== seeded) {
    const data = config.data;
    setSeeded(data);
    setForm({
      isControlModeOn: data.isControlModeOn,
      chargeDischargeCmd: data.chargeDischargeCmd,
      chargeDischargePower: data.chargeDischargePower ?? 0,
      maxSoc: data.maxSoc,
      minSoc: data.minSoc,
      reservedSOC: data.reservedSOC,
      maxChargingPower: data.maxChargingPower,
      maxDischargingPower: data.maxDischargingPower,
    });
  }

  const set = <K extends keyof BessForm>(key: K, value: BessForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const apply = () => {
    const dto: ControlBessRequestDto = {
      stationId,
      deviceId,
      isControlModeOn: form.isControlModeOn,
      chargeDischargeCmd: clampInt(form.chargeDischargeCmd, 0, 2),
      chargeDischargePower: form.chargeDischargePower,
      maxSoc: clampInt(form.maxSoc, 0, 100),
      minSoc: clampInt(form.minSoc, 0, 100),
      reservedSOC: clampInt(form.reservedSOC, 0, 100),
      maxChargingPower: form.maxChargingPower,
      maxDischargingPower: form.maxDischargingPower,
    };
    mutation.mutate(dto, { onSuccess: () => setConfirm(false) });
  };

  return (
    <ControlCard title="BESS" loading={config.isLoading}>
      <SwitchField
        label="Control mode"
        id={`bess-mode-${deviceId}`}
        checked={form.isControlModeOn}
        onChange={(value) => set("isControlModeOn", value)}
        disabled={mutation.isPending}
      />
      <NumberField
        label="Cmd (0 idle · 1 charge · 2 discharge)"
        id={`bess-cmd-${deviceId}`}
        value={form.chargeDischargeCmd}
        onChange={(value) => set("chargeDischargeCmd", value)}
        min={0}
        max={2}
        step={1}
        disabled={mutation.isPending}
      />
      <NumberField
        label="Charge/discharge power"
        id={`bess-power-${deviceId}`}
        value={form.chargeDischargePower}
        onChange={(value) => set("chargeDischargePower", value)}
        step={100}
        unit="W"
        disabled={mutation.isPending}
      />
      <NumberField
        label="Max SoC"
        id={`bess-maxsoc-${deviceId}`}
        value={form.maxSoc}
        onChange={(value) => set("maxSoc", value)}
        min={0}
        max={100}
        step={1}
        unit="%"
        disabled={mutation.isPending}
      />
      <NumberField
        label="Min SoC"
        id={`bess-minsoc-${deviceId}`}
        value={form.minSoc}
        onChange={(value) => set("minSoc", value)}
        min={0}
        max={100}
        step={1}
        unit="%"
        disabled={mutation.isPending}
      />
      <NumberField
        label="Reserved SoC"
        id={`bess-reserved-${deviceId}`}
        value={form.reservedSOC}
        onChange={(value) => set("reservedSOC", value)}
        min={0}
        max={100}
        step={1}
        unit="%"
        disabled={mutation.isPending}
      />
      <NumberField
        label="Max charging power"
        id={`bess-maxchg-${deviceId}`}
        value={form.maxChargingPower}
        onChange={(value) => set("maxChargingPower", value)}
        step={100}
        unit="W"
        disabled={mutation.isPending}
      />
      <NumberField
        label="Max discharging power"
        id={`bess-maxdis-${deviceId}`}
        value={form.maxDischargingPower}
        onChange={(value) => set("maxDischargingPower", value)}
        step={100}
        unit="W"
        disabled={mutation.isPending}
      />
      <ApplyButton onClick={() => setConfirm(true)} pending={mutation.isPending} />

      <ConfirmDialog
        open={confirm}
        title="Apply BESS control?"
        description={`Update battery control parameters on station ${stationId}. This actuates the BESS inverter.`}
        loading={mutation.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={apply}
      />
    </ControlCard>
  );
}
