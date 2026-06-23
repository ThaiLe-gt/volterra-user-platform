"use client";

import { useEffect, useRef } from "react";
import Map, {
  AttributionControl,
  Marker,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Site } from "@/features/data/types/domain";
import {
  DEFAULT_CAMERA,
  MAPBOX_TOKEN,
  MAP_STYLE,
  hasMapboxToken,
} from "@/features/map/lib/mapboxConfig";
import { SiteMarker } from "./SiteMarker";

interface PortfolioMapProps {
  sites: Site[];
  selectedSiteId: string | null;
  onSelect: (site: Site) => void;
}

export function PortfolioMap({
  sites,
  selectedSiteId,
  onSelect,
}: PortfolioMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (!selectedSiteId) return;
    const site = sites.find((s) => s.id === selectedSiteId);
    if (site && mapRef.current) {
      mapRef.current.flyTo({
        center: [site.geo.lng, site.geo.lat],
        zoom: 17.5,
        duration: 1200,
      });
    }
  }, [selectedSiteId, sites]);

  useEffect(() => {
    if (!sites.length || selectedSiteId || !mapRef.current) return;
    if (sites.length === 1) {
      mapRef.current.flyTo({
        center: [sites[0].geo.lng, sites[0].geo.lat],
        zoom: 17.5,
        duration: 800,
      });
      return;
    }

    const lngs = sites.map((site) => site.geo.lng);
    const lats = sites.map((site) => site.geo.lat);
    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 96, maxZoom: 17.5, duration: 800 }
    );
  }, [selectedSiteId, sites]);

  if (!hasMapboxToken()) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card text-center">
        <div className="max-w-sm space-y-2 p-6">
          <p className="text-sm font-medium text-foreground">
            Mapbox token missing
          </p>
          <p className="text-xs text-muted-foreground">
            Set <code className="text-foreground">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            in <code className="text-foreground">.env.local</code> with a public
            (pk.*) token to render the portfolio map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={DEFAULT_CAMERA}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      logoPosition="bottom-left"
    >
      <AttributionControl compact position="bottom-left" />
      {sites.map((site) => (
        <Marker
          key={site.id}
          longitude={site.geo.lng}
          latitude={site.geo.lat}
          anchor="center"
        >
          <SiteMarker
            site={site}
            selected={site.id === selectedSiteId}
            onSelect={onSelect}
          />
        </Marker>
      ))}
    </Map>
  );
}
