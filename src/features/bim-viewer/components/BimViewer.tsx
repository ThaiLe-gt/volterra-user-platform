"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap, MapMouseEvent } from "mapbox-gl";
import { Raycaster, Vector3 } from "three";
import type { IotBubbleConfig } from "@/features/data/config/vinuniSiteConfig";
import type { IotBubbleTelemetry } from "@/features/digital-twin/lib/iotBubbleTelemetry";
import { SceneManager } from "../lib/sceneManager";
import { MapboxThreeLayer } from "../lib/mapboxThreeLayer";
import type { BimConfig } from "../lib/bimConfig";
import {
  findProjectedBubbleAt,
  projectBubblesWithMatrix,
  resolveIotBubblePosition,
  resolveSceneIotBubbles,
  sameProjectedBubbles,
  scenePositionToLngLat,
  type ProjectedIotBubble,
} from "../lib/iotBubbleProjection";
import { BimIotBubbleOverlay } from "./BimIotBubbleOverlay";

interface BimViewerProps {
  map: MapboxMap;
  config: BimConfig;
  selectedAssetId: string | null;
  selectedBubbleId: string | null;
  bubbles: IotBubbleConfig[];
  bubbleTelemetry?: Record<string, IotBubbleTelemetry>;
  onSelectAsset: (assetId: string | null) => void;
  onSelectBubble: (bubble: IotBubbleConfig) => void;
  onCloseBubble: () => void;
  onViewBubbleDetails: (bubble: IotBubbleConfig) => void;
}

const LAYER_ID = "bim-three-layer";

export function BimViewer({
  map,
  config,
  selectedAssetId,
  selectedBubbleId,
  bubbles,
  bubbleTelemetry,
  onSelectAsset,
  onSelectBubble,
  onCloseBubble,
  onViewBubbleDetails,
}: BimViewerProps) {
  const layerRef = useRef<MapboxThreeLayer | null>(null);
  const onSelectRef = useRef(onSelectAsset);
  const onSelectBubbleRef = useRef(onSelectBubble);
  const focusedBubbleRef = useRef<string | null>(null);
  const projectedBubblesRef = useRef<ProjectedIotBubble[]>([]);
  const sceneBubbles = useMemo(
    () => resolveSceneIotBubbles(config, bubbles),
    [bubbles, config]
  );
  const [projectedBubbles, setProjectedBubbles] = useState<
    ProjectedIotBubble[]
  >([]);

  useEffect(() => {
    onSelectRef.current = onSelectAsset;
  }, [onSelectAsset]);

  useEffect(() => {
    onSelectBubbleRef.current = onSelectBubble;
  }, [onSelectBubble]);

  // Mount the custom layer + scene once per map.
  useEffect(() => {
    const sceneManager = new SceneManager(() => map.triggerRepaint());
    const layer = new MapboxThreeLayer(LAYER_ID, config, sceneManager);
    layerRef.current = layer;

    let bubbleFrame = 0;
    const updateBubbles = () => {
      const canvas = map.getCanvas();
      const next = projectBubblesWithMatrix(sceneBubbles, layer.projectionMatrix, {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      });
      projectedBubblesRef.current = next;
      setProjectedBubbles((previous) =>
        sameProjectedBubbles(previous, next) ? previous : next
      );
    };
    const scheduleBubbleUpdate = () => {
      if (bubbleFrame) return;
      bubbleFrame = window.requestAnimationFrame(() => {
        bubbleFrame = 0;
        updateBubbles();
      });
    };

    void sceneManager.init(config).then(scheduleBubbleUpdate);
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    map.addLayer(layer);

    const raycaster = new Raycaster();
    const handleClick = (e: MapMouseEvent) => {
      const canvas = map.getCanvas();
      const bubbleHit = findProjectedBubbleAt(
        projectedBubblesRef.current,
        e.point.x,
        e.point.y
      );
      if (bubbleHit) {
        onSelectBubbleRef.current(bubbleHit.bubble);
        focusMapOnBubble(map, bubbleHit.bubble, config, () =>
          centerProjectedBubble(map, projectedBubblesRef.current, bubbleHit.bubble.id)
        );
        return;
      }

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
    map.once("render", scheduleBubbleUpdate);
    map.on("move", scheduleBubbleUpdate);
    map.on("resize", scheduleBubbleUpdate);
    map.on("idle", scheduleBubbleUpdate);

    return () => {
      if (bubbleFrame) window.cancelAnimationFrame(bubbleFrame);
      map.off("click", handleClick);
      map.off("render", scheduleBubbleUpdate);
      map.off("move", scheduleBubbleUpdate);
      map.off("resize", scheduleBubbleUpdate);
      map.off("idle", scheduleBubbleUpdate);
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
  }, [config, map, sceneBubbles]);

  // Drive selection highlight from the tree/store.
  useEffect(() => {
    layerRef.current?.sceneManager.setSelected(selectedAssetId);
  }, [selectedAssetId]);

  useEffect(() => {
    if (!selectedBubbleId) {
      focusedBubbleRef.current = null;
      return;
    }
    if (focusedBubbleRef.current === selectedBubbleId) return;

    const bubble = sceneBubbles.find(
      (item) => item.bubble.id === selectedBubbleId
    )?.bubble;
    if (!bubble) return;

    focusedBubbleRef.current = selectedBubbleId;
    focusMapOnBubble(map, bubble, config, () =>
      centerProjectedBubble(map, projectedBubblesRef.current, bubble.id)
    );
  }, [config, map, sceneBubbles, selectedBubbleId]);

  const handleOverlayBubbleSelect = (bubble: IotBubbleConfig) => {
    onSelectBubble(bubble);
    focusedBubbleRef.current = bubble.id;
    focusMapOnBubble(map, bubble, config, () =>
      centerProjectedBubble(map, projectedBubblesRef.current, bubble.id)
    );
  };

  return (
    <BimIotBubbleOverlay
      bubbles={projectedBubbles}
      selectedBubbleId={selectedBubbleId}
      telemetryByBubbleId={bubbleTelemetry}
      onSelectBubble={handleOverlayBubbleSelect}
      onCloseBubble={onCloseBubble}
      onViewDetails={onViewBubbleDetails}
    />
  );
}

function focusMapOnBubble(
  map: MapboxMap,
  bubble: IotBubbleConfig,
  config: BimConfig,
  onSettled?: () => void
): void {
  const position = resolveIotBubblePosition(config, bubble);
  if (!position) return;
  const target = scenePositionToLngLat(config, position);
  const zoom = Math.min(
    Math.max(map.getZoom() + 1.25, config.camera.zoom + 3),
    22
  );
  map.stop();
  map.flyTo({
    center: [target.lng, target.lat],
    zoom,
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    duration: 750,
    essential: true,
  });
  if (onSettled) {
    map.once("moveend", () => {
      window.requestAnimationFrame(onSettled);
    });
  }
}

function centerProjectedBubble(
  map: MapboxMap,
  bubbles: ProjectedIotBubble[],
  bubbleId: string
): void {
  const bubble = bubbles.find((item) => item.bubble.id === bubbleId);
  if (!bubble?.visible) return;

  const canvas = map.getCanvas();
  const dx = bubble.x - canvas.clientWidth / 2;
  const dy = bubble.y - canvas.clientHeight / 2;
  if (Math.hypot(dx, dy) < 24) return;

  map.panBy([dx, dy], {
    duration: 260,
    essential: true,
  });
}
