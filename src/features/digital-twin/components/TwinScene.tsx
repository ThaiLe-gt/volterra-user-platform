"use client";

import { useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { MapContainer, type StandardConfig } from "@/features/map/components/MapContainer";
import { MAP_STYLE_STANDARD, hasMapboxToken } from "@/features/map/lib/mapboxConfig";
import {
  BimViewer,
  StandaloneBimCanvas,
  loadBimConfig,
  type BimConfig,
} from "@/features/bim-viewer";
import { type TwinSelectionTarget, useTwinStore } from "../store/twinStore";
import { TwinBottomControls } from "./TwinBottomControls";

const STANDARD_CONFIG: StandardConfig = {
  lightPreset: "dawn",
  show3dObjects: true,
  showPlaceLabels: true,
  showPointOfInterestLabels: true,
  showRoadLabels: true,
  showTransitLabels: true,
  showTrees: false,
};

export function TwinScene() {
  const { selectedAssetId, selectedTarget, setSelectedAssetId } = useTwinStore();
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [config, setConfig] = useState<BimConfig | null>(null);

  useEffect(() => {
    let active = true;
    loadBimConfig().then((c) => {
      if (active) setConfig(c);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!map || !config || !selectedTarget) return;
    const camera = resolveFocusCamera(config, selectedTarget);
    if (!camera) return;
    map.flyTo({
      ...camera,
      duration: 900,
      essential: true,
    });
  }, [config, map, selectedTarget]);

  if (!config) return null;

  if (!hasMapboxToken()) {
    return (
      <div className="relative h-full w-full">
        <StandaloneBimCanvas
          config={config}
          selectedAssetId={selectedAssetId}
          selectedTarget={selectedTarget}
          onSelectAsset={setSelectedAssetId}
          className="h-full w-full"
        />
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <TwinBottomControls />
        </div>
      </div>
    );
  }

  const returnHome = () => {
    map?.flyTo({
      center: [config.origin.lng, config.origin.lat],
      zoom: config.camera.zoom,
      pitch: config.camera.pitch,
      bearing: config.camera.bearing,
      duration: 900,
      essential: true,
    });
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        longitude={config.origin.lng}
        latitude={config.origin.lat}
        zoom={config.camera.zoom}
        pitch={config.camera.pitch}
        bearing={config.camera.bearing}
        mapStyle={MAP_STYLE_STANDARD}
        standardConfig={STANDARD_CONFIG}
        onMapReady={setMap}
        className="h-full w-full"
      />
      {map && (
        <BimViewer
          map={map}
          config={config}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
        />
      )}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <TwinBottomControls
          map={map ?? undefined}
          initial={map ? STANDARD_CONFIG : undefined}
          onHome={returnHome}
        />
      </div>
    </div>
  );
}

function resolveFocusCamera(
  config: BimConfig,
  target: TwinSelectionTarget
):
  | {
      center: [number, number];
      zoom: number;
      pitch: number;
      bearing: number;
    }
  | null {
  if (!target) return null;

  if (target.kind === "site") {
    const geo = config.site.geo ?? config.origin;
    return {
      center: [geo.lng, geo.lat],
      zoom: config.camera.zoom,
      pitch: config.camera.pitch,
      bearing: config.camera.bearing,
    };
  }

  const station = config.stations.find((item) => item.id === target.id);
  if (!station) return null;

  return {
    center: [station.geo.lng, station.geo.lat],
    zoom: config.camera.zoom + 0.7,
    pitch: config.camera.pitch,
    bearing: config.camera.bearing,
  };
}
