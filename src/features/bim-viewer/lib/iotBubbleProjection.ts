import {
  Euler,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  Vector4,
} from "three";
import type {
  IotBubbleConfig,
  ModelTransformConfig,
} from "@/features/data/config/vinuniSiteConfig";
import type { BimConfig, BimStationConfig } from "./bimConfig";
import { buildModelMatrix, computeModelTransform } from "./coordinates";

export interface SceneIotBubble {
  bubble: IotBubbleConfig;
  position: Vector3;
}

export interface ProjectedIotBubble {
  bubble: IotBubbleConfig;
  x: number;
  y: number;
  visible: boolean;
}

interface ViewportSize {
  width: number;
  height: number;
}

export function resolveSceneIotBubbles(
  config: BimConfig,
  bubbles: IotBubbleConfig[] = getConfigIotBubbles(config)
): SceneIotBubble[] {
  return bubbles.flatMap((bubble) => {
    const position = resolveIotBubblePosition(config, bubble);
    return position ? [{ bubble, position }] : [];
  });
}

export function getConfigIotBubbles(config: BimConfig): IotBubbleConfig[] {
  return [
    ...(config.site.iotBubbles ?? []),
    ...config.stations.flatMap((station) => station.iotBubbles ?? []),
  ];
}

export function projectBubblesWithMatrix(
  bubbles: SceneIotBubble[],
  matrix: Matrix4,
  viewport: ViewportSize
): ProjectedIotBubble[] {
  return bubbles.map(({ bubble, position }) => {
    const clip = new Vector4(position.x, position.y, position.z, 1).applyMatrix4(
      matrix
    );
    const ndcX = clip.x / clip.w;
    const ndcY = clip.y / clip.w;
    const ndcZ = clip.z / clip.w;
    const x = Math.round(((ndcX + 1) / 2) * viewport.width);
    const y = Math.round(((1 - ndcY) / 2) * viewport.height);

    return {
      bubble,
      x,
      y,
      visible:
        clip.w > 0 &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        ndcZ >= -1 &&
        ndcZ <= 1 &&
        x >= 0 &&
        x <= viewport.width &&
        y >= 0 &&
        y <= viewport.height,
    };
  });
}

export function projectBubblesWithCamera(
  bubbles: SceneIotBubble[],
  camera: PerspectiveCamera,
  viewport: ViewportSize
): ProjectedIotBubble[] {
  return bubbles.map(({ bubble, position }) => {
    const projected = position.clone().project(camera);
    const x = Math.round(((projected.x + 1) / 2) * viewport.width);
    const y = Math.round(((1 - projected.y) / 2) * viewport.height);

    return {
      bubble,
      x,
      y,
      visible:
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        projected.z >= -1 &&
        projected.z <= 1 &&
        x >= 0 &&
        x <= viewport.width &&
        y >= 0 &&
        y <= viewport.height,
    };
  });
}

export function sameProjectedBubbles(
  a: ProjectedIotBubble[],
  b: ProjectedIotBubble[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.bubble.id === other.bubble.id &&
      item.x === other.x &&
      item.y === other.y &&
      item.visible === other.visible
    );
  });
}

export function findProjectedBubbleAt(
  bubbles: ProjectedIotBubble[],
  x: number,
  y: number,
  radiusPx = 30
): ProjectedIotBubble | undefined {
  let nearest: { bubble: ProjectedIotBubble; distance: number } | undefined;

  for (const bubble of bubbles) {
    if (!bubble.visible) continue;
    const distance = Math.hypot(bubble.x - x, bubble.y - y);
    if (distance > radiusPx) continue;
    if (!nearest || distance < nearest.distance) {
      nearest = { bubble, distance };
    }
  }

  return nearest?.bubble;
}

export function resolveIotBubblePosition(
  config: BimConfig,
  bubble: IotBubbleConfig
): Vector3 | null {
  const base =
    bubble.anchor.relativeTo === "site" ||
    bubble.anchor.relativeTo === config.site.id
      ? {
          position: new Vector3(0, 0, 0),
          transform: config.site.transform,
        }
      : stationAnchorBase(config, bubble.anchor.relativeTo);

  if (!base) return null;
  const matrix = composeConfigTransform(base.position, base.transform);
  return configZUpVector(bubble.anchor.position).applyMatrix4(matrix);
}

export function scenePositionToGeo(
  config: BimConfig,
  position: Vector3
): { lng: number; lat: number } {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.cos((config.origin.lat * Math.PI) / 180);
  return {
    lng: config.origin.lng + position.x / metersPerDegreeLng,
    lat: config.origin.lat + position.z / metersPerDegreeLat,
  };
}

export function scenePositionToLngLat(
  config: BimConfig,
  position: Vector3
): { lng: number; lat: number } {
  const modelMatrix = buildModelMatrix(
    computeModelTransform(config.origin, config.altitude, config.scale),
    config.rotation
  );
  const mercatorPosition = new Vector4(
    position.x,
    position.y,
    position.z,
    1
  ).applyMatrix4(modelMatrix);

  return mercatorToLngLat(mercatorPosition.x, mercatorPosition.y);
}

function stationAnchorBase(
  config: BimConfig,
  stationId: string
): { position: Vector3; transform?: ModelTransformConfig } | null {
  const station = config.stations.find((item) => item.id === stationId);
  if (!station) return null;
  const offset = geoOffsetMeters(config.origin, station.geo);
  return {
    position: new Vector3(offset.x, 0, offset.z),
    transform: station.transform,
  };
}

function composeConfigTransform(
  basePosition: Vector3,
  transform?: ModelTransformConfig
): Matrix4 {
  const position = basePosition.clone();
  if (transform?.offset) {
    position.add(configZUpVector(transform.offset));
  }

  const rotation = transform?.rotation;
  const quaternion = new Quaternion().setFromEuler(
    new Euler(
      (rotation?.x ?? 0) * DEG2RAD,
      (rotation?.z ?? 0) * DEG2RAD,
      (rotation?.y ?? 0) * DEG2RAD
    )
  );
  const scale = new Vector3(1, 1, 1).multiplyScalar(transform?.scale ?? 1);
  return new Matrix4().compose(position, quaternion, scale);
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
  geo: BimStationConfig["geo"]
) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (geo.lng - origin.lng) * metersPerDegreeLng,
    z: (geo.lat - origin.lat) * metersPerDegreeLat,
  };
}

function mercatorToLngLat(x: number, y: number): { lng: number; lat: number } {
  const lng = x * 360 - 180;
  const y2 = 180 - y * 360;
  const lat =
    (360 / Math.PI) * Math.atan(Math.exp((y2 * Math.PI) / 180)) - 90;
  return { lng, lat };
}

const DEG2RAD = Math.PI / 180;
