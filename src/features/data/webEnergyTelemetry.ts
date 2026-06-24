import { API_ENDPOINTS } from "@/constants/api";
import { webEnergyClient } from "./webEnergyClient";
import {
  EnumDeviceType,
  type DeviceResponseDto,
  type SignalLatestDto,
  type StationResponseDto,
} from "./types/webEnergy";

export const OPERATION_LATEST_DEVICE_TYPES = [
  EnumDeviceType.CommonSystem,
  EnumDeviceType.Grid,
  EnumDeviceType.Solar,
  EnumDeviceType.Bess,
  EnumDeviceType.Charger,
] as const;

export async function fetchStationList(): Promise<StationResponseDto[]> {
  const res = await webEnergyClient.get<StationResponseDto>(
    `${API_ENDPOINTS.webEnergy.stationList}?Status=1`
  );
  return res.list ?? [];
}

export async function fetchStation(
  apiId: number
): Promise<StationResponseDto | undefined> {
  const res = await webEnergyClient.get<StationResponseDto>(
    API_ENDPOINTS.webEnergy.stationDetails(apiId)
  );
  return res.data;
}

export async function fetchDevices(apiId: number): Promise<DeviceResponseDto[]> {
  const res = await webEnergyClient.get<DeviceResponseDto>(
    API_ENDPOINTS.webEnergy.devicesOfStation(apiId)
  );
  return res.list ?? [];
}

/** Latest signal across operational telemetry domains. */
export async function fetchLatestSignal(
  apiId: number,
  deviceTypes: readonly EnumDeviceType[] = OPERATION_LATEST_DEVICE_TYPES
): Promise<SignalLatestDto | undefined> {
  const params = new URLSearchParams({
    stationId: String(apiId),
    isCheckTime: "true",
  });
  for (const deviceType of deviceTypes) {
    params.append("deviceType", String(deviceType));
  }

  const res = await webEnergyClient.get<SignalLatestDto>(
    `${API_ENDPOINTS.webEnergy.signalLatest}?${params.toString()}`
  );
  return res.data;
}
