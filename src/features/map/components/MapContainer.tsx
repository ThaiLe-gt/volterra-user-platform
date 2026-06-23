"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MAP_STYLE,
  MAPBOX_TOKEN,
  hasMapboxToken,
} from "../lib/mapboxConfig";

export type LightPreset = "dawn" | "day" | "dusk" | "night";

export interface StandardConfig {
  lightPreset: LightPreset;
  show3dObjects: boolean;
  showPlaceLabels?: boolean;
  showPointOfInterestLabels?: boolean;
  showRoadLabels?: boolean;
  showTransitLabels?: boolean;
  showTrees?: boolean;
}

interface MapContainerProps {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** Style URL; defaults to the dark portfolio basemap. */
  mapStyle?: string;
  /** Mapbox Standard config applied on style load. */
  standardConfig?: StandardConfig;
  /** Called once the style has finished loading (safe point to add layers). */
  onMapReady?: (map: mapboxgl.Map) => void;
  className?: string;
}

/**
 * Owns a raw mapbox-gl Map instance (not react-map-gl) so callers can add a
 * Three.js CustomLayerInterface to the same WebGL context.
 */
export function MapContainer({
  longitude,
  latitude,
  zoom,
  pitch = 0,
  bearing = 0,
  mapStyle = MAP_STYLE,
  standardConfig,
  onMapReady,
  className,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onReadyRef = useRef(onMapReady);
  const standardConfigRef = useRef(standardConfig);

  useEffect(() => {
    onReadyRef.current = onMapReady;
    standardConfigRef.current = standardConfig;
  }, [onMapReady, standardConfig]);

  useEffect(() => {
    if (!containerRef.current || !hasMapboxToken()) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      config: standardConfig
        ? { basemap: getBasemapConfig(standardConfig) }
        : undefined,
      center: [longitude, latitude],
      zoom,
      pitch,
      bearing,
      antialias: true,
      attributionControl: false,
      logoPosition: "bottom-left",
    });
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );
    mapRef.current = map;

    map.on("style.load", () => {
      const cfg = standardConfigRef.current;
      if (cfg) {
        applyStandardConfig(map, cfg);
      }
      onReadyRef.current?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Re-create only on token change; camera updates handled imperatively below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasMapboxToken()) {
    return <MapTokenMissing className={className} />;
  }

  return <div ref={containerRef} className={className} />;
}

const TREE_LAYER_PATTERN = /(^|[-_\s:./])trees?($|[-_\s:./])/i;

const BASEMAP_CONFIG_KEYS = [
  "lightPreset",
  "show3dObjects",
  "show3dTrees",
  "showPlaceLabels",
  "showPointOfInterestLabels",
  "showRoadLabels",
  "showTransitLabels",
] as const;

function getBasemapConfig(
  config: StandardConfig
): Partial<Record<(typeof BASEMAP_CONFIG_KEYS)[number], boolean | LightPreset>> {
  return {
    lightPreset: config.lightPreset,
    show3dObjects: config.show3dObjects,
    show3dTrees: config.showTrees,
    showPlaceLabels: config.showPlaceLabels,
    showPointOfInterestLabels: config.showPointOfInterestLabels,
    showRoadLabels: config.showRoadLabels,
    showTransitLabels: config.showTransitLabels,
  };
}

function applyStandardConfig(map: mapboxgl.Map, config: StandardConfig): void {
  const basemapConfig = getBasemapConfig(config);
  for (const key of BASEMAP_CONFIG_KEYS) {
    const value = basemapConfig[key];
    if (value === undefined) continue;
    try {
      map.setConfigProperty("basemap", key, value);
    } catch {
      // non-Standard styles don't expose basemap config; ignore
    }
  }
  if (config.showTrees !== undefined) {
    setTreeLayersVisibility(map, config.showTrees);
  }
}

export function setTreeLayersVisibility(
  map: mapboxgl.Map,
  visible: boolean
): void {
  const layers = map.getStyle().layers ?? [];
  for (const layer of layers) {
    if (!isTreeLayer(layer)) continue;
    try {
      map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
    } catch {
      // Imported Standard basemap internals can change; skip unavailable layers.
    }
  }
}

function isTreeLayer(layer: mapboxgl.AnyLayer): boolean {
  return [
    layer.id,
    getLayerField(layer, "source"),
    getLayerField(layer, "source-layer"),
    getLayerMetadata(layer),
  ].some((value) => TREE_LAYER_PATTERN.test(value));
}

function getLayerField(layer: mapboxgl.AnyLayer, key: string): string {
  const value = (layer as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function getLayerMetadata(layer: mapboxgl.AnyLayer): string {
  const metadata = (layer as Record<string, unknown>).metadata;
  if (!metadata) return "";
  if (typeof metadata === "string") return metadata;
  try {
    return JSON.stringify(metadata);
  } catch {
    return "";
  }
}

function MapTokenMissing({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-card text-center ${className ?? ""}`}
    >
      <div className="max-w-sm space-y-2 p-6">
        <p className="text-sm font-medium text-foreground">Mapbox token missing</p>
        <p className="text-xs text-muted-foreground">
          Set <code className="text-foreground">NEXT_PUBLIC_MAPBOX_TOKEN</code> in
          <code className="text-foreground"> .env.local</code> with a public
          (pk.*) token to render the map.
        </p>
      </div>
    </div>
  );
}
