// SPDX-License-Identifier: GPL-3.0-only
#include "native_bench.h"

#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <vector>

#include "memory.h"

#if defined(GEA_PICO_SDK) && GEA_PICO_SDK
#include "pico/time.h"
#endif

namespace {

void *gea_stbtt_malloc(std::size_t size, void *) {
  if (size == 0) size = 1;
  return gea::framework::memory::Allocator::allocatePreferSpiram(size, alignof(std::max_align_t));
}

void gea_stbtt_free(void *ptr, void *) {
  gea::framework::memory::Allocator::free(ptr);
}

}  // namespace

#define STBTT_malloc(x, u) gea_stbtt_malloc((x), (u))
#define STBTT_free(x, u) gea_stbtt_free((x), (u))
#define STBTT_RASTERIZER_VERSION 1
#define STB_TRUETYPE_IMPLEMENTATION
#include "stb_truetype.h"

extern "C" bool gea_embedded_asset_lookup(const char *path,
                                           const unsigned char **data,
                                           unsigned long *length) __attribute__((weak));

#if defined(GEA_PICO_SDK) && GEA_PICO_SDK
extern "C" int backtrace(void **, int) { return 0; }
extern "C" char **backtrace_symbols(void *const *, int) { return nullptr; }
#endif

namespace gea::host::native_bench {
namespace {

constexpr long long kMod = 1000000000LL;
constexpr int kSpecimenW = 180;
constexpr int kSpecimenH = 28;
constexpr int kSpecimenFontPx = 22;
constexpr int kSpecimenBaseline = 23;

struct TtfState {
  bool tried = false;
  bool ready = false;
  unsigned long length = 0;
  stbtt_fontinfo font{};
};

struct GlyphBitmap {
  int codepoint = 0;
  int width = 0;
  int height = 0;
  int x0 = 0;
  int y0 = 0;
  int advance = 0;
  std::vector<unsigned char> coverage;
};

struct SpecimenMask {
  bool built = false;
  bool ready = false;
  std::uint32_t columns[kSpecimenW]{};
};

TtfState &ttf_state() {
  static TtfState state;
  return state;
}

SpecimenMask &specimen_mask() {
  static SpecimenMask mask;
  return mask;
}

std::uint64_t now_us() {
#if defined(GEA_PICO_SDK) && GEA_PICO_SDK
  return time_us_64();
#else
  return 0;
#endif
}

bool ensure_font() {
  TtfState &state = ttf_state();
  if (state.tried) return state.ready;
  state.tried = true;

  if (!gea_embedded_asset_lookup) {
    return false;
  }

  const char *paths[] = {"fonts/Inter-Regular.ttf", "/fonts/Inter-Regular.ttf"};
  for (const char *path : paths) {
    const unsigned char *bytes = nullptr;
    unsigned long length = 0;
    if (!gea_embedded_asset_lookup(path, &bytes, &length) || !bytes || length == 0) continue;
    const int offset = stbtt_GetFontOffsetForIndex(bytes, 0);
    if (offset < 0 || !stbtt_InitFont(&state.font, bytes, offset)) continue;
    state.ready = true;
    state.length = length;
    return true;
  }

  return false;
}

int clamp_size(double value, int fallback) {
  int out = static_cast<int>(value + 0.5);
  if (out <= 0) out = fallback;
  if (out > 96) out = 96;
  return out;
}

int clamp_reps(double value, int fallback, int maxValue) {
  int out = static_cast<int>(value + 0.5);
  if (out <= 0) out = fallback;
  if (out > maxValue) out = maxValue;
  return out;
}

float font_scale(int sizePx) {
  if (!ensure_font()) return 0.0f;
  return stbtt_ScaleForPixelHeight(&ttf_state().font, static_cast<float>(sizePx));
}

bool glyph_box(int sizePx, int codepoint, int &x0, int &y0, int &x1, int &y1) {
  const float scale = font_scale(sizePx);
  if (scale <= 0.0f) return false;
  stbtt_GetCodepointBitmapBox(&ttf_state().font, codepoint, scale, scale, &x0, &y0, &x1, &y1);
  return true;
}

long long raster_static_checksum(int sizePx, int codepoint) {
  int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  if (!glyph_box(sizePx, codepoint, x0, y0, x1, y1)) return -1;

  const int width = x1 - x0;
  const int height = y1 - y0;
  if (width <= 0 || height <= 0) return 0;
  if (width > 96 || height > 96) return -2;

  static unsigned char bitmap[96 * 96];
  std::memset(bitmap, 0, sizeof(bitmap));
  const float scale = font_scale(sizePx);
  stbtt_MakeCodepointBitmap(&ttf_state().font,
                            bitmap,
                            width,
                            height,
                            width,
                            scale,
                            scale,
                            codepoint);

  long long sum = width * 131LL + height * 17LL;
  for (int i = 0; i < width * height; ++i) sum = (sum + bitmap[i]) % kMod;
  return sum;
}

long long shape_checksum(int codepoint, bool checksumOnly) {
  if (!ensure_font()) return -1;
  stbtt_vertex *vertices = nullptr;
  const int count = stbtt_GetCodepointShape(&ttf_state().font, codepoint, &vertices);
  if (!vertices) return count;

  long long sum = count;
  if (checksumOnly) {
    for (int i = 0; i < count; ++i) {
      const stbtt_vertex &v = vertices[i];
      sum = (sum * 131 + v.type * 17 + v.x + v.y + v.cx + v.cy + v.cx1 + v.cy1) % kMod;
    }
  }
  stbtt_FreeShape(&ttf_state().font, vertices);
  return sum;
}

long long flatten_glyph_checksum(int sizePx, int codepoint) {
  if (!ensure_font()) return -1;
  const float scale = font_scale(sizePx);
  if (scale <= 0.0f) return -2;

  stbtt_vertex *vertices = nullptr;
  const int count = stbtt_GetCodepointShape(&ttf_state().font, codepoint, &vertices);
  if (!vertices || count <= 0) {
    if (vertices) stbtt_FreeShape(&ttf_state().font, vertices);
    return count;
  }

  int *contourLengths = nullptr;
  int contourCount = 0;
  stbtt__point *points = stbtt_FlattenCurves(vertices,
                                             count,
                                             0.35f / scale,
                                             &contourLengths,
                                             &contourCount,
                                             ttf_state().font.userdata);
  long long sum = contourCount * 1000LL;
  int pointCount = 0;
  for (int i = 0; i < contourCount; ++i) pointCount += contourLengths[i];
  sum += pointCount;
  if (points) {
    const int sampleCount = pointCount < 16 ? pointCount : 16;
    for (int i = 0; i < sampleCount; ++i) {
      sum = (sum * 131 + static_cast<int>(points[i].x) * 17 + static_cast<int>(points[i].y)) % kMod;
    }
  }

  STBTT_free(points, ttf_state().font.userdata);
  STBTT_free(contourLengths, ttf_state().font.userdata);
  stbtt_FreeShape(&ttf_state().font, vertices);
  return sum;
}

long long raster_vertices_checksum(const stbtt_vertex *vertices,
                                   int count,
                                   int width,
                                   int height,
                                   float scale,
                                   int xOff,
                                   int yOff) {
  if (width <= 0 || height <= 0 || width > 96 || height > 96) return -2;
  static unsigned char bitmap[96 * 96];
  std::memset(bitmap, 0, sizeof(bitmap));

  stbtt__bitmap bm{};
  bm.w = width;
  bm.h = height;
  bm.stride = width;
  bm.pixels = bitmap;
  stbtt_Rasterize(&bm,
                  0.35f,
                  const_cast<stbtt_vertex *>(vertices),
                  count,
                  scale,
                  scale,
                  0.0f,
                  0.0f,
                  xOff,
                  yOff,
                  1,
                  ttf_state().font.userdata);

  long long sum = width * 131LL + height * 17LL;
  for (int i = 0; i < width * height; ++i) sum = (sum + bitmap[i]) % kMod;
  return sum;
}

long long raster_empty_checksum() {
  static unsigned char bitmap[8 * 8];
  std::memset(bitmap, 0, sizeof(bitmap));
  stbtt__bitmap bm{};
  bm.w = 8;
  bm.h = 8;
  bm.stride = 8;
  bm.pixels = bitmap;
  stbtt_Rasterize(&bm, 0.35f, nullptr, 0, 1.0f, 1.0f, 0.0f, 0.0f, 0, 0, 1, nullptr);
  long long sum = 0;
  for (unsigned char px : bitmap) sum += px;
  return sum;
}

long long manual_box_checksum() {
  static unsigned char bitmap[8 * 8];
  std::memset(bitmap, 0, sizeof(bitmap));
  long long sum = 0;
  for (int y = 2; y < 6; ++y) {
    for (int x = 2; x < 6; ++x) {
      bitmap[y * 8 + x] = 255;
    }
  }
  for (unsigned char px : bitmap) sum = (sum + px) % kMod;
  return sum;
}

void static_box_edges(stbtt__edge *edges) {
  edges[0].x0 = 2.0f;
  edges[0].y0 = 2.0f;
  edges[0].x1 = 2.0f;
  edges[0].y1 = 6.0f;
  edges[0].invert = 0;
  edges[1].x0 = 6.0f;
  edges[1].y0 = 2.0f;
  edges[1].x1 = 6.0f;
  edges[1].y1 = 6.0f;
  edges[1].invert = 1;
}

long long sort_edges_checksum() {
  stbtt__edge edges[2]{};
  static_box_edges(edges);
  stbtt__sort_edges(edges, 2);
  long long sum = 0;
  for (const auto &edge : edges) {
    sum = (sum * 131 + static_cast<int>(edge.x0 * 10.0f) + static_cast<int>(edge.y0 * 17.0f) +
           static_cast<int>(edge.x1 * 19.0f) + static_cast<int>(edge.y1 * 23.0f) + edge.invert) %
          kMod;
  }
  return sum;
}

long long scan_edges_checksum() {
  static unsigned char bitmap[8 * 8];
  std::memset(bitmap, 0, sizeof(bitmap));
  stbtt__bitmap bm{};
  bm.w = 8;
  bm.h = 8;
  bm.stride = 8;
  bm.pixels = bitmap;

  stbtt__edge edges[3]{};
  static_box_edges(edges);
  stbtt__sort_edges(edges, 2);
  stbtt__rasterize_sorted_edges(&bm, edges, 2, 1, 0, 0, nullptr);

  long long sum = 0;
  for (unsigned char px : bitmap) sum = (sum + px) % kMod;
  return sum;
}

long long raster_simple_box_checksum() {
  static unsigned char bitmap[8 * 8];
  std::memset(bitmap, 0, sizeof(bitmap));
  stbtt__bitmap bm{};
  bm.w = 8;
  bm.h = 8;
  bm.stride = 8;
  bm.pixels = bitmap;

  stbtt_vertex box[5]{};
  stbtt_setvertex(&box[0], STBTT_vmove, 2, 2, 0, 0);
  stbtt_setvertex(&box[1], STBTT_vline, 6, 2, 0, 0);
  stbtt_setvertex(&box[2], STBTT_vline, 6, 6, 0, 0);
  stbtt_setvertex(&box[3], STBTT_vline, 2, 6, 0, 0);
  stbtt_setvertex(&box[4], STBTT_vline, 2, 2, 0, 0);
  stbtt_Rasterize(&bm, 0.35f, box, 5, 1.0f, 1.0f, 0.0f, 0.0f, 0, 0, 0, nullptr);

  long long sum = 0;
  for (unsigned char px : bitmap) sum = (sum + px) % kMod;
  return sum;
}

long long raster_box_checksum(int sizePx) {
  const float scale = font_scale(sizePx);
  if (scale <= 0.0f) return -1;
  stbtt_vertex box[5]{};
  stbtt_setvertex(&box[0], STBTT_vmove, 0, 0, 0, 0);
  stbtt_setvertex(&box[1], STBTT_vline, 1024, 0, 0, 0);
  stbtt_setvertex(&box[2], STBTT_vline, 1024, 1024, 0, 0);
  stbtt_setvertex(&box[3], STBTT_vline, 0, 1024, 0, 0);
  stbtt_setvertex(&box[4], STBTT_vline, 0, 0, 0, 0);
  return raster_vertices_checksum(box, 5, 16, 16, scale, 0, -16);
}

bool raster_glyph(int sizePx, int codepoint, GlyphBitmap &glyph) {
  if (!ensure_font()) return false;
  TtfState &state = ttf_state();
  const float scale = stbtt_ScaleForPixelHeight(&state.font, static_cast<float>(sizePx));

  int advance = 0;
  int leftBearing = 0;
  stbtt_GetCodepointHMetrics(&state.font, codepoint, &advance, &leftBearing);

  int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  stbtt_GetCodepointBitmapBox(&state.font, codepoint, scale, scale, &x0, &y0, &x1, &y1);

  glyph = {};
  glyph.codepoint = codepoint;
  glyph.width = x1 - x0;
  glyph.height = y1 - y0;
  glyph.x0 = x0;
  glyph.y0 = y0;
  glyph.advance = static_cast<int>(advance * scale + 0.5f);
  if (glyph.width <= 0 || glyph.height <= 0) return true;

  glyph.coverage.assign(static_cast<std::size_t>(glyph.width * glyph.height), 0);
  stbtt_MakeCodepointBitmap(&state.font,
                            glyph.coverage.data(),
                            glyph.width,
                            glyph.height,
                            glyph.width,
                            scale,
                            scale,
                            codepoint);
  return true;
}

int round_to_int(float value) {
  return value >= 0.0f ? static_cast<int>(value + 0.5f) : static_cast<int>(value - 0.5f);
}

bool build_specimen_mask(SpecimenMask &mask) {
  if (!ensure_font()) return false;

  std::memset(mask.columns, 0, sizeof(mask.columns));
  TtfState &state = ttf_state();
  const float scale = stbtt_ScaleForPixelHeight(&state.font, static_cast<float>(kSpecimenFontPx));
  if (scale <= 0.0f) return false;

  int penX = 8;
  int previous = 0;
  const char *text = "Gea TTF";
  static unsigned char glyphBitmap[96 * 96];

  for (const char *p = text; *p; ++p) {
    const int codepoint = static_cast<unsigned char>(*p);
    if (previous != 0) penX += round_to_int(stbtt_GetCodepointKernAdvance(&state.font, previous, codepoint) * scale);

    int advance = 0;
    int leftBearing = 0;
    stbtt_GetCodepointHMetrics(&state.font, codepoint, &advance, &leftBearing);

    int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    stbtt_GetCodepointBitmapBox(&state.font, codepoint, scale, scale, &x0, &y0, &x1, &y1);
    const int width = x1 - x0;
    const int height = y1 - y0;

    if (width > 0 && height > 0 && width <= 96 && height <= 96) {
      std::memset(glyphBitmap, 0, sizeof(glyphBitmap));
      stbtt_MakeCodepointBitmap(&state.font,
                                glyphBitmap,
                                width,
                                height,
                                width,
                                scale,
                                scale,
                                codepoint);

      const int dstX = penX + x0;
      const int dstY = kSpecimenBaseline + y0;
      for (int row = 0; row < height; ++row) {
        const int y = dstY + row;
        if (y < 0 || y >= kSpecimenH) continue;
        for (int col = 0; col < width; ++col) {
          const int x = dstX + col;
          if (x < 0 || x >= kSpecimenW) continue;
          const unsigned char coverage = glyphBitmap[row * width + col];
          if (coverage > 48) mask.columns[x] |= (static_cast<std::uint32_t>(1) << y);
        }
      }
    }

    penX += round_to_int(advance * scale);
    previous = codepoint;
    if (penX >= kSpecimenW) break;
  }

  return true;
}

bool ensure_specimen() {
  SpecimenMask &mask = specimen_mask();
  if (mask.built) return mask.ready;
  mask.ready = build_specimen_mask(mask);
  mask.built = true;
  return mask.ready;
}

long long checksum_glyph(const GlyphBitmap &glyph) {
  long long sum = glyph.width * 131LL + glyph.height * 17LL + glyph.advance;
  for (unsigned char coverage : glyph.coverage) sum = (sum + coverage) % kMod;
  return sum;
}

long long cold_run_once(int sizePx, const char *text) {
  long long sum = 0;
  for (const char *p = text; *p; ++p) {
    if (*p == ' ') continue;
    GlyphBitmap glyph;
    if (raster_glyph(sizePx, static_cast<unsigned char>(*p), glyph))
      sum = (sum + checksum_glyph(glyph)) % kMod;
  }
  return sum;
}

std::uint16_t blend565(std::uint16_t dst, int alpha) {
  if (alpha <= 0) return dst;
  if (alpha >= 255) return 0xffff;
  const int rb = dst & 0xf81f;
  const int g = dst & 0x07e0;
  const int inv = 255 - alpha;
  const int outRb = (((rb * inv) + (0xf81f * alpha)) / 255) & 0xf81f;
  const int outG = (((g * inv) + (0x07e0 * alpha)) / 255) & 0x07e0;
  return static_cast<std::uint16_t>(outRb | outG);
}

long long cached_run(int sizePx, int reps) {
  constexpr int kWidth = 320;
  const int height = sizePx * 2 + 12;
  const int baseline = sizePx + 4;
  const char *text = "Inter 123";
  std::vector<GlyphBitmap> glyphs;
  glyphs.reserve(12);

  for (const char *p = text; *p; ++p) {
    if (*p == ' ') continue;
    bool exists = false;
    for (const auto &glyph : glyphs) {
      if (glyph.codepoint == static_cast<unsigned char>(*p)) {
        exists = true;
        break;
      }
    }
    if (exists) continue;
    GlyphBitmap glyph;
    if (raster_glyph(sizePx, static_cast<unsigned char>(*p), glyph)) glyphs.push_back(std::move(glyph));
  }

  std::vector<std::uint16_t> framebuffer(static_cast<std::size_t>(kWidth * height), 0);
  long long sum = 0;
  for (int rep = 0; rep < reps; ++rep) {
    int penX = 4;
    for (const char *p = text; *p; ++p) {
      if (*p == ' ') {
        penX += sizePx / 3;
        continue;
      }

      const GlyphBitmap *glyph = nullptr;
      for (const auto &candidate : glyphs) {
        if (candidate.codepoint == static_cast<unsigned char>(*p)) {
          glyph = &candidate;
          break;
        }
      }
      if (!glyph) continue;

      const int dstX = penX + glyph->x0;
      const int dstY = baseline + glyph->y0;
      for (int row = 0; row < glyph->height; ++row) {
        const int y = dstY + row;
        if (y < 0 || y >= height) continue;
        for (int col = 0; col < glyph->width; ++col) {
          const int x = dstX + col;
          if (x < 0 || x >= kWidth) continue;
          const int alpha = glyph->coverage[static_cast<std::size_t>(row * glyph->width + col)];
          std::uint16_t &dst = framebuffer[static_cast<std::size_t>(y * kWidth + x)];
          dst = blend565(dst, alpha);
          sum = (sum + dst + alpha) % kMod;
        }
      }
      penX += glyph->advance;
    }
  }
  return sum;
}

double finish(std::uint64_t t0, long long checksum) {
  return static_cast<double>(checksum);
}

}  // namespace

double ttfFontReady() {
  return ensure_font() ? 1.0 : 0.0;
}

double ttfFontBytes() {
  return ensure_font() ? static_cast<double>(ttf_state().length) : 0.0;
}

double ttfCMalloc64() {
  void *ptr = std::malloc(64);
  if (!ptr) return 0.0;
  std::memset(ptr, 0x5a, 64);
  std::free(ptr);
  return 1.0;
}

double ttfScaleForSize(double sizePx) {
  const int size = clamp_size(sizePx, 27);
  const float scale = font_scale(size);
  return static_cast<double>(static_cast<int>(scale * 1000000.0f + 0.5f));
}

double ttfGlyphIndex(double codepoint) {
  if (!ensure_font()) return -1.0;
  return static_cast<double>(stbtt_FindGlyphIndex(&ttf_state().font, static_cast<int>(codepoint + 0.5)));
}

double ttfGlyphAdvance(double sizePx, double codepoint) {
  const int size = clamp_size(sizePx, 27);
  if (!ensure_font()) return -1.0;
  int advance = 0;
  int leftBearing = 0;
  stbtt_GetCodepointHMetrics(&ttf_state().font,
                             static_cast<int>(codepoint + 0.5),
                             &advance,
                             &leftBearing);
  const float scale = font_scale(size);
  return static_cast<double>(static_cast<int>(advance * scale + 0.5f));
}

double ttfGlyphWidth(double sizePx, double codepoint) {
  const int size = clamp_size(sizePx, 27);
  int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  if (!glyph_box(size, static_cast<int>(codepoint + 0.5), x0, y0, x1, y1)) return -1.0;
  return static_cast<double>(x1 - x0);
}

double ttfGlyphHeight(double sizePx, double codepoint) {
  const int size = clamp_size(sizePx, 27);
  int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  if (!glyph_box(size, static_cast<int>(codepoint + 0.5), x0, y0, x1, y1)) return -1.0;
  return static_cast<double>(y1 - y0);
}

double ttfShapeCount(double codepoint) {
  return static_cast<double>(shape_checksum(static_cast<int>(codepoint + 0.5), false));
}

double ttfShapeChecksum(double codepoint) {
  return static_cast<double>(shape_checksum(static_cast<int>(codepoint + 0.5), true));
}

double ttfFlattenGlyph(double sizePx, double codepoint) {
  const int size = clamp_size(sizePx, 27);
  return static_cast<double>(flatten_glyph_checksum(size, static_cast<int>(codepoint + 0.5)));
}

double ttfRasterEmptyStatic() {
  return static_cast<double>(raster_empty_checksum());
}

double ttfManualBoxStatic() {
  return static_cast<double>(manual_box_checksum());
}

double ttfSortEdgesStatic() {
  return static_cast<double>(sort_edges_checksum());
}

double ttfScanEdgesStatic() {
  return static_cast<double>(scan_edges_checksum());
}

double ttfRasterBoxSimple() {
  return static_cast<double>(raster_simple_box_checksum());
}

double ttfRasterBoxStatic(double sizePx) {
  const int size = clamp_size(sizePx, 27);
  return static_cast<double>(raster_box_checksum(size));
}

double ttfRasterGlyphStatic(double sizePx, double codepoint) {
  const int size = clamp_size(sizePx, 27);
  return static_cast<double>(raster_static_checksum(size, static_cast<int>(codepoint + 0.5)));
}

double ttfSpecimenWidth() {
  return static_cast<double>(kSpecimenW);
}

double ttfSpecimenHeight() {
  return static_cast<double>(kSpecimenH);
}

double ttfSpecimenReady() {
  return ensure_specimen() ? 1.0 : 0.0;
}

double ttfSpecimenColumnBits(double x) {
  if (!ensure_specimen()) return 0.0;
  int column = static_cast<int>(x + 0.5);
  if (column < 0 || column >= kSpecimenW) return 0.0;
  return static_cast<double>(specimen_mask().columns[column]);
}

double ttfColdGlyph(double sizePx, double reps) {
  const int size = clamp_size(sizePx, 27);
  const int count = clamp_reps(reps, 1, 4);
  const std::uint64_t t0 = now_us();
  long long sum = 0;
  for (int i = 0; i < count; ++i) {
    GlyphBitmap glyph;
    if (raster_glyph(size, 'A', glyph)) sum = (sum + checksum_glyph(glyph)) % kMod;
  }
  return finish(t0, sum);
}

double ttfColdRun(double sizePx, double reps) {
  const int size = clamp_size(sizePx, 27);
  const int count = clamp_reps(reps, 1, 2);
  const std::uint64_t t0 = now_us();
  long long sum = 0;
  for (int i = 0; i < count; ++i) sum = (sum + cold_run_once(size, "Hi")) % kMod;
  return finish(t0, sum);
}

double ttfCachedRun(double sizePx, double reps) {
  const int size = clamp_size(sizePx, 27);
  const int count = clamp_reps(reps, 1, 3);
  const std::uint64_t t0 = now_us();
  const long long sum = cached_run(size, count);
  return finish(t0, sum);
}

}  // namespace gea::host::native_bench
