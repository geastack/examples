// SPDX-License-Identifier: GPL-3.0-only
#include "gea3d_native.h"

#include "canvas.h"
#include "display.h"
#include "pixel.h"

#include <algorithm>
#include <cmath>
#include <cstring>

// Async present: on ESP32 the raster+stream runs on a core-0 task so the
// frame task's next scene walk + vertex work overlaps the previous frame's
// display flush (radios are off in the gea3d profile, core 0 is otherwise
// idle). Elsewhere (host builds) present stays synchronous.
#if __has_include("freertos/FreeRTOS.h")
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#define GEA3D_ASYNC_PRESENT 1
#else
#define GEA3D_ASYNC_PRESENT 0
#endif

// Native port of gea3d/src/raster/pipeline.ts (see that file for the
// geometry/convention notes). View space follows three.js: camera at origin
// looking down -Z, right-handed, CCW front faces, column-major matrices.
// Depth ordering is painter's — per-face FARTHEST-vertex key (a ground plane
// must sort behind everything above it), bucket-sorted, emitted back-to-front
// as one FillTrianglesRgb565 present command.

namespace gea::host::gea3d {

namespace {

using gea::framework::graphics::TriangleEntry;
namespace pixel = gea::framework::graphics::pixel;
namespace pd = gea::platform::display;

constexpr int kMaxDirLights = 4;
constexpr int kDepthBuckets = 1024;
constexpr float kCoordLimit = 30000.0f;
constexpr int kCapacity = 4096;

struct BufferSlot {
	std::vector<float> f32;
	std::vector<std::uint32_t> u32;
};

std::vector<BufferSlot> g_buffers;

// Frame state
int g_viewportW = 0;
int g_viewportH = 0;
float g_proj[16] = {};
float g_near = 0.1f;
bool g_hasBg = false;
pixel::native_t g_bgNative = 0;

// Lights (view space; dir = normalized toward-the-light)
float g_ambientR = 0, g_ambientG = 0, g_ambientB = 0;
int g_dirCount = 0;
float g_dirX[kMaxDirLights], g_dirY[kMaxDirLights], g_dirZ[kMaxDirLights];
float g_dirR[kMaxDirLights], g_dirG[kMaxDirLights], g_dirB[kMaxDirLights];

// Triangle store. Entries + depth are parallel; g_sorted is the back-to-front
// gather the present command points at. Plain new: the project allocator
// prefers PSRAM, which is right for these (the display extract copies the
// final batch into internal RAM itself).
TriangleEntry *g_entries = nullptr;
float *g_depth = nullptr;
std::int32_t *g_order = nullptr;
std::int32_t *g_keys = nullptr;
std::int32_t *g_bucketStarts = nullptr;
// Double-buffered: the frame task sorts frame N into one buffer while the
// present task still streams frame N-1 from the other.
TriangleEntry *g_sorted[2] = {nullptr, nullptr};
int g_count = 0;

#if GEA3D_ASYNC_PRESENT
pd::DisplayPresentCommand g_presentCommands[2][2];
int g_presentCommandCount[2] = {0, 0};
int g_presentSlot = 0;
volatile bool g_presentOk = true;
TaskHandle_t g_presentTask = nullptr;
SemaphoreHandle_t g_presentWork = nullptr;
SemaphoreHandle_t g_presentDone = nullptr;

void presentTaskMain(void *)
{
	for (;;) {
		xSemaphoreTake(g_presentWork, portMAX_DELAY);
		const int slot = g_presentSlot;
		g_presentOk = pd::Display::present(g_presentCommands[slot], g_presentCommandCount[slot]);
		xSemaphoreGive(g_presentDone);
	}
}

bool ensurePresentTask()
{
	if (g_presentTask) return true;
	g_presentWork = xSemaphoreCreateBinary();
	g_presentDone = xSemaphoreCreateBinary();
	if (!g_presentWork || !g_presentDone) return false;
	// "Done" starts available: the first endFrame must not wait.
	xSemaphoreGive(g_presentDone);
	// Core 0 (frame task is pinned to the other core; radios are off in this
	// profile so core 0 is essentially ours). Priority below the frame task —
	// the present task never competes for the same core anyway.
	const BaseType_t ok = xTaskCreatePinnedToCore(presentTaskMain, "gea3d_present", 12288, nullptr, 20, &g_presentTask, 0);
	return ok == pdPASS;
}
#endif

// Diagnostics (reset per frame)
int g_statSubmitted = 0;
int g_statNearRejected = 0;
int g_statCulled = 0;
int g_statClipDropped = 0;
int g_statDropped = 0;

void ensureStore()
{
	if (g_entries) return;
	g_entries = new TriangleEntry[kCapacity];
	g_depth = new float[kCapacity];
	g_order = new std::int32_t[kCapacity];
	g_keys = new std::int32_t[kCapacity];
	g_bucketStarts = new std::int32_t[kDepthBuckets + 1];
	g_sorted[0] = new TriangleEntry[kCapacity];
	g_sorted[1] = new TriangleEntry[kCapacity];
}

inline pixel::native_t packColor(float r, float g, float b)
{
	int ir = static_cast<int>(r);
	int ig = static_cast<int>(g);
	int ib = static_cast<int>(b);
	if (ir < 0) ir = 0;
	if (ir > 255) ir = 255;
	if (ig < 0) ig = 0;
	if (ig > 255) ig = 255;
	if (ib < 0) ib = 0;
	if (ib > 255) ib = 255;
	const std::uint32_t rrggbbaa = (static_cast<std::uint32_t>(ir) << 24) |
	                               (static_cast<std::uint32_t>(ig) << 16) |
	                               (static_cast<std::uint32_t>(ib) << 8) | 0xffu;
	return pixel::nativeFromRrggbbaa(rrggbbaa);
}

}  // namespace

double createBuffer()
{
	g_buffers.emplace_back();
	return static_cast<double>(g_buffers.size() - 1);
}

void bufferDataF32(double buffer, const std::vector<float> &data)
{
	const int id = static_cast<int>(buffer);
	if (id < 0 || id >= static_cast<int>(g_buffers.size())) return;
	g_buffers[static_cast<std::size_t>(id)].f32 = data;
}

void bufferDataU32(double buffer, const std::vector<std::uint32_t> &data)
{
	const int id = static_cast<int>(buffer);
	if (id < 0 || id >= static_cast<int>(g_buffers.size())) return;
	g_buffers[static_cast<std::size_t>(id)].u32 = data;
}

void beginFrame(const std::vector<float> &projection,
                double near,
                double bgColor,
                double viewportW,
                double viewportH)
{
	ensureStore();
	g_viewportW = static_cast<int>(viewportW);
	g_viewportH = static_cast<int>(viewportH);
	// Auto-enable the present's 2x upscale when the app renders into a half-panel
	// viewport (renderer.setSize(w/2, h/2)) — half the fill/overdraw, full-res out.
	pd::Display::setPresentScale(g_viewportW * 2 <= pd::kWidth ? 2 : 1);
	g_near = near < 0.0001 ? 0.0001f : static_cast<float>(near);
	for (int i = 0; i < 16; i++) g_proj[i] = i < static_cast<int>(projection.size()) ? projection[i] : 0.0f;
	g_hasBg = bgColor >= 0;
	if (g_hasBg) {
		const std::uint32_t hex = static_cast<std::uint32_t>(bgColor);
		g_bgNative = pixel::nativeFromRrggbbaa((hex << 8) | 0xffu);
	}
	g_count = 0;
	g_dirCount = 0;
	g_ambientR = 0;
	g_ambientG = 0;
	g_ambientB = 0;
	g_statSubmitted = 0;
	g_statNearRejected = 0;
	g_statCulled = 0;
	g_statClipDropped = 0;
	g_statDropped = 0;
}

void ambientLight(double r, double g, double b)
{
	g_ambientR += static_cast<float>(r);
	g_ambientG += static_cast<float>(g);
	g_ambientB += static_cast<float>(b);
}

void directionalLight(double x, double y, double z, double r, double g, double b)
{
	if (g_dirCount >= kMaxDirLights) return;
	const float fx = static_cast<float>(x);
	const float fy = static_cast<float>(y);
	const float fz = static_cast<float>(z);
	const float lenSq = fx * fx + fy * fy + fz * fz;
	if (lenSq <= 0) return;
	const float inv = 1.0f / std::sqrt(lenSq);
	const int i = g_dirCount;
	g_dirX[i] = fx * inv;
	g_dirY[i] = fy * inv;
	g_dirZ[i] = fz * inv;
	g_dirR[i] = static_cast<float>(r);
	g_dirG[i] = static_cast<float>(g);
	g_dirB[i] = static_cast<float>(b);
	g_dirCount = i + 1;
}

void drawElements(double positionBuffer,
                  double indexBuffer,
                  double colorBuffer,
                  double triangleCount,
                  const std::vector<float> &modelView,
                  double shadeMode,
                  double baseR,
                  double baseG,
                  double baseB,
                  double doubleSide)
{
	const int posId = static_cast<int>(positionBuffer);
	const int idxId = static_cast<int>(indexBuffer);
	const int colId = static_cast<int>(colorBuffer);
	const int bufCount = static_cast<int>(g_buffers.size());
	if (posId < 0 || posId >= bufCount || idxId < 0 || idxId >= bufCount) return;
	if (modelView.size() < 16) return;
	const std::vector<float> &positions = g_buffers[static_cast<std::size_t>(posId)].f32;
	const std::vector<std::uint32_t> &indices = g_buffers[static_cast<std::size_t>(idxId)].u32;
	const float *colors = nullptr;
	if (colId >= 0 && colId < bufCount && !g_buffers[static_cast<std::size_t>(colId)].f32.empty())
		colors = g_buffers[static_cast<std::size_t>(colId)].f32.data();

	int triCount = static_cast<int>(triangleCount);
	const int maxTris = static_cast<int>(indices.size() / 3);
	if (triCount > maxTris) triCount = maxTris;
	if (triCount <= 0) return;

	const float *pos = positions.data();
	const std::uint32_t *idx = indices.data();
	const float m0 = modelView[0], m1 = modelView[1], m2 = modelView[2];
	const float m4 = modelView[4], m5 = modelView[5], m6 = modelView[6];
	const float m8 = modelView[8], m9 = modelView[9], m10 = modelView[10];
	const float m12 = modelView[12], m13 = modelView[13], m14 = modelView[14];

	const float nearZ = -g_near;
	const int shade = static_cast<int>(shadeMode);
	const bool twoSided = doubleSide != 0;
	const float matR = static_cast<float>(baseR);
	const float matG = static_cast<float>(baseG);
	const float matB = static_cast<float>(baseB);

	const float p0 = g_proj[0], p1 = g_proj[1], p3 = g_proj[3];
	const float p4 = g_proj[4], p5 = g_proj[5], p7 = g_proj[7];
	const float p8 = g_proj[8], p9 = g_proj[9], p11 = g_proj[11];
	const float p12 = g_proj[12], p13 = g_proj[13], p15 = g_proj[15];
	const float halfW = static_cast<float>(g_viewportW) * 0.5f;
	const float halfH = static_cast<float>(g_viewportH) * 0.5f;

	float clipX[4], clipY[4], clipZ[4];

	g_statSubmitted += triCount;
	for (int t = 0; t < triCount; t++) {
		const std::uint32_t i0 = idx[t * 3] * 3;
		const std::uint32_t i1 = idx[t * 3 + 1] * 3;
		const std::uint32_t i2 = idx[t * 3 + 2] * 3;

		const float p0x = pos[i0], p0y = pos[i0 + 1], p0z = pos[i0 + 2];
		const float p1x = pos[i1], p1y = pos[i1 + 1], p1z = pos[i1 + 2];
		const float p2x = pos[i2], p2y = pos[i2 + 1], p2z = pos[i2 + 2];

		// To view space
		const float v0x = m0 * p0x + m4 * p0y + m8 * p0z + m12;
		const float v0y = m1 * p0x + m5 * p0y + m9 * p0z + m13;
		const float v0z = m2 * p0x + m6 * p0y + m10 * p0z + m14;
		const float v1x = m0 * p1x + m4 * p1y + m8 * p1z + m12;
		const float v1y = m1 * p1x + m5 * p1y + m9 * p1z + m13;
		const float v1z = m2 * p1x + m6 * p1y + m10 * p1z + m14;
		const float v2x = m0 * p2x + m4 * p2y + m8 * p2z + m12;
		const float v2y = m1 * p2x + m5 * p2y + m9 * p2z + m13;
		const float v2z = m2 * p2x + m6 * p2y + m10 * p2z + m14;

		// Trivial reject: fully behind the near plane
		if (v0z > nearZ && v1z > nearZ && v2z > nearZ) {
			g_statNearRejected++;
			continue;
		}

		// Face normal (view space, unnormalized)
		const float e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
		const float e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
		float nx = e1y * e2z - e1z * e2y;
		float ny = e1z * e2x - e1x * e2z;
		float nz = e1x * e2y - e1y * e2x;

		// Backface cull against the view vector (camera at origin). CCW front
		// faces have normals toward the camera: dot < 0.
		const float viewDot = nx * v0x + ny * v0y + nz * v0z;
		if (viewDot >= 0) {
			if (!twoSided) {
				g_statCulled++;
				continue;
			}
			nx = -nx;
			ny = -ny;
			nz = -nz;
		}

		// Face color
		float fr = matR, fg = matG, fb = matB;
		if (colors) {
			const float cr = (colors[i0] + colors[i1] + colors[i2]) * 0.33333334f;
			const float cg = (colors[i0 + 1] + colors[i1 + 1] + colors[i2 + 1]) * 0.33333334f;
			const float cb = (colors[i0 + 2] + colors[i1 + 2] + colors[i2 + 2]) * 0.33333334f;
			fr *= cr;
			fg *= cg;
			fb *= cb;
		}

		if (shade == 1) {  // lambert
			const float nLenSq = nx * nx + ny * ny + nz * nz;
			if (nLenSq > 0) {
				const float nInv = 1.0f / std::sqrt(nLenSq);
				const float ux = nx * nInv, uy = ny * nInv, uz = nz * nInv;
				float lr = g_ambientR, lg = g_ambientG, lb = g_ambientB;
				for (int li = 0; li < g_dirCount; li++) {
					const float d = ux * g_dirX[li] + uy * g_dirY[li] + uz * g_dirZ[li];
					if (d > 0) {
						lr += d * g_dirR[li];
						lg += d * g_dirG[li];
						lb += d * g_dirB[li];
					}
				}
				fr *= lr;
				fg *= lg;
				fb *= lb;
			}
		} else if (shade == 2) {  // normal visualization
			const float nLenSq = nx * nx + ny * ny + nz * nz;
			if (nLenSq > 0) {
				const float nInv = 1.0f / std::sqrt(nLenSq);
				fr = (nx * nInv * 0.5f + 0.5f) * 255.0f;
				fg = (ny * nInv * 0.5f + 0.5f) * 255.0f;
				fb = (-nz * nInv * 0.5f + 0.5f) * 255.0f;
			}
		}

		const pixel::native_t color = packColor(fr, fg, fb);

		// Near-plane clip (keep z <= -near). Builds a 3- or 4-gon.
		int clipCount = 0;
		float ax = v0x, ay = v0y, az = v0z;
		float bx = v1x, by = v1y, bz = v1z;
		for (int e = 0; e < 3; e++) {
			const bool aIn = az <= nearZ;
			const bool bIn = bz <= nearZ;
			if (aIn) {
				clipX[clipCount] = ax;
				clipY[clipCount] = ay;
				clipZ[clipCount] = az;
				clipCount++;
			}
			if (aIn != bIn) {
				const float tt = (nearZ - az) / (bz - az);
				clipX[clipCount] = ax + (bx - ax) * tt;
				clipY[clipCount] = ay + (by - ay) * tt;
				clipZ[clipCount] = nearZ;
				clipCount++;
			}
			ax = bx;
			ay = by;
			az = bz;
			if (e == 0) {
				bx = v2x;
				by = v2y;
				bz = v2z;
			} else {
				bx = v0x;
				by = v0y;
				bz = v0z;
			}
		}
		if (clipCount < 3) {
			g_statClipDropped++;
			continue;
		}

		// Face sort depth = FARTHEST clipped vertex (see pipeline.ts for why
		// centroid keys mis-sort large faces like ground planes).
		float depthFar = clipZ[0];
		for (int q = 1; q < clipCount; q++) {
			if (clipZ[q] < depthFar) depthFar = clipZ[q];
		}

		// Project the clipped polygon and fan-emit triangles.
		int sx0 = 0, sy0 = 0, prevX = 0, prevY = 0;
		for (int k = 0; k < clipCount; k++) {
			const float vx = clipX[k], vy = clipY[k], vz = clipZ[k];
			const float cxk = p0 * vx + p4 * vy + p8 * vz + p12;
			const float cyk = p1 * vx + p5 * vy + p9 * vz + p13;
			float cw = p3 * vx + p7 * vy + p11 * vz + p15;
			if (cw < 0.000001f && cw > -0.000001f) cw = 0.000001f;
			const float invW = 1.0f / cw;
			float fx = (cxk * invW + 1.0f) * halfW;
			float fy = (1.0f - cyk * invW) * halfH;
			if (fx < -kCoordLimit) fx = -kCoordLimit;
			if (fx > kCoordLimit) fx = kCoordLimit;
			if (fy < -kCoordLimit) fy = -kCoordLimit;
			if (fy > kCoordLimit) fy = kCoordLimit;
			const int sx = static_cast<int>(std::floor(fx));
			const int sy = static_cast<int>(std::floor(fy));
			if (k == 0) {
				sx0 = sx;
				sy0 = sy;
			} else if (k >= 2) {
				if (g_count >= kCapacity) {
					g_statDropped++;
				} else {
					TriangleEntry &out = g_entries[g_count];
					out.x0 = static_cast<std::int16_t>(sx0);
					out.y0 = static_cast<std::int16_t>(sy0);
					out.x1 = static_cast<std::int16_t>(prevX);
					out.y1 = static_cast<std::int16_t>(prevY);
					out.x2 = static_cast<std::int16_t>(sx);
					out.y2 = static_cast<std::int16_t>(sy);
					out.color = color;
					const std::int16_t lo01 = out.y0 < out.y1 ? out.y0 : out.y1;
					const std::int16_t hi01 = out.y0 > out.y1 ? out.y0 : out.y1;
					out.rowY0 = lo01 < out.y2 ? lo01 : out.y2;
					out.rowY1 = hi01 > out.y2 ? hi01 : out.y2;
					g_depth[g_count] = depthFar;
					g_count++;
				}
			}
			prevX = sx;
			prevY = sy;
		}
	}
}

double endFrame()
{
	ensureStore();
	const int n = g_count;

#if GEA3D_ASYNC_PRESENT
	const bool async = ensurePresentTask();
	const int slot = async ? (g_presentSlot ^ 1) : 0;
#else
	const int slot = 0;
#endif
	TriangleEntry *sorted = g_sorted[slot];

	if (n > 0) {
		// Depth range (distance in front of the camera; view z is negative)
		float dMin = -g_depth[0];
		float dMax = dMin;
		for (int i = 1; i < n; i++) {
			const float d = -g_depth[i];
			if (d < dMin) dMin = d;
			if (d > dMax) dMax = d;
		}
		const float range = dMax - dMin;
		const float scale = range > 0.000001f ? static_cast<float>(kDepthBuckets - 1) / range : 0.0f;

		// Counting sort, key ascending == far-to-near
		for (int b = 0; b <= kDepthBuckets; b++) g_bucketStarts[b] = 0;
		for (int i = 0; i < n; i++) {
			const float d = -g_depth[i];
			int k = static_cast<int>(std::floor((dMax - d) * scale));
			if (k < 0) k = 0;
			if (k >= kDepthBuckets) k = kDepthBuckets - 1;
			g_keys[i] = k;
			g_bucketStarts[k + 1]++;
		}
		for (int b = 1; b <= kDepthBuckets; b++) g_bucketStarts[b] += g_bucketStarts[b - 1];
		for (int i = 0; i < n; i++) {
			const int k = g_keys[i];
			g_order[g_bucketStarts[k]] = i;
			g_bucketStarts[k]++;
		}
		for (int i = 0; i < n; i++) sorted[i] = g_entries[g_order[i]];
	}

#if GEA3D_ASYNC_PRESENT
	if (async) {
		// Pipeline: wait for frame N-1's present to finish (its buffers free
		// up), then hand frame N to the core-0 task and return immediately —
		// the caller's next scene walk + drawElements overlap this present.
		xSemaphoreTake(g_presentDone, portMAX_DELAY);
		const bool previousOk = g_presentOk;
		pd::DisplayPresentCommand *commands = g_presentCommands[slot];
		int commandCount = 0;
		if (g_hasBg) {
			commands[commandCount] = {};
			commands[commandCount].type = pd::DisplayPresentCommandType::FillRectRgb565;
			commands[commandCount].fillRectRgb565 = {0, 0, g_viewportW, g_viewportH, g_bgNative, 255};
			commandCount++;
		}
		commands[commandCount] = {};
		commands[commandCount].type = pd::DisplayPresentCommandType::FillTrianglesRgb565;
		commands[commandCount].fillTrianglesRgb565.entries = sorted;
		commands[commandCount].fillTrianglesRgb565.count = n;
		commands[commandCount].fillTrianglesRgb565.alpha = 255;
		commandCount++;
		g_presentCommandCount[slot] = commandCount;
		g_presentSlot = slot;
		xSemaphoreGive(g_presentWork);
		return previousOk ? static_cast<double>(n) : -1.0;
	}
#endif

	pd::DisplayPresentCommand commands[2];
	int commandCount = 0;
	if (g_hasBg) {
		commands[commandCount] = {};
		commands[commandCount].type = pd::DisplayPresentCommandType::FillRectRgb565;
		commands[commandCount].fillRectRgb565 = {0, 0, g_viewportW, g_viewportH, g_bgNative, 255};
		commandCount++;
	}
	commands[commandCount] = {};
	commands[commandCount].type = pd::DisplayPresentCommandType::FillTrianglesRgb565;
	commands[commandCount].fillTrianglesRgb565.entries = sorted;
	commands[commandCount].fillTrianglesRgb565.count = n;
	commands[commandCount].fillTrianglesRgb565.alpha = 255;
	commandCount++;

	const bool ok = pd::Display::present(commands, commandCount);
	return ok ? static_cast<double>(n) : -1.0;
}

double stat(double which)
{
	switch (static_cast<int>(which)) {
	case 0: return g_statSubmitted;
	case 1: return g_statNearRejected;
	case 2: return g_statCulled;
	case 3: return g_statClipDropped;
	case 4: return g_statDropped;
	default: return 0;
	}
}

}  // namespace gea::host::gea3d
