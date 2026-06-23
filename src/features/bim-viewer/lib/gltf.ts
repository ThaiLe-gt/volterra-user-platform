import { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

let loader: GLTFLoader | null = null;
const cache = new Map<string, Promise<Group>>();

function getLoader(): GLTFLoader {
  if (loader) return loader;
  loader = new GLTFLoader();
  const draco = new DRACOLoader();
  // DRACO decoder is served from /public (copy from three/examples/jsm/libs/draco).
  draco.setDecoderPath("/draco/");
  loader.setDRACOLoader(draco);
  return loader;
}

/** Load a GLB/glTF scene, cached by URL. */
export function loadGltfScene(url: string): Promise<Group> {
  const cached = cache.get(url);
  if (cached) return cached;

  const promise = new Promise<Group>((resolve, reject) => {
    getLoader().load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err)
    );
  });
  cache.set(url, promise);
  return promise;
}
