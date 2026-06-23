# BIM models

Drop the site's or station's `.glb` / `.gltf` files here and point `modelUrl` in
`public/config/vinuni-site.json` at the file, for example
`/models/station-1.glb`.

Each station can use a different model URL. When `modelUrl` is omitted for a
site or station, the viewer renders a procedural placeholder for that asset so
selection wiring works without a model file.

Per-model transform values live beside `modelUrl`:

```json
"transform": {
  "scale": 0.1,
  "rotation": { "x": 0, "y": 0, "z": 15 },
  "offset": { "x": 0, "y": 0, "z": 0 }
}
```

Config transforms are Z-up: `offset.z` moves upward, and `rotation.z` is yaw
around the vertical axis. `offset` is in meters, `rotation` is in degrees, and
these values apply only to that site or station model.

## DRACO-compressed models

If your GLB uses DRACO compression, copy the decoder into `public/draco/`:

```
cp node_modules/three/examples/jsm/libs/draco/* public/draco/
```

The loader is configured with `draco.setDecoderPath("/draco/")`
(see `src/features/bim-viewer/lib/gltf.ts`).

## Mesh ↔ tree correlation

Name selectable meshes (or set `userData.assetId`) to match the BIM tree asset
ids so selecting a tree node highlights the right mesh and vice-versa.
