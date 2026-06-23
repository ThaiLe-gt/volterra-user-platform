"use client";

import { useEffect, useRef } from "react";
import type { Map as MapboxMap, MapMouseEvent } from "mapbox-gl";
import { Raycaster, Vector3 } from "three";
import { SceneManager } from "../lib/sceneManager";
import { MapboxThreeLayer } from "../lib/mapboxThreeLayer";
import type { BimConfig } from "../lib/bimConfig";

interface BimViewerProps {
  map: MapboxMap;
  config: BimConfig;
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string | null) => void;
}

const LAYER_ID = "bim-three-layer";

export function BimViewer({
  map,
  config,
  selectedAssetId,
  onSelectAsset,
}: BimViewerProps) {
  const layerRef = useRef<MapboxThreeLayer | null>(null);
  const onSelectRef = useRef(onSelectAsset);

  useEffect(() => {
    onSelectRef.current = onSelectAsset;
  }, [onSelectAsset]);

  // Mount the custom layer + scene once per map.
  useEffect(() => {
    const sceneManager = new SceneManager(() => map.triggerRepaint());
    const layer = new MapboxThreeLayer(LAYER_ID, config, sceneManager);
    layerRef.current = layer;

    void sceneManager.init(config);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    map.addLayer(layer);

    const raycaster = new Raycaster();
    const handleClick = (e: MapMouseEvent) => {
      const canvas = map.getCanvas();
      const ndcX = (e.point.x / canvas.clientWidth) * 2 - 1;
      const ndcY = -(e.point.y / canvas.clientHeight) * 2 + 1;
      const inv = layer.projectionMatrix.clone().invert();
      const near = new Vector3(ndcX, ndcY, -1).applyMatrix4(inv);
      const far = new Vector3(ndcX, ndcY, 1).applyMatrix4(inv);
      raycaster.ray.origin.copy(near);
      raycaster.ray.direction.copy(far.sub(near).normalize());
      onSelectRef.current(sceneManager.pick(raycaster));
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
      // The map may already be torn down (its style removed) when both this
      // layer and the owning MapContainer unmount together — guard against it.
      try {
        if (map.getStyle() && map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      } catch {
        // map/style already disposed; nothing to remove
      }
      sceneManager.dispose();
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Drive selection highlight from the tree/store.
  useEffect(() => {
    layerRef.current?.sceneManager.setSelected(selectedAssetId);
  }, [selectedAssetId]);

  return null;
}
