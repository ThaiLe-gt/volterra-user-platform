"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { loadVinuniSiteConfig } from "@/features/data/config/vinuniSiteConfig";
import {
  webEnergyControl,
  type StationDeviceIds,
} from "@/features/data/control/webEnergyControl";
import { WebEnergyError } from "@/features/data/webEnergyClient";

export interface StationControlContext extends StationDeviceIds {
  /** Backend web-energy station id. */
  stationId: number;
}

/** Resolve an app asset id to its backend station id + per-device ids. */
export function useStationControl(assetId: string | null) {
  return useQuery({
    queryKey: ["twin", "control", "context", assetId ?? ""],
    enabled: !!assetId,
    queryFn: async (): Promise<StationControlContext | null> => {
      const config = await loadVinuniSiteConfig();
      const station = config.stations.find((item) => item.id === assetId);
      if (!station) return null;
      const deviceIds = await webEnergyControl
        .fetchStationDeviceIds(station.apiId)
        .catch(() => ({}) as StationDeviceIds);
      return { stationId: station.apiId, ...deviceIds };
    },
  });
}

function controlErrorMessage(error: unknown, label: string): string {
  if (error instanceof WebEnergyError) return error.message;
  if (error instanceof Error) return error.message;
  return `${label} failed`;
}

interface UseControlOptions<TConfig, TRequest> {
  queryKey: QueryKey;
  label: string;
  enabled: boolean;
  getConfig: () => Promise<TConfig | undefined>;
  apply: (dto: TRequest) => Promise<unknown>;
}

/**
 * Shared GET-config + POST-apply pair for a control surface. Polling refreshes
 * KPIs, so a successful apply only re-reads this device's config.
 */
function useControl<TConfig, TRequest>({
  queryKey,
  label,
  enabled,
  getConfig,
  apply,
}: UseControlOptions<TConfig, TRequest>) {
  const queryClient = useQueryClient();
  const config = useQuery({
    queryKey,
    queryFn: getConfig,
    enabled,
  });
  const mutation = useMutation({
    mutationFn: apply,
    onSuccess: async () => {
      toast.success(`${label} applied`);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(controlErrorMessage(error, label)),
  });
  return { config, mutation };
}

export function useGridControl(stationId: number, deviceId?: number) {
  return useControl({
    queryKey: ["twin", "control", "grid", stationId, deviceId ?? null],
    label: "Grid control",
    enabled: deviceId !== undefined,
    getConfig: () => webEnergyControl.getGridConfig(stationId, deviceId!),
    apply: webEnergyControl.setGrid,
  });
}

export function useSolarControl(stationId: number, deviceId?: number) {
  return useControl({
    queryKey: ["twin", "control", "solar", stationId, deviceId ?? null],
    label: "Solar control",
    enabled: deviceId !== undefined,
    getConfig: () => webEnergyControl.getSolarConfig(stationId, deviceId!),
    apply: webEnergyControl.setSolar,
  });
}

export function useBessControl(stationId: number, deviceId?: number) {
  return useControl({
    queryKey: ["twin", "control", "bess", stationId, deviceId ?? null],
    label: "BESS control",
    enabled: deviceId !== undefined,
    getConfig: () => webEnergyControl.getBessConfig(stationId, deviceId!),
    apply: webEnergyControl.setBess,
  });
}

export function useChargeDischargeControl(stationId: number, deviceId?: number) {
  return useControl({
    queryKey: ["twin", "control", "charge-discharge", stationId, deviceId ?? null],
    label: "Schedule",
    enabled: deviceId !== undefined,
    getConfig: () =>
      webEnergyControl.getChargeDischargeConfig(stationId, deviceId!),
    apply: webEnergyControl.setChargeDischarge,
  });
}
