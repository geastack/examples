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

The vendored copy exists because the current app packaging path does not yet
consume the local `@geastack/gea3d` package directly.

Resync it from the library source with:

```sh
bash gea3d/scripts/sync-into-app.sh examples/apps/gea3d-cube
```
