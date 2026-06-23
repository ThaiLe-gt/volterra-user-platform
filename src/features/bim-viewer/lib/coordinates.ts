import mapboxgl from "mapbox-gl";
import { Euler, Matrix4 } from "three";
import type { GeoPoint } from "@/features/data/types/domain";
import type { BimRotation } from "./bimConfig";

export interface ModelTransform {
  translateX: number;
  translateY: number;
  translateZ: number;
  /** meters → Mercator units at the anchor latitude, times the config scale */
  scale: number;
}

/**
 * Compute the Mercator anchor transform for placing a metric-scaled glTF model
 * at a geographic point. `scaleMultiplier` (from bim.json) lets phase-1 users
 * resize the model; glTF is Y-up so callers also apply a configurable rotation.
 */
export function computeModelTransform(
  origin: GeoPoint,
  altitude = 0,
  scaleMultiplier = 1
): ModelTransform {
  const merc = mapboxgl.MercatorCoordinate.fromLngLat(
    [origin.lng, origin.lat],
    altitude
  );
  return {
    translateX: merc.x,
    translateY: merc.y,
    translateZ: merc.z ?? 0,
    scale: merc.meterInMercatorCoordinateUnits() * scaleMultiplier,
  };
}

const DEG2RAD = Math.PI / 180;

/** Build the model matrix (translate → scale → configurable Euler rotation). */
export function buildModelMatrix(
  t: ModelTransform,
  rotation: BimRotation = { x: 90, y: 0, z: 0 }
): Matrix4 {
  const rotate = new Matrix4().makeRotationFromEuler(
    new Euler(
      rotation.x * DEG2RAD,
      rotation.y * DEG2RAD,
      rotation.z * DEG2RAD,
      "XYZ"
    )
  );
  const translate = new Matrix4().makeTranslation(
    t.translateX,
    t.translateY,
    t.translateZ
  );
  const scale = new Matrix4().makeScale(t.scale, -t.scale, t.scale);
  return translate.multiply(scale).multiply(rotate);
}
