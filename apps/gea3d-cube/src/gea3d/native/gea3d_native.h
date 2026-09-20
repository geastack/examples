// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#include <cstdint>
#include <vector>

// Native fixed-function 3D pipeline behind a WebGL-shaped surface. The TS
// side (gea3d GeaRenderer) keeps the scene graph and matrix math; everything
// per-vertex and per-triangle happens here: view transform, near reject,
// backface cull, flat lambert/normal shading, near-plane clip fan,
// projection, painter's depth sort, and hand-off to the display present
// pipeline as ONE batched triangle command per frame.
//
// WebGL semantics, pragmatic subset: geometry uploads once via
// createBuffer/bufferData*; per-frame traffic is beginFrame (projection +
// clear color) + lights + one drawElements per mesh + endFrame. Depth
// ordering is painter's (per-face farthest-vertex key) — DEPTH_TEST-style
// per-pixel testing can slot in behind the same surface later without the
// caller changing.
//
// Compiled into the firmware via the app's `gea.nativeSources`; the matching
// TS declaration is `declare const gea3dNative` in gea3d's GeaRenderer, wired
// through geatsc-plugin-gea host shims to these symbols.

namespace gea::host::gea3d {

// Returns a new buffer id (>= 0). Buffers are never freed (app-lifetime
// geometry); a delete call can be added when a consumer needs it.
double createBuffer();
void bufferDataF32(double buffer, const std::vector<float> &data);
void bufferDataU32(double buffer, const std::vector<std::uint32_t> &data);

// Resets per-frame state (lights, triangle store) and latches the projection
// matrix (column-major, three.js element order), near distance and viewport.
// bgColor >= 0 is 0xRRGGBB and emits a full-screen opaque base fill (the
// display present path requires one); bgColor < 0 presents triangles only.
void beginFrame(const std::vector<float> &projection,
                double near,
                double bgColor,
                double viewportW,
                double viewportH);

// Ambient accumulates across calls (several ambient/hemisphere lights sum).
// Directional dir is TOWARD the light, view space; normalized here.
void ambientLight(double r, double g, double b);
void directionalLight(double x, double y, double z, double r, double g, double b);

// Fixed-function draw: positions/indices/colors are previously-uploaded
// buffer ids (colorBuffer < 0 = no vertex colors). modelView is column-major
// Float32Array(16). shadeMode: 0 unlit, 1 lambert, 2 normal. base* is the
// material color premultiplied to 0..255. doubleSide: 0/1.
void drawElements(double positionBuffer,
                  double indexBuffer,
                  double colorBuffer,
                  double triangleCount,
                  const std::vector<float> &modelView,
                  double shadeMode,
                  double baseR,
                  double baseG,
                  double baseB,
                  double doubleSide);

// Sorts back-to-front and presents the frame. Returns triangles drawn, or
// -1 if the display rejected the present.
double endFrame();

// Frame counters for diagnostics: 0 submitted, 1 nearRejected, 2 culled,
// 3 clipDropped, 4 dropped (capacity).
double stat(double which);

}  // namespace gea::host::gea3d
