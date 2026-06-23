/**
 * DTO mirrors of the legacy web-energy API (Vue app
 * `web-energy/client/src/services/energy/types.ts`).
 *
 * Numeric/data fields only — the `*WithUnit` string variants from the Vue app
 * are intentionally dropped; the new UI formats units itself.
 */

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

// ---- Energy payload shapes ------------------------------------------------

export interface MultimeterDto {
  ia?: number;
  ib?: number;
  ic?: number;
  ua?: number;
  ub?: number;
  uc?: number;
  p?: number;
  q?: number;
  f?: number;
  imp?: number;
  exp?: number;
  net?: number;
}

export interface CommonEnergyData {
  deviceId?: number;
  status?: boolean;
  multimeter?: MultimeterDto;
}

export interface PlcDto {
  status?: boolean;
  communication?: boolean;
}

export interface AtsDto {
  name?: string;
  status?: boolean;
}

export interface SystemCommonDto extends CommonEnergyData {
  auxiliaryStatus?: boolean;
  plc?: PlcDto;
  switchs?: AtsDto[];
}

export type GridDto = CommonEnergyData;

export type WindDto = CommonEnergyData;

export interface SolarStringDto {
  voltage?: number;
  current?: number;
}

export interface SolarDto extends CommonEnergyData {
  runMode?: number;
  voltage?: number;
  current?: number;
  power?: number;
  reactivePower?: number;
  temperature?: number;
  /** Cumulative energy yield counter. */
  energyTimeStamps?: number;
  stringList?: SolarStringDto[];
}

/**
 * BESS — the operationally meaningful numeric subset of the legacy ~200-field
 * DTO (the alarm/fault flag bitfields are omitted; add as needed).
 */
export interface BessDto extends CommonEnergyData {
  outputType?: number;
  runningState?: number;
  powerFlowStatus?: number;
  // Battery
  batteryVoltage?: number;
  batteryCurrent?: number;
  batteryPower?: number;
  /** State of charge, %. */
  batteryLevel?: number;
  /** State of health, %. */
  batteryStateOfHealthy?: number;
  batteryTemperature?: number;
  batteryCapacity?: number;
  insideTemperature?: number;
  // Power flow
  totalActivePower?: number;
  loadPower?: number;
  exportPower?: number;
  reactivePower?: number;
  powerFactor?: number;
  gridFrequency?: number;
  // Energy counters
  dailyOutputEnergy?: number;
  totalOutputEnergy?: number;
  dailyChargeEnergy?: number;
  totalChargeEnergy?: number;
  dailyBatteryDischargeEnergy?: number;
  totalBatteryDischargeEnergy?: number;
  dailyPvGeneration?: number;
  totalPvGeneration?: number;
  dailyImportEnergy?: number;
  totalImportEnergy?: number;
}

export interface ChargerDto extends CommonEnergyData {
  deviceName?: string;
  chargerPointId?: string;
  chargeStatus?: string;
  ocppStatus?: number;
  ocppVersion?: string;
  allowPublic?: boolean;
  limitHours?: number;
  lastActiveAt?: string;
  totalChargedTime?: number;
  totalChargeEnergy?: number;
  lastChargedTime?: number;
  lastChargeEnergy?: number;
  chargeDurationTime?: number;
  chargeEstimationTime?: number;
  chargeStateOfBattery?: number;
}

export interface EnergyDataResponseDto {
  latestTime?: string;
  latestOnline?: string;
  system?: SystemCommonDto;
  grid?: GridDto;
  wind?: WindDto;
  solar?: SolarDto;
  bess?: BessDto[];
  charger?: ChargerDto[];
}

/**
 * Latest-signal record. The backend returns the readable shape
 * `{ time, stationId, isStationHealthy, deviceType, data }`; some call sites
 * also see the energy fields flattened onto the record, so both are allowed.
 */
export interface SignalLatestDto extends EnergyDataResponseDto {
  stationId?: number;
  isStationHealthy?: boolean;
  deviceType?: EnumDeviceType;
  time?: string;
  data?: EnergyDataResponseDto;
}

export interface SignalHistoryDto {
  time?: string;
  stationId?: number;
  isStationHealthy?: boolean;
  deviceType?: EnumDeviceType;
  data?: EnergyDataResponseDto;
}
