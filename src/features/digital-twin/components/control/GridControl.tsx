"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApplyButton, ControlCard, SwitchField } from "./ControlField";
import { useGridControl } from "../../hooks/useDeviceControl";

interface GridControlProps {
  stationId: number;
  deviceId: number;
}

export function GridControl({ stationId, deviceId }: GridControlProps) {
  const { config, mutation } = useGridControl(stationId, deviceId);
  const [isOpen, setIsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [seeded, setSeeded] = useState<unknown>(undefined);

  // Seed the form from the fetched config (adjust-state-during-render pattern).
  if (config.data && config.data !== seeded) {
    setSeeded(config.data);
    setIsOpen(config.data.isOpen);
  }

  return (
    <ControlCard title="Grid MCCB" loading={config.isLoading}>
      <SwitchField
        label="Breaker open"
        id={`grid-open-${deviceId}`}
        checked={isOpen}
        onChange={setIsOpen}
        disabled={mutation.isPending}
      />
      <ApplyButton onClick={() => setConfirm(true)} pending={mutation.isPending} />

      <ConfirmDialog
        open={confirm}
        title="Apply grid control?"
        description={`Set the grid MCCB to ${isOpen ? "OPEN" : "CLOSED"} on station ${stationId}.`}
        loading={mutation.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          mutation.mutate(
            { stationId, deviceId, isOpen },
            { onSuccess: () => setConfirm(false) }
          )
        }
      />
    </ControlCard>
  );
}
