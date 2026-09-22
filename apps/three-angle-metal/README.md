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

## Current Bridge Status

The current bridge still has transitional opcode-style host calls such as
`threeWebGLCall(...)`. That is a temporary compatibility surface. The desired
shape is a typed native WebGL object whose methods lower directly to C++ calls,
for example:

```text
gl.createTexture()
  -> NativeWebGL2RenderingContext::createTexture()
  -> glGenTextures through ANGLE
```

After a native build has produced `geatsc-sources.txt`, the bridge guard can inspect
those existing generated module files without rebuilding:

```sh
cd examples/apps/three-angle-metal
npm run audit:bridge
```

The default guard rejects `gea_cpp_value`/`gea_cpp_key` around the native WebGL
bridge symbols. Use `-- --strict-sources` to require that the whole generated app
is free of boxing.

## Related Folders

`examples/apps/three-angle-metal-prototype` contains the old reconstructed
native renderer prototype. It is kept only as historical reference.

`gea3d` is a separate Gea-native software renderer experiment. It is not part of
this Three.js/ANGLE/Metal path.
