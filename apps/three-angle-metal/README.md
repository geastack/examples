# Three ANGLE Metal

This is the Three.js compatibility path. It runs upstream Three.js unmodified.

The goal is to run upstream Three.js app/demo code as a native macOS app by
compiling the JavaScript/TypeScript side with geatsc and supplying the browser
rendering primitives that Three.js expects through a typed native host.

```text
upstream three
  -> Three.WebGLRenderer
  -> WebGLRenderingContext / WebGL2RenderingContext facade
  -> @geastack/native-webgl-angle
  -> typed C++ native bridge
  -> ANGLE
  -> Metal
```

## Boundaries

- Use upstream `three` for scene objects, render lists, shader setup, materials,
  glTF behavior, PMREM, animation, and draw ordering.
- Do not reconstruct Three.js scenes or renderer behavior in this app.
- Do not depend on `@geastack/gea3d`.
- Do not route this through the old prototype renderer.
- The WebGL bridge hot path should use typed native calls and handles, not
  `gea_cpp_value` or `gea_cpp_key`.

The ANGLE/WebGL compatibility layer lives in `native-webgl-angle`.
This example owns the Three.js demo code and app shell only.

## Build and run

From this folder, after `npm install` at the examples root, on a Mac with
Xcode:

```sh
npx gea build --target macos
open "dist/macos/three-angle-metal/Three ANGLE Metal.app"
```

With `@geastack/cli` later than 0.1.116, `npx gea run --target macos` builds and
opens the app in one step.

## Bridge shape

The bridge is a typed native WebGL object. Each `NativeWebGL2RenderingContext`
method in `@geastack/native-webgl-angle` calls one typed host function, which
`native/angle_webgl_host.mm` implements on ANGLE, for example:

```text
gl.createTexture()
  -> NativeWebGL2RenderingContext.createTexture()
  -> threeWebGLCreateTexture()
  -> glGenTextures through ANGLE
```

This app's `native/angle_webgl_host.mm` only includes the package's host source,
because app `nativeSources` cannot point into a package.

After `npx gea build --target macos` has produced the generated C++, the bridge
guard can inspect those files without rebuilding. The build writes their list to
`dist/macos/.generated/three-angle-metal/geatsc-sources.txt`, which the script
reads by default (pass another list or file as its argument to inspect that):

```sh
npm run audit:bridge
```

The default guard rejects `gea_cpp_value`/`gea_cpp_key` around the native WebGL
bridge symbols. Add `--strict-sources` to require that the whole generated app
is free of boxing.

## Related Folders

`examples/apps/three-angle-metal-prototype` contains the old reconstructed
native renderer prototype. It is kept only as historical reference.

`gea3d` is a separate Gea-native software renderer experiment. It is not part of
this Three.js/ANGLE/Metal path.
