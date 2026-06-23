/** Minimal DTO mirrors of the legacy web-energy API (Vue app). */

export enum EnumDeviceType {
  CommonSystem = 0,
  Grid = 1,
  Wind = 2,
  Solar = 3,
  Bess = 4,
  Charger = 5,
  Weather = 6,
}

export interface CommonResponseDto<T> {
  isSuccess: boolean;
  message: string;
  data?: T;
  list?: T[];
  current?: T;
  pageInfo?: unknown;
}

export interface AuthUserData {
  userId: number;
  memberId: number;
  userName: string;
  fullName: string;
  email: string;
  accStatus: number;
}

export interface AuthResponseDto {
  accessToken: string;
  expiresHours: number;
  userData: AuthUserData;
}

export interface StationResponseDto {
  id: number;
  code: string;
  name: string;
  plcAddress?: string;
  plcPort?: number;
  plcSlaveId?: number;
  plcPollInterval?: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceResponseDto {
  id: number;
  stationId: number;
  deviceType: EnumDeviceType;
  deviceName: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MultimeterDto {
  p?: number;
  imp?: number;
  exp?: number;
  net?: number;
}

export interface SystemCommonDto {
  deviceId?: number;
  status?: boolean;
  multimeter?: MultimeterDto;
}

export interface ChargerDto {
  deviceId?: number;
  deviceName?: string;
  status?: boolean;
  chargerPointId?: string;
  chargeStatus?: string;
  ocppStatus?: number;
  totalChargeEnergy?: number;
  lastChargeEnergy?: number;
  chargeStateOfBattery?: number;
}

export interface BessDto {
  deviceId?: number;
  status?: boolean;
  batteryLevel?: number;
}

export interface EnergyDataResponseDto {
  latestTime?: string;
  latestOnline?: string;
  system?: SystemCommonDto;
  charger?: ChargerDto[];
  bess?: BessDto[];
}

export interface SignalLatestDto {
  stationId?: number;
  isStationHealthy?: boolean;
  time?: string;
  data?: EnergyDataResponseDto;
  latestTime?: string;
  latestOnline?: string;
  system?: SystemCommonDto;
  charger?: ChargerDto[];
  bess?: BessDto[];
}

export interface SignalHistoryDto {
  time?: string;
  stationId?: number;
  isStationHealthy?: boolean;
  data?: EnergyDataResponseDto;
}
