/**
 * Device-control request/response DTOs, ported from the legacy web-energy app
 * (`web-energy/client/src/services/energy/types.ts`). These are write
 * operations that actuate real hardware — every POST is confirmed in the UI.
 *
 * GET returns the current config (the `*ResponseDto`); POST applies a change
 * (the `*RequestDto`). Every request carries `stationId` + `deviceId`.
 */

export interface CommonControlRequestDto {
  stationId: number;
  deviceId: number;
}

// ---- Grid MCCB ------------------------------------------------------------

export interface ControlGridRequestDto extends CommonControlRequestDto {
  isOpen: boolean;
}

export interface ControlGridResponseDto {
  isOpen: boolean;
}

// ---- Solar ----------------------------------------------------------------

export interface ControlSolarRequestDto extends CommonControlRequestDto {
  isControlModeOn?: boolean;
  isLimit?: boolean;
  limitSetting?: number;
}

export interface ControlSolarResponseDto {
  isControlModeOn: boolean;
  isLimit: boolean;
  limitSetting?: number;
}

// ---- BESS -----------------------------------------------------------------

export interface ControlBessRequestDto extends CommonControlRequestDto {
  isControlModeOn?: boolean;
  doConfig?: number;
  loadControlMode?: number;
  p1StartHour?: number;
  p1StartMinute?: number;
  p1EndHour?: number;
  p1EndMinute?: number;
  p2StartHour?: number;
  p2StartMinute?: number;
  p2EndHour?: number;
  p2EndMinute?: number;
  isOnOffMode?: boolean;
  poStartHour?: number;
  poStartMinute?: number;
  poEndHour?: number;
  poEndMinute?: number;
  optimizedPower?: number;
  emsModeSelection?: number;
  chargeDischargeCmd?: number;
  chargeDischargePower?: number;
  maxSoc?: number;
  minSoc?: number;
  exportPowerLimitation?: number;
  isOffGridOption?: boolean;
  externalEmsHeartbeat?: number;
  isMeterCommDetection?: boolean;
  isExportPowerLimitation?: boolean;
  reservedSOC?: number;
  chargeCutoffVoltage?: number;
  maxChargingPower?: number;
  maxDischargingPower?: number;
  chargingDischargingPower?: number;
  feedInLimitation?: number;
  isForcedCharging?: boolean;
  fcValidTime?: number;
  fcStartTime1Hour?: number;
  fcStartTime1Minute?: number;
  fcEndTime1Hour?: number;
  fcEndTime1Minute?: number;
  fcTargetSoc1?: number;
  fcStartTime2Hour?: number;
  fcStartTime2Minute?: number;
  fcEndTime2Hour?: number;
  fcEndTime2Minute?: number;
  fcTargetSoc2?: number;
  loadRatedPower?: number;
}

export interface ControlBessResponseDto {
  isControlModeOn: boolean;
  emsModeSelection: number;
  chargeDischargeCmd: number;
  chargeDischargePower?: number;
  maxSoc: number;
  minSoc: number;
  reservedSOC: number;
  maxChargingPower: number;
  maxDischargingPower: number;
  isForcedCharging: boolean;
  loadRatedPower: number;
  [key: string]: number | boolean | undefined;
}

// ---- Charge / discharge schedule -----------------------------------------
// Three charge windows + three discharge windows (hour/minute pairs).

export interface ChargeDischargeRequestDto extends CommonControlRequestDto {
  chargeStartHour1: number;
  chargeStartMinute1: number;
  chargeEndHour1: number;
  chargeEndMinute1: number;
  chargeStartHour2: number;
  chargeStartMinute2: number;
  chargeEndHour2: number;
  chargeEndMinute2: number;
  chargeStartHour3: number;
  chargeStartMinute3: number;
  chargeEndHour3: number;
  chargeEndMinute3: number;
  dischargeStartHour1: number;
  dischargeStartMinute1: number;
  dischargeEndHour1: number;
  dischargeEndMinute1: number;
  dischargeStartHour2: number;
  dischargeStartMinute2: number;
  dischargeEndHour2: number;
  dischargeEndMinute2: number;
  dischargeStartHour3: number;
  dischargeStartMinute3: number;
  dischargeEndHour3: number;
  dischargeEndMinute3: number;
}

export type ChargeDischargeResponseDto = Omit<
  ChargeDischargeRequestDto,
  "stationId" | "deviceId"
>;
