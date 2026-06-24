import type { OperationSnapshot, OperationStationOption } from "../types";

const ASSET_BASE = "/operation-assets/energy";

export const MOCK_OPERATION_STATIONS: OperationStationOption[] = [
  {
    id: "vinuni-station-01",
    apiId: 1,
    code: "VINUNI-ST01",
    name: "Tram 1 Vin University",
  },
  {
    id: "vinuni-station-02",
    apiId: 2,
    code: "VINUNI-ST02",
    name: "Tram 2 Vin University",
  },
];

export function buildMockOperationSnapshot(
  stationId = MOCK_OPERATION_STATIONS[0]?.id
): OperationSnapshot {
  const station =
    MOCK_OPERATION_STATIONS.find((item) => item.id === stationId) ??
    MOCK_OPERATION_STATIONS[0];
  const now = new Date().toISOString();
  const stationTwo = station.id.endsWith("02");

  return {
    station,
    selectedStationId: station.id,
    latestTimestamp: now,
    readOnly: true,
    status: {
      station: "Normal",
      stationTone: "online",
      grid: "ON",
      gridTone: "online",
      plc: "Working",
      plcTone: "online",
      timestamp: now,
    },
    kpis: [
      { label: "PUE", value: stationTwo ? "1.24" : "1.30" },
      { label: "IT Load", value: stationTwo ? "1,366" : "1,425", unit: "kW" },
      { label: "Grid Draw", value: stationTwo ? "1,582" : "1,701", unit: "kW" },
      { label: "BESS Out", value: stationTwo ? "98" : "144", unit: "kW" },
    ],
    nodes: [
      {
        id: "grid-card",
        kind: "grid",
        visual: "card",
        group: "power",
        label: "Grid",
        status: "online",
        stateLabel: "Generating",
        metric: "power",
        controlType: "grid",
        position: { x: 44, y: 76 },
        image: `${ASSET_BASE}/eMccb.png`,
        telemetry: [
          { label: "Active power", value: stationTwo ? "0.13" : "0.71", unit: "kW" },
          { label: "Reactive power", value: stationTwo ? "-0.34" : "-0.25", unit: "kVar" },
          { label: "Voltage", value: stationTwo ? "395" : "397", unit: "V" },
        ],
      },
      {
        id: "solar-card",
        kind: "solar",
        visual: "card",
        group: "solar",
        label: "PV Solar",
        status: "online",
        stateLabel: "Generating",
        metric: "solar",
        controlType: "solar",
        position: { x: 44, y: 216 },
        image: `${ASSET_BASE}/ePvSolar.png`,
        telemetry: [
          { label: "Active power", value: stationTwo ? "-0.03" : "-0.01", unit: "kW" },
          { label: "Reactive power", value: "0", unit: "Var" },
          { label: "Power", value: "0", unit: "W" },
        ],
      },
      {
        id: "bess-1-card",
        kind: "bess",
        visual: "card",
        group: "bess",
        label: "BESS N.01",
        status: "online",
        stateLabel: "Generating",
        metric: "bess",
        controlType: "bess",
        position: { x: 44, y: 356 },
        image: `${ASSET_BASE}/eBess.png`,
        telemetry: [
          { label: "Active power", value: stationTwo ? "0.15" : "0.08", unit: "kW" },
          { label: "Battery percent", value: stationTwo ? "76.5" : "78", unit: "%" },
          { label: "Voltage", value: stationTwo ? "436.6" : "584.8", unit: "V" },
        ],
      },
      {
        id: "bess-2-card",
        kind: "bess",
        visual: "card",
        group: "bess",
        label: "BESS N.02",
        status: stationTwo ? "offline" : "online",
        stateLabel: stationTwo ? "Unavailable" : "Generating",
        metric: "bess",
        controlType: "bess",
        muted: stationTwo,
        position: { x: 44, y: 496 },
        image: `${ASSET_BASE}/eBess.png`,
        telemetry: [
          { label: "Active power", value: "0.08", unit: "kW" },
          { label: "Battery percent", value: "100", unit: "%" },
          { label: "Voltage", value: "589.2", unit: "V" },
        ],
      },
      breakerNode("grid-mccb", "Grid MCCB", 356, 82, "grid"),
      breakerNode("solar-mccb", "Solar MCCB", 356, 222, "solar"),
      breakerNode("bess-1-mccb", "BESS 1 MCCB", 356, 362, "bess"),
      breakerNode("bess-2-mccb", "BESS 2 MCCB", 356, 502, "bess", stationTwo),
      breakerNode("plc-mccb", "PLC MCCB", 356, 622, "aux"),
      atsNode("ats-1", "ATS 01", 520, 245),
      atsNode("ats-2", "ATS 02", 520, 460),
      breakerNode("charger-1-mccb", "Charger 1 AC MCCB", 716, 106, "charger"),
      breakerNode("charger-2-mccb", "Charger 2 AC MCCB", 716, 256, "charger"),
      breakerNode("charger-3-mccb", "Charger 3 AC MCCB", 716, 406, "charger", stationTwo),
      breakerNode("charger-4-mccb", "Charger 4 DC MCCB", 716, 556, "charger"),
      chargerNode("charger-1", "Charger 1 AC", 914, 72, true, false),
      chargerNode("charger-2", "Charger 2 AC", 914, 222, true, false),
      chargerNode("charger-3", "Charger 3 AC", 914, 372, !stationTwo, stationTwo),
      chargerNode("charger-4", "Charger 4 DC", 914, 522, true, true),
      {
        id: "plc-aux",
        kind: "plc",
        visual: "pill",
        group: "aux",
        label: "PLC & Auxiliaries",
        status: "online",
        stateLabel: "ON",
        position: { x: 222, y: 646 },
        telemetry: [
          { label: "PLC status", value: "Working" },
          { label: "Auxiliary bus", value: "ON" },
        ],
      },
    ],
  };
}

function breakerNode(
  id: string,
  label: string,
  x: number,
  y: number,
  group: "grid" | "solar" | "bess" | "charger" | "aux",
  muted = false
) {
  return {
    id,
    kind: "breaker" as const,
    visual: "breaker" as const,
    group,
    label,
    status: muted ? ("offline" as const) : ("online" as const),
    stateLabel: muted ? "OFF" : "ON",
    controlType:
      group === "grid" || group === "solar" || group === "bess" ? group : undefined,
    muted,
    position: { x, y },
    image: `${ASSET_BASE}/eMccb.png`,
    telemetry: [
      { label: "Breaker", value: muted ? "OFF" : "ON" },
      { label: "Command", value: muted ? "Locked" : "Ready" },
    ],
  };
}

function atsNode(id: string, label: string, x: number, y: number) {
  return {
    id,
    kind: "ats" as const,
    visual: "ats" as const,
    group: "bess" as const,
    label,
    status: "online" as const,
    stateLabel: "ON",
    controlType: "schedule" as const,
    position: { x, y },
    telemetry: [
      { label: "Primary path", value: "Closed" },
      { label: "Schedule", value: "Enabled" },
    ],
  };
}

function chargerNode(
  id: string,
  label: string,
  x: number,
  y: number,
  available: boolean,
  dc: boolean
) {
  return {
    id,
    kind: "charger" as const,
    visual: "card" as const,
    group: "charger" as const,
    label,
    status: available ? ("online" as const) : ("offline" as const),
    stateLabel: available ? "Available" : "Unavailable",
    metric: "charger" as const,
    muted: !available,
    position: { x, y },
    image: `${ASSET_BASE}/chargerModel/${dc ? "Kern-C230" : "AC006T222"}.png`,
    telemetry: [
      { label: "Active power", value: available ? "0.02" : "0.01", unit: "kW" },
      { label: "Reactive power", value: available ? "-0.04" : "-0.02", unit: "kVar" },
      { label: "Last active", value: "23/06/2026 22:31" },
    ],
  };
}
