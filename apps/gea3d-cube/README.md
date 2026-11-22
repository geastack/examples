# Gea3D Cube

This is the smoke app for `gea3d`, the Gea-native software 3D renderer
experiment.

It intentionally does not use upstream Three.js, WebGL, ANGLE, Metal, or the
`three-angle-metal` app. The source is written in a Three-like style, but the
renderer is `GeaRenderer` from a vendored copy of `gea3d/src`.

## Dependency Shape

```text
examples/apps/gea3d-cube
  -> examples/apps/gea3d-cube/src/gea3d
       vendored copy of gea3d/src
  -> Display.ctx / Gea runtime
```

The app's `package.json` does not depend on `@geastack/gea3d`; `index.tsx`
imports the vendored copy under `src/gea3d/`, and `nativeSources` compiles its
`src/gea3d/native/gea3d_native.cpp` into native builds. The copy exists because
the app build copies only the app directory before bundling, so a package
outside its alias table does not resolve there.

Resync it from the library source. The command runs from a directory that
holds both the `gea3d` and `examples` checkouts side by side:

```sh
bash gea3d/scripts/sync-into-app.sh examples/apps/gea3d-cube
```

## Run

The renderer calls its native engine (`gea3dNative`), so it runs on the WASM
renderer or a device, not in the DOM-only `gea dev`. From this folder, after
`npm install` at the examples root:

```sh
npx gea simulate --renderer wasm          # in the browser; needs the Emscripten SDK
npx gea flash --board <alias> --monitor   # on a registered ESP32 board
```
