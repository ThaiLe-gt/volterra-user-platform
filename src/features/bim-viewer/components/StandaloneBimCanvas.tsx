"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  WebGLRenderer,
} from "three";
import type { Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cn } from "@/lib/utils";
import type { IotBubbleConfig } from "@/features/data/config/vinuniSiteConfig";
import type { IotBubbleTelemetry } from "@/features/digital-twin/lib/iotBubbleTelemetry";
import { SceneManager } from "../lib/sceneManager";
import type { BimConfig } from "../lib/bimConfig";
import {
  findProjectedBubbleAt,
  projectBubblesWithCamera,
  resolveSceneIotBubbles,
  sameProjectedBubbles,
  type ProjectedIotBubble,
} from "../lib/iotBubbleProjection";
import { BimIotBubbleOverlay } from "./BimIotBubbleOverlay";

export type BimFocusTarget =
  | { kind: "site"; id: string }
  | { kind: "asset"; id: string }
  | { kind: "bubble"; id: string; assetId: string }
  | null;

interface StandaloneBimCanvasProps {
  config: BimConfig;
  selectedAssetId: string | null;
  selectedBubbleId: string | null;
  bubbles: IotBubbleConfig[];
  bubbleTelemetry?: Record<string, IotBubbleTelemetry>;
  selectedTarget: BimFocusTarget;
  onSelectAsset: (assetId: string | null) => void;
  onSelectBubble: (bubble: IotBubbleConfig) => void;
  onCloseBubble: () => void;
  onViewBubbleDetails: (bubble: IotBubbleConfig) => void;
  className?: string;
}

/**
 * Token-free fallback: renders the BIM scene in its own canvas with orbit
 * controls. Used when NEXT_PUBLIC_MAPBOX_TOKEN is absent so the 3D twin and its
 * selection wiring remain demonstrable without the Mapbox overlay.
 */
export function StandaloneBimCanvas({
  config,
  selectedAssetId,
  selectedBubbleId,
  bubbles,
  bubbleTelemetry,
  selectedTarget,
  onSelectAsset,
  onSelectBubble,
  onCloseBubble,
  onViewBubbleDetails,
  className,
}: StandaloneBimCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const onSelectRef = useRef(onSelectAsset);
  const onSelectBubbleRef = useRef(onSelectBubble);
  const projectedBubblesRef = useRef<ProjectedIotBubble[]>([]);
  const scheduleBubbleUpdateRef = useRef<() => void>(() => {});
  const [sceneVersion, setSceneVersion] = useState(0);
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(new Color("#0a0e16"), 1);
    container.appendChild(renderer.domElement);

    const camera = new PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    cameraRef.current = camera;

    const sceneManager = new SceneManager();
    sceneManagerRef.current = sceneManager;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    let bubbleFrame = 0;
    const updateBubbles = () => {
      const next = projectBubblesWithCamera(sceneBubbles, camera, {
        width: container.clientWidth,
        height: container.clientHeight,
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
    scheduleBubbleUpdateRef.current = scheduleBubbleUpdate;

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(sceneManager.scene, camera);
      raf = requestAnimationFrame(animate);
    };

    void sceneManager.init(config).then(() => {
      fitCameraToBounds(camera, controls, sceneManager.getBounds());
      updateBubbles();
      setSceneVersion((version) => version + 1);
    });
    animate();
    controls.addEventListener("change", scheduleBubbleUpdate);

    const raycaster = new Raycaster();
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const bubbleHit = findProjectedBubbleAt(
        projectedBubblesRef.current,
        clickX,
        clickY
      );
      if (bubbleHit) {
        onSelectBubbleRef.current(bubbleHit.bubble);
        return;
      }

      const ndc = new Vector2(
        (clickX / rect.width) * 2 - 1,
        -(clickY / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      onSelectRef.current(sceneManager.pick(raycaster));
    };
    renderer.domElement.addEventListener("click", handleClick);

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      scheduleBubbleUpdate();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      if (bubbleFrame) window.cancelAnimationFrame(bubbleFrame);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleClick);
      controls.removeEventListener("change", scheduleBubbleUpdate);
      controls.dispose();
      sceneManager.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      cameraRef.current = null;
      controlsRef.current = null;
      sceneManagerRef.current = null;
      scheduleBubbleUpdateRef.current = () => {};
    };
  }, [config, sceneBubbles]);

  useEffect(() => {
    sceneManagerRef.current?.setSelected(selectedAssetId);
  }, [selectedAssetId]);

  useEffect(() => {
    const sceneManager = sceneManagerRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!sceneManager || !camera || !controls || !selectedTarget || selectedBubbleId) {
      return;
    }

    const bounds =
      selectedTarget.kind === "asset"
        ? (sceneManager.getAssetBounds(selectedTarget.id) ??
          sceneManager.getBounds())
        : sceneManager.getBounds();
    fitCameraToBounds(camera, controls, bounds);
    scheduleBubbleUpdateRef.current();
  }, [sceneVersion, selectedBubbleId, selectedTarget]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !selectedBubbleId) return;

    const sceneBubble = sceneBubbles.find(
      (item) => item.bubble.id === selectedBubbleId
    );
    const position = sceneBubble?.position;
    if (!position) return;
    fitCameraToPoint(camera, controls, position);
    scheduleBubbleUpdateRef.current();
  }, [sceneBubbles, sceneVersion, selectedBubbleId]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      <BimIotBubbleOverlay
        bubbles={projectedBubbles}
        selectedBubbleId={selectedBubbleId}
        telemetryByBubbleId={bubbleTelemetry}
        onSelectBubble={onSelectBubble}
        onCloseBubble={onCloseBubble}
        onViewDetails={onViewBubbleDetails}
      />
    </div>
  );
}

function fitCameraToBounds(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  bounds: { center: Vector3; radius: number }
): void {
  const { center } = bounds;
  const radius = Math.max(bounds.radius, 12);
  camera.position.set(
    center.x + radius * 1.6,
    center.y + radius * 0.95,
    center.z + radius * 1.6
  );
  camera.near = Math.max(0.1, radius / 100);
  camera.far = Math.max(5000, radius * 20);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

function fitCameraToPoint(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  point: Vector3
): void {
  const radius = 5.5;
  camera.position.set(
    point.x + radius * 1.25,
    point.y + radius * 0.8,
    point.z + radius * 1.25
  );
  camera.near = 0.1;
  camera.far = Math.max(camera.far, 5000);
  camera.updateProjectionMatrix();
  controls.target.copy(point);
  controls.update();
}
