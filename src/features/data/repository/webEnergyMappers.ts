/**
 * Pure mapping helpers between legacy web-energy energy payloads and the new
 * domain model. No I/O — kept separate so webEnergyRepository.ts stays small.
 */

import type { TimeSeriesPoint } from "../types/domain";
import type {
  EnergyDataResponseDto,
  SignalHistoryDto,
  SignalLatestDto,
} from "../types/webEnergy";

/** Chartable telemetry domains exposed by the UI. */
export type Metric = "power" | "solar" | "bess" | "charger";

export const METRICS: Metric[] = ["power", "solar", "bess", "charger"];

export const METRIC_LABEL: Record<Metric, string> = {
  power: "Power",
  solar: "Solar",
  bess: "BESS",
  charger: "Charger",
};

type AnyEnergyInput =
  | SignalLatestDto
  | SignalHistoryDto
  | EnergyDataResponseDto
  | undefined;

/** Unwrap either the `{ data }` envelope or a flattened energy record. */
export function payload(input: AnyEnergyInput): EnergyDataResponseDto {
  if (!input) return {};
  if ("data" in input && input.data) return input.data;
  return input as EnergyDataResponseDto;
}

export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// ---- latest-signal metric extractors --------------------------------------

/** System active power in watts (common-system multimeter `p`). */
export function systemPowerWatts(input: AnyEnergyInput): number {
  return payload(input).system?.multimeter?.p ?? 0;
}

export function systemPowerKw(input: AnyEnergyInput): number {
  return round(systemPowerWatts(input) / 1000);
}

export function systemPowerMw(input: AnyEnergyInput): number {
  return round(systemPowerWatts(input) / 1_000_000);
}

export function solarGenerationKw(input: AnyEnergyInput): number {
  return round((payload(input).solar?.power ?? 0) / 1000);
}

/** Average battery state-of-charge (%) across BESS units. */
export function bessSoc(input: AnyEnergyInput): number {
  const list = payload(input).bess ?? [];
  if (!list.length) return 0;
  const sum = list.reduce((acc, unit) => acc + (unit.batteryLevel ?? 0), 0);
  return round(sum / list.length, 1);
}

/** Aggregate battery power (kW) across BESS units. */
export function bessPowerKw(input: AnyEnergyInput): number {
  const list = payload(input).bess ?? [];
  const total = list.reduce((acc, unit) => acc + (unit.batteryPower ?? 0), 0);
  return round(total / 1000);
}

/** Percent of chargers currently in a non-available (in-use) state. */
export function chargerUtilization(input: AnyEnergyInput): number {
  const chargers = payload(input).charger ?? [];
  if (!chargers.length) return 0;
  const active = chargers.filter((charger) => {
    const state = charger.chargeStatus?.toLowerCase() ?? "";
    return state.length > 0 && !state.includes("available");
  }).length;
  return Math.round((active / chargers.length) * 100);
}

/** Total charge energy delivered (kWh); falls back to last-session energy. */
export function chargerEnergy(input: AnyEnergyInput): number {
  const chargers = payload(input).charger ?? [];
  const total = chargers.reduce(
    (acc, charger) =>
      acc + (charger.totalChargeEnergy ?? charger.lastChargeEnergy ?? 0),
    0
  );
  return round(total > 1000 ? total / 1000 : total);
}

export function latestTimestamp(input: AnyEnergyInput): string | undefined {
  const data = payload(input);
  const time = (input as SignalLatestDto | undefined)?.time;
  return time ?? data.latestTime ?? data.latestOnline;
}

// ---- history → time series ------------------------------------------------

/** Selector that turns one history payload into a chartable scalar. */
export type EnergySelector = (data: EnergyDataResponseDto) => number;

export const SELECTOR: Record<Metric, EnergySelector> = {
  power: (d) => round((d.system?.multimeter?.p ?? 0) / 1000),
  solar: (d) => round((d.solar?.power ?? 0) / 1000),
  bess: (d) => {
    const list = d.bess ?? [];
    if (!list.length) return 0;
    return round(
      list.reduce((acc, unit) => acc + (unit.batteryLevel ?? 0), 0) /
        list.length,
      1
    );
  },
  charger: (d) =>
    round(
      (d.charger ?? []).reduce(
        (acc, charger) =>
          acc + (charger.totalChargeEnergy ?? charger.lastChargeEnergy ?? 0),
        0
      )
    ),
};

/** Map a list of history records to sorted, de-noised time-series points. */
export function historyToSeries(
  list: SignalHistoryDto[],
  selector: EnergySelector,
  series: string
): TimeSeriesPoint[] {
  return list
    .map((point) => {
      const data = payload(point);
      const time = point.time ?? data.latestTime ?? data.latestOnline;
      return {
        t: time ? Date.parse(time) : 0,
        value: selector(data),
        series,
      };
    })
    .filter((point) => Number.isFinite(point.t) && point.t > 0)
    .sort((a, b) => a.t - b.t);
}

// ---- time range -----------------------------------------------------------

const RANGE_HOURS: Record<string, number> = {
  "1h": 1,
  "5h": 5,
  "6h": 6,
  "1d": 24,
  "7d": 24 * 7,
};

/** Map a UI range token to an ISO start/end window (default 24h). */
export function rangeToWindow(range: string): { start: Date; end: Date } {
  const end = new Date();
  const hours = RANGE_HOURS[range] ?? 24;
  const start = new Date(end.getTime() - hours * 3_600_000);
  return { start, end };
}
