/**
 * Device-control service for the legacy web-energy backend. GET reads the
 * current config, POST applies a change. All calls go through the same-origin
 * proxy via `webEnergyClient`. Mutating — callers confirm before applying.
 */

import { API_ENDPOINTS } from "@/constants/api";
import { webEnergyClient } from "../webEnergyClient";
import { EnumDeviceType, type DeviceResponseDto } from "../types/webEnergy";
import type {
  ChargeDischargeRequestDto,
  ChargeDischargeResponseDto,
  ControlBessRequestDto,
  ControlBessResponseDto,
  ControlGridRequestDto,
  ControlGridResponseDto,
  ControlSolarRequestDto,
  ControlSolarResponseDto,
} from "../types/webEnergyControl";

const ENDPOINTS = API_ENDPOINTS.webEnergy;

function configUrl(path: string, stationId: number, deviceId: number): string {
  const params = new URLSearchParams({
    stationId: String(stationId),
    deviceId: String(deviceId),
  });
  return `${path}?${params.toString()}`;
}

async function getConfig<T>(
  path: string,
  stationId: number,
  deviceId: number
): Promise<T | undefined> {
  const res = await webEnergyClient.get<T>(configUrl(path, stationId, deviceId));
  return res.data;
}

async function apply<T>(path: string, dto: unknown): Promise<T | undefined> {
  const res = await webEnergyClient.post<T>(path, dto);
  return res.data;
}

/** Device-type ids for a station, used to target control endpoints. */
export interface StationDeviceIds {
  gridDeviceId?: number;
  solarDeviceId?: number;
  bessDeviceId?: number;
}

export async function fetchStationDeviceIds(
  stationId: number
): Promise<StationDeviceIds> {
  const res = await webEnergyClient.get<DeviceResponseDto>(
    ENDPOINTS.devicesOfStation(stationId)
  );
  const devices = res.list ?? [];
  const byType = (type: EnumDeviceType) =>
    devices.find((device) => device.deviceType === type)?.id;
  return {
    gridDeviceId: byType(EnumDeviceType.Grid),
    solarDeviceId: byType(EnumDeviceType.Solar),
    bessDeviceId: byType(EnumDeviceType.Bess),
  };
}

export const webEnergyControl = {
  fetchStationDeviceIds,

  getGridConfig: (stationId: number, deviceId: number) =>
    getConfig<ControlGridResponseDto>(ENDPOINTS.controlGrid, stationId, deviceId),
  setGrid: (dto: ControlGridRequestDto) =>
    apply<ControlGridResponseDto>(ENDPOINTS.controlGrid, dto),

  getSolarConfig: (stationId: number, deviceId: number) =>
    getConfig<ControlSolarResponseDto>(ENDPOINTS.controlSolar, stationId, deviceId),
  setSolar: (dto: ControlSolarRequestDto) =>
    apply<ControlSolarResponseDto>(ENDPOINTS.controlSolar, dto),

  getBessConfig: (stationId: number, deviceId: number) =>
    getConfig<ControlBessResponseDto>(ENDPOINTS.controlBess, stationId, deviceId),
  setBess: (dto: ControlBessRequestDto) =>
    apply<ControlBessResponseDto>(ENDPOINTS.controlBess, dto),

  getChargeDischargeConfig: (stationId: number, deviceId: number) =>
    getConfig<ChargeDischargeResponseDto>(
      ENDPOINTS.controlChargeDischarge,
      stationId,
      deviceId
    ),
  setChargeDischarge: (dto: ChargeDischargeRequestDto) =>
    apply<ChargeDischargeResponseDto>(ENDPOINTS.controlChargeDischarge, dto),
};
