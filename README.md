# Volterra Web — Digital Twin & Portfolio

Next.js (App Router, React 19, TS, Tailwind v4, shadcn, TanStack Query) frontend
for the Volterra energy-asset platform. Two dashboards:

- **Portfolio** (`/portfolio`) — dark Mapbox map of sites with status markers,
  KPI cards, asset-type filters, and a per-site detail panel.
- **Digital Twin** (`/digital-twin/[siteId]`) — a vanilla Three.js BIM building
  rendered as an overlay on a geolocated **Mapbox Standard** map, with a
  BIM-structure tree, floating KPI cards, an asset detail panel, and a live map
  style switcher.

Default location is the **VinUni campus** (`lat 20.989925, lng 105.945421`).

## Setup

```bash
cp .env.example .env.local   # then fill NEXT_PUBLIC_MAPBOX_TOKEN (public pk.* token)
npm install
npm run dev                  # http://localhost:3000
```

Without a Mapbox token the portfolio map shows a hint, and the digital twin
falls back to a standalone orbit-controls 3D canvas (no map).

### Environment variables

| Variable                   | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public `pk.*` Mapbox token (required for maps) |
| `NEXT_PUBLIC_DATA_SOURCE`  | `mock` (default) · `webenergy` · `gateway`     |
| `NEXT_PUBLIC_API_BASE_URL` | Public API fallback for local development      |
| `WEB_ENERGY_API_BASE_URL`  | Server-side base URL for the web-energy proxy  |
| `NEXT_PUBLIC_MODE`         | `dev` enables React Query devtools             |

## Data source (phase 1 → phase 2)

The UI depends only on the domain model (`src/features/data/types/domain.ts`)
behind a repository (`src/features/data/repository`). Switch the source with one
env var — no component changes:

| `NEXT_PUBLIC_DATA_SOURCE` | Source                                                     |
| ------------------------- | ---------------------------------------------------------- |
| `mock` (default)          | Local JSON fixtures (`src/features/data/fixtures/*.json`)  |
| `webenergy`               | Legacy web-energy REST API via the Next.js proxy (phase 1) |
| `gateway`                 | Phase-2 Java gateway (`:8080`, stubbed)                    |

Realtime mini-charts use TanStack Query polling now
(`REALTIME_POLL_INTERVAL_MS`); a STOMP source (`@stomp/stompjs`) is stubbed for
phase 2 behind `RealtimeSource`.

### Connecting to the existing backend (phase 1)

1. Set `NEXT_PUBLIC_DATA_SOURCE=webenergy` and `WEB_ENERGY_API_BASE_URL=https://vinuni-api.eagle-p.vn`.
2. Restart `npm run dev` → `/portfolio` redirects to `/login`.
3. Log in with a real web-energy account (no test credentials ship in the repo).

The browser only ever calls the same-origin proxy `/api/web-energy/*`
(`src/app/api/web-energy/[...path]/route.ts`), which forwards to the backend
server-side — this avoids browser CORS and keeps the API origin off the client.
`webEnergyClient` attaches the Bearer token and unwraps the `CommonResponseDto`
envelope. Phase 1 reads the configured VinUni stations from
`public/config/vinuni-site.json`, fetches matching station records from
`/station/list` and `/station/{id}`, then builds the portfolio, BIM tree, asset
details, and KPI cards from the live API where data exists.

## Editing mock data (no rebuild)

Mock content lives in JSON so it can be tweaked without touching code:

- `src/features/data/fixtures/sites.json` — portfolio sites (id, status, geo, KPIs)
- `src/features/data/fixtures/portfolioKpi.json` — top KPI bar
- `src/features/data/fixtures/bimTree.json` — BIM structure tree
- `src/features/data/fixtures/twinKpi.json` — floating twin KPI cards
- `src/features/data/fixtures/assetDetails.json` — asset detail panels

## Site and BIM config

VinUni site/station identity is runtime-configured in
**`public/config/vinuni-site.json`**. Use `apiId` to connect a UI station to a
backend station id, and `modelUrl` to assign a different 3D model per site or
station:

```json
{
  "site": {
    "id": "site-vinuni",
    "name": "VinUni",
    "code": "VINUNI",
    "geo": { "lng": 105.94542061064729, "lat": 20.989925395134943 },
    "modelUrl": null
  },
  "stations": [
    {
      "id": "vinuni-station-01",
      "apiId": 1,
      "name": "VinUni Station 01",
      "geo": { "lng": 105.94524061064729, "lat": 20.990055395134943 },
      "modelUrl": "/models/station-1.glb",
      "transform": {
        "scale": 0.1,
        "rotation": { "x": 0, "y": 0, "z": 15 },
        "offset": { "x": 0, "y": 0, "z": 0 }
      }
    }
  ]
}
```

Station/site `transform` values are local model adjustments in a Z-up config
space. The `geo` point places the model, `offset.z` moves it upward in meters,
`rotation.z` is yaw around the vertical axis, and `scale` resizes only that
model. The global `bim.json` rotation/scale still wraps the whole BIM scene for
Mapbox placement.

The map/BIM scene placement is set in **`public/config/bim.json`** (loaded at
runtime by `src/features/bim-viewer/lib/bimConfig.ts`) — edit and reload, no
rebuild:

```json
{
  "origin": { "lng": 105.94542061064729, "lat": 20.989925395134943 },
  "altitude": 0,
  "scale": 1,
  "rotation": { "x": 90, "y": 0, "z": 0 },
  "camera": { "zoom": 18.5, "groundAngle": 15, "bearing": -146.8 }
}
```

`rotation` is in degrees (`x:90` converts glTF Y-up → Mercator Z-up; `y` is
heading); `scale` multiplies real-world meters. Drop GLB/GLTF files under
`public/models` (see `public/models/README.md`); a procedural placeholder is
used for any site or station without a configured model.
For the camera, use `groundAngle` for the visual angle above the ground/horizon.
For example, `groundAngle: 15` maps to Mapbox `pitch: 75`.

## Map style

- **Portfolio**: dark basemap (`mapbox://styles/mapbox/dark-v11`).
- **Digital Twin**: Mapbox **Standard** (`mapbox://styles/mapbox/standard`) with
  a live switcher (`MapStyleSwitcher`) for `lightPreset` (Dawn/Day/Dusk/Night =
  light↔dark) and a 3D-buildings toggle, applied via `map.setConfigProperty`.
  The BIM custom layer uses `slot:"top"` so the model renders above the basemap's
  3D buildings.

## Key modules

- `src/features/bim-viewer/lib/mapboxThreeLayer.ts` — Mapbox `CustomLayerInterface`
  - camera-matrix sync (the Three-on-Mapbox overlay).
- `src/features/bim-viewer/lib/sceneManager.ts` — imperative Three.js scene.
- `src/features/bim-viewer/lib/bimConfig.ts` — runtime BIM placement config.
- `src/features/map/components/{MapContainer,MapStyleSwitcher}.tsx` — raw
  mapbox-gl host + Standard style controls.
- `src/features/data/repository` — swappable data layer + adapters.
- `src/app/api/web-energy/[...path]/route.ts` — phase-1 backend proxy.

## Scripts

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm run lint    # eslint
```
