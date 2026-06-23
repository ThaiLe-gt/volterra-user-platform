import type { CustomLayerInterface, Map as MapboxMap } from "mapbox-gl";
import { Camera, Matrix4, WebGLRenderer } from "three";
import { SceneManager } from "./sceneManager";
import type { BimConfig } from "./bimConfig";
import { buildModelMatrix, computeModelTransform } from "./coordinates";

/**
 * Renders a Three.js scene into Mapbox's own WebGL context as a 3D custom layer.
 * Each frame Mapbox hands us its view-projection matrix; we fold the model's
 * Mercator anchor transform (origin/scale/rotation from bim.json) into the
 * camera projection so the building stays geo-locked while the map pans/zooms.
 *
 * `slot: "top"` keeps the model above the Standard style's 3D buildings.
 */
export class MapboxThreeLayer implements CustomLayerInterface {
  readonly id: string;
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;
  readonly slot = "top" as const;

  private renderer: WebGLRenderer | null = null;
  private camera = new Camera();
  private modelMatrix: Matrix4;

  constructor(
    id: string,
    config: BimConfig,
    public readonly sceneManager: SceneManager
  ) {
    this.id = id;
    this.modelMatrix = buildModelMatrix(
      computeModelTransform(config.origin, config.altitude, config.scale),
      config.rotation
    );
  }

  onAdd(map: MapboxMap, gl: WebGL2RenderingContext): void {
    this.renderer = new WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
  }

  render(_gl: WebGL2RenderingContext, matrix: number[]): void {
    if (!this.renderer) return;
    const viewProj = new Matrix4().fromArray(matrix);
    this.camera.projectionMatrix = viewProj.multiply(this.modelMatrix);
    this.renderer.resetState();
    this.renderer.render(this.sceneManager.scene, this.camera);
  }

  onRemove(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }

  /** Current full camera matrix (local→clip), used for pointer picking. */
  get projectionMatrix(): Matrix4 {
    return this.camera.projectionMatrix;
  }
}
