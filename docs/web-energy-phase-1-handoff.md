# Web-Energy Phase 1 Handoff

Last reviewed: 2026-06-23

This document records the phase 1 frontend migration that connects the new
Next.js app to the legacy web-energy backend for live telemetry, history, and
hardware controls. It is intended as the phase 2 backend rewrite handoff: the
new backend should preserve the frontend contract described here, then the app
can switch from `webenergy` to `gateway`.

## Current State

- The active data source is `NEXT_PUBLIC_DATA_SOURCE=webenergy`.
- The legacy backend origin is proxied through `/api/web-energy/*`.
- `.env.local` contains `WEB_ENERGY_API_BASE_URL=https://vinuni-api.eagle-p.vn`.
- `public/config/vinuni-site.json` maps the app/BIM stations to backend station
  ids `1` and `2`.
- The phase 2 repository, `src/features/data/repository/gatewayRepository.ts`,
  is still a mock fallback stub.

The domain model and repository interface remain the app contract:

- `src/features/data/types/domain.ts`
- `src/features/data/repository/types.ts`

Phase 1 adds web-energy mapping behind that contract and keeps mutating hardware
control calls outside the swappable repository.

## File Inventory

Tracked changes:

| File | Purpose |
| --- | --- |
| `src/constants/api.ts` | Adds the four web-energy control endpoints. |
| `src/features/data/types/webEnergy.ts` | Expands legacy telemetry DTOs for system, solar, BESS, and chargers. |
| `src/features/data/repository/webEnergyRepository.ts` | Routes metric/range historical calls, expands latest-signal coverage, enriches KPIs/details. |
| `src/features/portfolio/hooks/usePortfolioData.ts` | Enables realtime polling for portfolio sites and KPI bar. |
| `src/features/portfolio/components/SiteDetailPanel.tsx` | Adds per-chart metric selector. |
| `src/features/digital-twin/components/AssetDetailPanel.tsx` | Adds per-chart metric selector and web-energy-only Controls tab. |

New files:

| File | Purpose |
| --- | --- |
| `src/features/data/repository/webEnergyMappers.ts` | Pure metric extractors, history-to-series mapper, and range window helper. |
| `src/features/data/types/webEnergyControl.ts` | Control request/response DTOs for grid, solar, BESS, and charge/discharge schedule. |
| `src/features/data/control/webEnergyControl.ts` | Web-energy control service over the existing same-origin proxy. |
| `src/features/digital-twin/hooks/useDeviceControl.ts` | React Query hooks for control context, GET config, POST apply. |
| `src/features/digital-twin/components/control/ControlTab.tsx` | Station-level control host. |
| `src/features/digital-twin/components/control/GridControl.tsx` | Grid MCCB control form. |
| `src/features/digital-twin/components/control/SolarControl.tsx` | Solar control/curtailment form. |
| `src/features/digital-twin/components/control/BessControl.tsx` | BESS charge/discharge parameter form. |
| `src/features/digital-twin/components/control/ChargeDischargeControl.tsx` | Three charge and three discharge schedule windows. |
| `src/features/digital-twin/components/control/ControlField.tsx` | Shared form rows, numeric/time inputs, clamp helpers. |
| `src/components/common/MetricToggle.tsx` | Shared Power/Solar/BESS/Charger chart metric selector. |
| `src/components/ui/confirm-dialog.tsx` | Confirmation modal used before each hardware-control POST. |
| `src/components/ui/switch.tsx` | Minimal accessible switch used by control forms. |

## Telemetry Contract Used By The Frontend

### Latest signal

Phase 1 calls:

```text
GET /api/web-energy/signal/latest
  ?stationId=<stationId>
  &isCheckTime=true
  &deviceType=0
  &deviceType=3
  &deviceType=4
  &deviceType=6
```

Device type ids are from `EnumDeviceType`:

| Id | Type |
| --- | --- |
| `0` | CommonSystem |
| `3` | Solar |
| `4` | Bess |
| `6` | Charger |

The frontend accepts both backend shapes:

- Envelope record: `{ time, stationId, isStationHealthy, data: {...} }`
- Flattened record: `{ time, stationId, isStationHealthy, system, solar, bess, charger }`

Fields consumed by phase 1:

| Domain | Fields used |
| --- | --- |
| System | `system.multimeter.p`, `system.multimeter.imp`, `system.multimeter.exp`, `system.multimeter.net` |
| Solar | `solar.power`, `solar.energyTimeStamps`, `solar.current`, `solar.voltage`, `solar.temperature`, `solar.runMode`, `solar.stringList` |
| BESS | `bess[].batteryLevel`, `bess[].batteryPower`, `bess[].dailyOutputEnergy`, `bess[].totalOutputEnergy`, `bess[].batteryStateOfHealthy`, `bess[].batteryTemperature`, `bess[].runningState` |
| Charger | `charger[].chargeStatus`, `charger[].totalChargeEnergy`, `charger[].lastChargeEnergy`, `charger[].chargeDurationTime`, `charger[].lastActiveAt`, `charger[].chargeStateOfBattery` |

Derived KPI/detail values:

| UI value | Mapper |
| --- | --- |
| Total Power | Sum of `system.multimeter.p`, displayed as MW for cards and kW for details. |
| Solar Generation | `solar.power / 1000`, displayed as kW. |
| Battery SoC | Average of `bess[].batteryLevel`, displayed as percent. |
| Battery Power | Sum of `bess[].batteryPower / 1000`, displayed as kW. |
| EV Utilization | Percent of chargers whose `chargeStatus` is non-empty and not `available`. |
| Charge Energy | Sum of `charger[].totalChargeEnergy` with fallback to `lastChargeEnergy`. |

### Historical signal

Phase 1 exposes four chart metrics:

| Metric token | Legacy endpoint | Series selector |
| --- | --- | --- |
| `power` | `/signal/list-system-energy` | `data.system.multimeter.p / 1000` |
| `solar` | `/signal/list-solar` | `data.solar.power / 1000` |
| `bess` | `/signal/list-bess` | Average `data.bess[].batteryLevel` |
| `charger` | `/signal/list-charger` | Sum charger energy counters |

Every historical request sends:

```text
stationId=<stationId>
startTime=<ISO timestamp>
endTime=<ISO timestamp>
isTakeSampling=true
```

For `bess` and `charger`, phase 1 resolves the first matching device id from
`GET /station/<stationId>/devices` and adds:

```text
deviceId=<deviceId>
```

Supported range tokens in the UI/repository:

| Range | Window |
| --- | --- |
| `1h` | Last 1 hour |
| `5h` | Last 5 hours |
| `6h` | Last 6 hours |
| `1d` | Last 24 hours |
| `7d` | Last 7 days |

Unknown ranges default to `1d`.

Site-level charts aggregate all configured stations. BESS history is averaged;
other metrics are summed. Station/asset-level charts call only that station.

## Device Control Contract

Hardware controls are enabled only when:

```text
NEXT_PUBLIC_DATA_SOURCE=webenergy
```

Controls are rendered from `AssetDetailPanel` under the `Controls` tab. The tab
is station-scoped, resolves device ids through `/station/<stationId>/devices`,
and only renders panels for devices that exist.

All requests use the same-origin proxy and carry the stored bearer token through
`webEnergyClient`.

### Endpoints

| Control | GET current config | POST apply |
| --- | --- | --- |
| Grid MCCB | `/signal/control-grid?stationId=<id>&deviceId=<id>` | `/signal/control-grid` |
| Solar | `/signal/control-solar?stationId=<id>&deviceId=<id>` | `/signal/control-solar` |
| BESS | `/signal/control-bess?stationId=<id>&deviceId=<id>` | `/signal/control-bess` |
| Charge/discharge schedule | `/signal/control-charge-discharge?stationId=<id>&deviceId=<id>` | `/signal/control-charge-discharge` |

### POST payloads

Grid:

```ts
{
  stationId: number;
  deviceId: number;
  isOpen: boolean;
}
```

Solar:

```ts
{
  stationId: number;
  deviceId: number;
  isControlModeOn?: boolean;
  isLimit?: boolean;
  limitSetting?: number; // 0..100 in current UI
}
```

BESS currently posts the operational subset:

```ts
{
  stationId: number;
  deviceId: number;
  isControlModeOn?: boolean;
  chargeDischargeCmd?: number; // 0 idle, 1 charge, 2 discharge
  chargeDischargePower?: number;
  maxSoc?: number; // 0..100
  minSoc?: number; // 0..100
  reservedSOC?: number; // 0..100
  maxChargingPower?: number;
  maxDischargingPower?: number;
}
```

The DTO type also includes the wider legacy BESS config fields in
`ControlBessRequestDto`.

Charge/discharge schedule:

```ts
{
  stationId: number;
  deviceId: number;
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
```

Hours are clamped to `0..23`; minutes are clamped to `0..59`.

## Phase 2 Backend Rewrite Requirements

The preferred phase 2 target is to make `gatewayRepository.ts` a thin adapter
over backend endpoints that already return the domain model. That keeps UI code
unchanged and removes the legacy web-energy DTO/mapping layer from the frontend.

Minimum gateway endpoints needed by the current repository interface:

| Repository method | Backend endpoint recommendation | Response shape |
| --- | --- | --- |
| `getSites(filter)` | `GET /api/v1/portfolio/sites` | `Site[]` |
| `getPortfolioKpis()` | `GET /api/v1/portfolio/kpis` | `PortfolioKpi` |
| `getSiteDetail(siteId)` | `GET /api/v1/portfolio/sites/{siteId}` | `SiteDetail` |
| `getSiteTimeseries(siteId, metric, range)` | `GET /api/v1/portfolio/sites/{siteId}/series?metric=&range=` | `TimeSeriesPoint[]` |
| `getBimTree(siteId)` | `GET /api/v1/twin/{siteId}/tree` | `BimNode` |
| `getTwinKpis(siteId)` | `GET /api/v1/twin/{siteId}/kpis` | `TwinKpi` |
| `getAssetDetail(siteId, assetId)` | `GET /api/v1/twin/{siteId}/assets/{assetId}` | `AssetDetail` |
| `getAssetTimeseries(siteId, assetId, metric, range)` | `GET /api/v1/twin/{siteId}/assets/{assetId}/series?metric=&range=` | `TimeSeriesPoint[]` |

Additional gateway control endpoints should either mirror the web-energy
controls or expose safer domain-specific commands:

| Capability | Recommendation |
| --- | --- |
| Device discovery | `GET /api/v1/twin/{siteId}/assets/{assetId}/control-context` returns station id, device ids, supported control types, and authorization. |
| Read config | `GET /api/v1/control/{type}?stationId=&deviceId=` or nested asset-scoped equivalents. |
| Apply config | `POST /api/v1/control/{type}` with server-side validation, audit logging, and permission checks. |

Backend phase 2 should own:

- Authentication, token refresh, and authorization for control operations.
- Role/permission enforcement for hardware control writes.
- Unit normalization. Return domain values in the units declared by
  `domain.ts`, not raw device units.
- Historical aggregation across multiple devices per station, especially BESS
  and chargers.
- Sampling/downsampling behavior for large history windows.
- Explicit error responses for unavailable telemetry instead of requiring the
  frontend to infer empty charts.
- Audit trail for all control POSTs: user, station, device, payload, result,
  timestamp.

## Known Phase 1 Gaps And Assumptions

- Control mutations currently invalidate only their config query. Telemetry
  updates rely on existing polling rather than explicit KPI/chart invalidation.
- The control forms use local React state and clamp helpers. They do not yet use
  `react-hook-form` or `zod`.
- The confirmation dialog is custom rather than Radix.
- Client-side role gating for controls is not implemented beyond requiring the
  protected app session and `NEXT_PUBLIC_DATA_SOURCE=webenergy`.
- Historical BESS/charger calls pick the first matching backend device id for a
  station. Phase 2 should return station-level aggregates or expose explicit
  per-device selection.
- Charger energy unit semantics depend on the legacy backend counters. Phase 2
  should standardize `kWh` and `MWh` conversions server-side.
- Wind, weather, account/profile, OCPP management, and websocket realtime remain
  out of scope for phase 1.

## Verification

Completed locally on 2026-06-23:

```text
npm run lint
npm run build
```

Both commands passed. The production build used Next.js `16.2.9` with
Turbopack and generated the expected app routes, including:

- `/portfolio`
- `/digital-twin/[siteId]`
- `/api/web-energy/[...path]`
- `/login`

Manual live-backend verification still requires a real web-energy account:

- Login through `/login`.
- Confirm `/portfolio` markers and KPI bar poll live data.
- Confirm site and asset charts switch among `power`, `solar`, `bess`, and
  `charger` and hit the matching `/signal/list-*` endpoints.
- Confirm `/digital-twin/site-vinuni` renders Total Power, Solar Generation,
  EV Utilization, and Battery SoC.
- Confirm the Controls tab pre-fills config, requires confirmation, POSTs to
  the expected control endpoint, and shows success/error toasts.
