# Native BatchedMesh rendering validation

This fixture reuses the Three ANGLE Metal AppKit shell and the shipping native
WebGL host. It renders two ordinary colored meshes, an equivalent BatchedMesh,
then the batch with its first instance hidden. It makes no app-specific scene changes.

Everything here runs **in this directory** -- the app is the working directory,
and the validation runner, the plugin and the comparison script all come from
`@geastack/native-webgl-angle`, which this app depends on. The runner itself is
not part of the published package; it lives in that package's repository, so
point node at your checkout of it:

```sh
cd apps/three-batched-mesh
node /path/to/native-webgl-angle/test/run-batched-render.mjs
```

This builds, launches, captures and compares the actual native renderer, then
terminates only the application process it started. Logs and framebuffers go to
this app's normal `dist/macos/three-batched-mesh/build` directory.
The compiler fingerprint is checked at the build's generation checkpoint;
subsequent native compilation uses those emitted C++ files. To repeat capture
of an already built executable, run the same command with `--capture-only`.
To build without launching, use `--build-only` with that runner, or build the
app the ordinary way with the experimental plugin:

```sh
cd apps/three-batched-mesh
GEA_PER_FILE_UNITS=1 GEA_MACOS_JOBS=2 \
GEATSC2_WEBGL_PLUGIN="$(node -p "require('path').join(require('path').dirname(require.resolve('@geastack/native-webgl-angle/package.json')), 'geatsc-plugin-batched-probe.mjs')")" \
npx gea build --target macos
```

Set `GEA_WEBGL_DUMP_FRAME` to a prefix in the app's existing build directory when
launching its executable. The native host captures frames 90, 180 and 300 as PPM
files. Pass that prefix and the application log to that package's
`test/compare-batched-frames.mjs` to check exact pixel equality
between the ordinary and batched scenes, visible removal after hiding, and the
renderer's draw/triangle counters.

The fixture expects the current native fallback: two ordinary GL draws for two
batched instances, then one after hiding. It does not claim multidraw support or
a draw-count reduction. The standard plugin continues to reject BatchedMesh
until native rendering validation passes.
