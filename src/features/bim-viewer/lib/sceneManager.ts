import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Raycaster,
  Scene,
  Vector3,
} from "three";
import { loadGltfScene } from "./gltf";
import type { BimConfig, BimStationConfig } from "./bimConfig";
import type { ModelTransformConfig } from "@/features/data/config/vinuniSiteConfig";

export interface PlacedAsset {
  assetId: string;
  label: string;
}

/**
 * Imperative Three.js scene used by both the standalone canvas and the Mapbox
 * custom layer. Holds the building model, indexes selectable meshes by assetId,
 * and exposes selection / visibility / raycast operations. Calls onChange()
 * whenever the visual state mutates so the host can trigger a repaint.
 */
export class SceneManager {
  readonly scene = new Scene();
  private modelGroup = new Group();
  private meshesByAsset = new Map<string, Mesh[]>();
  private originalColor = new Map<Mesh, Color>();
  private selectedAssetId: string | null = null;
  private onChange: () => void;

  constructor(onChange: () => void = () => {}) {
    this.onChange = onChange;
    this.scene.add(this.modelGroup);

    const ambient = new AmbientLight(0xffffff, 1.1);
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(40, 80, 30);
    const fill = new DirectionalLight(0x88aaff, 0.6);
    fill.position.set(-30, 40, -20);
    this.scene.add(ambient, key, fill);
  }

  /**
   * Try to load configured site/station GLBs; fall back per missing model so a
   * partial model setup still renders and remains selectable.
   */
  async init(config?: BimConfig | string): Promise<void> {
    if (typeof config === "string") {
      const loaded = await this.addModel(config);
      if (!loaded) this.buildLegacyPlaceholder();
      this.onChange();
      return;
    }

    if (!config) {
      this.buildLegacyPlaceholder();
      this.onChange();
      return;
    }

    const siteLoaded = await this.addModel(
      config.site.modelUrl ?? config.modelUrl,
      undefined,
      config.site.transform
    );
    if (!siteLoaded) this.buildSitePlaceholder(config.site.transform);

    for (const station of config.stations) {
      const offset = geoOffsetMeters(config.origin, station.geo);
      const position = new Vector3(offset.x, 0, offset.z);
      const loaded = await this.addModel(
        station.modelUrl,
        position,
        station.transform,
        station
      );
      if (!loaded) {
        this.buildStationPlaceholder(station, position);
      }
    }

    this.onChange();
  }

  private async addModel(
    modelUrl?: string,
    position?: Vector3,
    transform?: ModelTransformConfig,
    station?: BimStationConfig
  ): Promise<boolean> {
    if (!modelUrl) return false;
    try {
      const source = await loadGltfScene(modelUrl);
      const scene = source.clone(true);
      const wrapper = new Group();
      wrapper.name = station ? `${station.id}-transform` : "site-transform";
      applyTransform(wrapper, position, transform);
      prepareMaterials(scene);
      if (station) tagStationModel(scene, station);
      wrapper.add(scene);
      this.modelGroup.add(wrapper);
      this.indexMeshes(wrapper);
      return true;
    } catch {
      return false;
    }
  }

  private indexMeshes(root: Object3D): void {
    root.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const assetId =
        (obj.userData?.assetId as string | undefined) ??
        (looksLikeAssetName(obj.name) ? obj.name : undefined);
      if (assetId) {
        const list = this.meshesByAsset.get(assetId) ?? [];
        list.push(obj);
        this.meshesByAsset.set(assetId, list);
      }
      if (obj.material instanceof MeshStandardMaterial) {
        this.originalColor.set(obj, obj.material.color.clone());
      }
    });
  }

  private buildSitePlaceholder(transform?: ModelTransformConfig): void {
    const group = new Group();
    group.name = "site-placeholder-transform";
    applyTransform(group, undefined, transform);

    const shell = new Mesh(
      new BoxGeometry(40, 24, 30),
      new MeshStandardMaterial({
        color: new Color("#1b2740"),
        metalness: 0.2,
        roughness: 0.7,
      })
    );
    shell.position.set(0, 12, 0);
    group.add(shell);

    // Secondary wing
    const wing = new Mesh(
      new BoxGeometry(18, 14, 22),
      new MeshStandardMaterial({ color: new Color("#22314f"), roughness: 0.8 })
    );
    wing.position.set(-29, 7, 4);
    group.add(wing);
    this.modelGroup.add(group);
  }

  private buildStationPlaceholder(
    station: BimStationConfig,
    position: Vector3
  ): void {
    const group = new Group();
    group.name = `${station.id}-placeholder-transform`;
    applyTransform(group, position, station.transform);

    const unit = new Mesh(
      new BoxGeometry(7, 3, 5),
      new MeshStandardMaterial({
        color: new Color("#3c4f74"),
        metalness: 0.4,
        roughness: 0.5,
      })
    );
    unit.position.set(0, 24 + 1.5, 0);
    unit.name = station.id;
    unit.userData.assetId = station.id;
    unit.userData.label = station.name;
    this.originalColor.set(unit, unit.material.color.clone());
    const list = this.meshesByAsset.get(station.id) ?? [];
    list.push(unit);
    this.meshesByAsset.set(station.id, list);
    group.add(unit);
    this.modelGroup.add(group);
  }

  private buildLegacyPlaceholder(): void {
    this.buildSitePlaceholder();
    this.buildStationPlaceholder(
      {
        id: "vinuni-station-01",
        name: "VinUni Station 01",
        geo: { lng: 105.94524061064729, lat: 20.990055395134943 },
      },
      new Vector3(-10, 0, -6)
    );
    this.buildStationPlaceholder(
      {
        id: "vinuni-station-02",
        name: "VinUni Station 02",
        geo: { lng: 105.94560061064729, lat: 20.989795395134943 },
      },
      new Vector3(10, 0, 6)
    );
  }

  setSelected(assetId: string | null): void {
    if (assetId === this.selectedAssetId) return;
    // restore previous
    if (this.selectedAssetId) {
      for (const mesh of this.meshesByAsset.get(this.selectedAssetId) ?? []) {
        applyColor(mesh, this.originalColor.get(mesh));
      }
    }
    this.selectedAssetId = assetId;
    if (assetId) {
      for (const mesh of this.meshesByAsset.get(assetId) ?? []) {
        highlight(mesh);
      }
    }
    this.onChange();
  }

  setAssetVisibility(assetId: string, visible: boolean): void {
    for (const mesh of this.meshesByAsset.get(assetId) ?? []) {
      mesh.visible = visible;
    }
    this.onChange();
  }

  /** Pick the assetId under a prepared raycaster, or null. */
  pick(raycaster: Raycaster): string | null {
    const targets = [...this.meshesByAsset.values()].flat();
    const hits = raycaster.intersectObjects(targets, false);
    const hit = hits[0]?.object as Mesh | undefined;
    return (hit?.userData?.assetId as string | undefined) ?? null;
  }

  /** Bounding-box center + radius for fitting a standalone camera. */
  getBounds(): { center: Vector3; radius: number } {
    const box = new Box3().setFromObject(this.modelGroup);
    const center = box.getCenter(new Vector3());
    const radius = box.getSize(new Vector3()).length() / 2;
    return { center, radius: radius || 40 };
  }

  /** Bounding-box center + radius for fitting a specific selectable asset. */
  getAssetBounds(assetId: string): { center: Vector3; radius: number } | null {
    const meshes = this.meshesByAsset.get(assetId);
    if (!meshes?.length) return null;

    const box = new Box3();
    for (const mesh of meshes) {
      box.expandByObject(mesh);
    }
    if (box.isEmpty()) return null;

    const center = box.getCenter(new Vector3());
    const radius = box.getSize(new Vector3()).length() / 2;
    return { center, radius: radius || 12 };
  }

  dispose(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    this.meshesByAsset.clear();
    this.originalColor.clear();
  }
}

function looksLikeAssetName(name: string): boolean {
  return /^(vinuni-station|Station|Pump|Unit|Asset)/i.test(name);
}

function tagStationModel(root: Object3D, station: BimStationConfig): void {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    obj.userData.assetId ??= station.id;
    obj.userData.label ??= station.name;
  });
}

function prepareMaterials(root: Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((material) => material.clone());
    } else {
      obj.material = obj.material.clone();
    }
  });
}

const DEG2RAD = Math.PI / 180;

function applyTransform(
  object: Object3D,
  position?: Vector3,
  transform?: ModelTransformConfig
): void {
  if (position) object.position.copy(position);
  const offset = transform?.offset;
  if (offset) {
    // Config files use Z as up. The internal Three.js scene remains Y-up so it
    // can be wrapped by the Mapbox matrix consistently.
    object.position.add(configZUpVector(offset));
  }

  const rotation = transform?.rotation;
  if (rotation) {
    // Config-space rotation.z is yaw around the vertical axis.
    object.rotation.set(
      (rotation.x ?? 0) * DEG2RAD,
      (rotation.z ?? 0) * DEG2RAD,
      (rotation.y ?? 0) * DEG2RAD
    );
  }

  if (typeof transform?.scale === "number") {
    object.scale.setScalar(transform.scale);
  }
}

function configZUpVector(vector: {
  x?: number;
  y?: number;
  z?: number;
}): Vector3 {
  return new Vector3(vector.x ?? 0, vector.z ?? 0, vector.y ?? 0);
}

function geoOffsetMeters(
  origin: { lng: number; lat: number },
  geo: { lng: number; lat: number }
) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (geo.lng - origin.lng) * metersPerDegreeLng,
    z: (geo.lat - origin.lat) * metersPerDegreeLat,
  };
}

function applyColor(mesh: Mesh, color?: Color): void {
  if (mesh.material instanceof MeshStandardMaterial) {
    if (color) mesh.material.color.copy(color);
    mesh.material.emissive.setHex(0x000000);
    mesh.material.emissiveIntensity = 0;
  }
}

function highlight(mesh: Mesh): void {
  if (mesh.material instanceof MeshStandardMaterial) {
    mesh.material.emissive = new Color("#2f80ed");
    mesh.material.emissiveIntensity = 0.9;
  }
}
