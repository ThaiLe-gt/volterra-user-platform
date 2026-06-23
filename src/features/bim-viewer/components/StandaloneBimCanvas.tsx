"use client";

import { useEffect, useRef, useState } from "react";
import {
  Color,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  WebGLRenderer,
} from "three";
import type { Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SceneManager } from "../lib/sceneManager";
import type { BimConfig } from "../lib/bimConfig";

export type BimFocusTarget =
  | { kind: "site"; id: string }
  | { kind: "asset"; id: string }
  | null;

interface StandaloneBimCanvasProps {
  config: BimConfig;
  selectedAssetId: string | null;
  selectedTarget: BimFocusTarget;
  onSelectAsset: (assetId: string | null) => void;
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
  selectedTarget,
  onSelectAsset,
  className,
}: StandaloneBimCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const onSelectRef = useRef(onSelectAsset);
  const [sceneVersion, setSceneVersion] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelectAsset;
  }, [onSelectAsset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
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

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(sceneManager.scene, camera);
      raf = requestAnimationFrame(animate);
    };

    void sceneManager.init(config).then(() => {
      fitCameraToBounds(camera, controls, sceneManager.getBounds());
      setSceneVersion((version) => version + 1);
    });
    animate();

    const raycaster = new Raycaster();
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      onSelectRef.current(sceneManager.pick(raycaster));
    };
    renderer.domElement.addEventListener("click", handleClick);

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleClick);
      controls.dispose();
      sceneManager.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      cameraRef.current = null;
      controlsRef.current = null;
      sceneManagerRef.current = null;
    };
  }, [config]);

  useEffect(() => {
    sceneManagerRef.current?.setSelected(selectedAssetId);
  }, [selectedAssetId]);

  useEffect(() => {
    const sceneManager = sceneManagerRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!sceneManager || !camera || !controls || !selectedTarget) return;

    const bounds =
      selectedTarget.kind === "asset"
        ? (sceneManager.getAssetBounds(selectedTarget.id) ??
          sceneManager.getBounds())
        : sceneManager.getBounds();
    fitCameraToBounds(camera, controls, bounds);
  }, [sceneVersion, selectedTarget]);

  return <div ref={containerRef} className={className} />;
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
