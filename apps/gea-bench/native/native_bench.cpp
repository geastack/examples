// SPDX-License-Identifier: GPL-3.0-only
#include "native_bench.h"

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#define STB_TRUETYPE_IMPLEMENTATION
#include "stb_truetype.h"
#include "vendor/yyjson/yyjson.h"

extern "C" bool gea_embedded_asset_lookup(const char *path,
                                           const unsigned char **data,
                                           unsigned long *length) __attribute__((weak));

#if defined(GEA_PICO_SDK) && GEA_PICO_SDK
extern "C" int backtrace(void **, int) { return 0; }
extern "C" char **backtrace_symbols(void *const *, int) { return nullptr; }
#endif

// Native-C++ mirrors of packages/geatsc/bench/comparison/fixtures/*.ts, scaled
// for the device. Algorithms match the gea side 1:1 so the timings compare like
// for like; the result of each is returned and consumed by the caller so the
// optimizer can't elide the work.

namespace gea::host::native_bench {

namespace {
constexpr long long kMod = 1000000000LL;

yyjson_mut_doc *build_items_doc(long long count) {
  yyjson_mut_doc *doc = yyjson_mut_doc_new(nullptr);
  yyjson_mut_val *arr = yyjson_mut_arr(doc);
  yyjson_mut_doc_set_root(doc, arr);
  char namebuf[32];
  for (long long i = 0; i < count; ++i) {
    yyjson_mut_val *obj = yyjson_mut_obj(doc);
    yyjson_mut_obj_add_int(doc, obj, "id", i);
    const int len = std::snprintf(namebuf, sizeof(namebuf), "item-%lld", i);
    yyjson_mut_obj_add_strncpy(doc, obj, "name", namebuf, static_cast<size_t>(len < 0 ? 0 : len));
    yyjson_mut_obj_add_int(doc, obj, "score", (i * 7919) % 1000);
    yyjson_mut_arr_append(arr, obj);
  }
  return doc;
}

long long fib_impl(long long n) { return n < 2 ? n : fib_impl(n - 1) + fib_impl(n - 2); }

struct Counter {
  long long value = 0;
  long long tick(long long n) {
    value = (value + n) % kMod;
    return value;
  }
};

struct TreeNode {
  long long value;
  std::unique_ptr<TreeNode> left;
  std::unique_ptr<TreeNode> right;
};
std::unique_ptr<TreeNode> build_tree(long long depth, long long value) {
  if (depth == 0) return nullptr;
  auto node = std::make_unique<TreeNode>();
  node->value = value;
  node->left = build_tree(depth - 1, value * 2);
  node->right = build_tree(depth - 1, value * 2 + 1);
  return node;
}
long long sum_tree(const TreeNode *node) {
  if (!node) return 0;
  return node->value + sum_tree(node->left.get()) + sum_tree(node->right.get());
}

struct TtfState {
  bool tried = false;
  bool ready = false;
  const unsigned char *bytes = nullptr;
  unsigned long length = 0;
  stbtt_fontinfo font{};
};

struct TtfGlyphBitmap {
  int codepoint = 0;
  int width = 0;
  int height = 0;
  int x0 = 0;
  int y0 = 0;
  int advance = 0;
  std::vector<unsigned char> coverage;
};

TtfState &ttf_state() {
  static TtfState state;
  return state;
}

bool ensure_ttf_font() {
  TtfState &state = ttf_state();
  if (state.tried) return state.ready;
  state.tried = true;
  if (!gea_embedded_asset_lookup) {
    std::printf("[ttf-bench] missing gea_embedded_asset_lookup\n");
    return false;
  }

  const char *paths[] = {"fonts/Inter-Regular.ttf", "/fonts/Inter-Regular.ttf"};
  for (const char *path : paths) {
    const unsigned char *bytes = nullptr;
    unsigned long length = 0;
    if (!gea_embedded_asset_lookup(path, &bytes, &length) || !bytes || length == 0) continue;
    const int offset = stbtt_GetFontOffsetForIndex(bytes, 0);
    if (offset < 0 || !stbtt_InitFont(&state.font, bytes, offset)) continue;
    state.bytes = bytes;
    state.length = length;
    state.ready = true;
    std::printf("[ttf-bench] loaded %s (%lu bytes)\n", path, length);
    return true;
  }

  std::printf("[ttf-bench] Inter TTF asset not found\n");
  return false;
}

int clamp_positive(double value, int fallback, int maxValue) {
  int out = static_cast<int>(value + 0.5);
  if (out <= 0) out = fallback;
  if (out > maxValue) out = maxValue;
  return out;
}

bool raster_ttf_glyph(int sizePx, int codepoint, TtfGlyphBitmap &glyph) {
  if (!ensure_ttf_font()) return false;
  TtfState &state = ttf_state();
  const float scale = stbtt_ScaleForPixelHeight(&state.font, static_cast<float>(sizePx));
  int advance = 0;
  int leftBearing = 0;
  stbtt_GetCodepointHMetrics(&state.font, codepoint, &advance, &leftBearing);
  int x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  stbtt_GetCodepointBitmapBox(&state.font, codepoint, scale, scale, &x0, &y0, &x1, &y1);
  const int width = x1 - x0;
  const int height = y1 - y0;
  glyph = {};
  glyph.codepoint = codepoint;
  glyph.width = width;
  glyph.height = height;
  glyph.x0 = x0;
  glyph.y0 = y0;
  glyph.advance = static_cast<int>(advance * scale + 0.5f);
  if (width <= 0 || height <= 0) return true;
  glyph.coverage.assign(static_cast<std::size_t>(width * height), 0);
  stbtt_MakeCodepointBitmap(&state.font,
                            glyph.coverage.data(),
                            width,
                            height,
                            width,
                            scale,
                            scale,
                            codepoint);
  return true;
}

long long checksum_glyph(const TtfGlyphBitmap &glyph) {
  long long sum = glyph.width * 131LL + glyph.height * 17LL + glyph.advance;
  for (unsigned char coverage : glyph.coverage) sum = (sum + coverage) % kMod;
  return sum;
}

long long raster_run_once(int sizePx, const char *text) {
  long long sum = 0;
  for (const char *p = text; *p; ++p) {
    if (*p == ' ') continue;
    TtfGlyphBitmap glyph;
    if (raster_ttf_glyph(sizePx, static_cast<unsigned char>(*p), glyph))
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

long long blit_cached_run(int sizePx, int reps) {
  constexpr int kWidth = 450;
  const int height = sizePx * 2 + 16;
  const int baseline = sizePx + 4;
  const char *text = "Typography Inter 123";
  std::vector<TtfGlyphBitmap> glyphs;
  glyphs.reserve(32);
  for (const char *p = text; *p; ++p) {
    if (*p == ' ') continue;
    bool exists = false;
    for (const auto &g : glyphs) {
      if (g.codepoint == static_cast<unsigned char>(*p)) {
        exists = true;
        break;
      }
    }
    if (exists) continue;
    TtfGlyphBitmap glyph;
    if (raster_ttf_glyph(sizePx, static_cast<unsigned char>(*p), glyph)) glyphs.push_back(std::move(glyph));
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
      const TtfGlyphBitmap *glyph = nullptr;
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
}  // namespace

double loopOverhead(int32_t n) {
  int32_t total = 0;
  for (int32_t i = 0; i < n; ++i) total += 1;
  return static_cast<double>(total);
}

double arrayRead(double n) {
  const long long ni = static_cast<long long>(n);
  std::vector<double> data;
  data.reserve(static_cast<size_t>(ni));
  for (long long i = 0; i < ni; ++i) data.push_back(static_cast<double>(i));
  double total = 0;
  for (long long i = 0; i < ni; ++i) total += data[static_cast<size_t>(i)];
  return std::fmod(total, 1000000000.0);
}

double arrayWrite(double n) {
  const long long ni = static_cast<long long>(n);
  std::vector<long long> data;
  data.reserve(static_cast<size_t>(ni));
  for (long long i = 0; i < ni; ++i) data.push_back((i * 2 + 1) % 1000000);
  long long checksum = 0;
  for (long long i = 0; i < ni; i += 1024) checksum += data[static_cast<size_t>(i)];
  return static_cast<double>(checksum % kMod);
}

double closure(double n) {
  const long long ni = static_cast<long long>(n);
  long long total = 0;
  for (long long i = 0; i < ni; ++i) {
    const long long base = i;
    auto add = [base](long long x) { return base + x; };
    total += add(i);
  }
  return static_cast<double>(total % kMod);
}

double methodCalls(double n) {
  const long long ni = static_cast<long long>(n);
  Counter c;
  long long total = 0;
  for (long long i = 0; i < ni; ++i) total = (total + c.tick(i)) % kMod;
  return static_cast<double>(total);
}

double mathIntensive(double n) {
  const long long ni = static_cast<long long>(n);
  double total = 0;
  for (long long i = 1; i <= ni; ++i) total += 1.0 / static_cast<double>(i);
  return static_cast<double>(static_cast<long long>(std::floor(std::fabs(total) * 1000000.0)) % kMod);
}

double modulo(double n) {
  const long long ni = static_cast<long long>(n);
  long long h = 0;
  for (long long i = 0; i < ni; ++i) h = (h + i * 3 + 1) % 1000000007LL;
  return static_cast<double>(h);
}

double factorial(double n) {
  const long long ni = static_cast<long long>(n);
  const long long MOD = 1000000007LL;
  long long acc = 1;
  for (long long i = 1; i <= ni; ++i) acc = (acc * i) % MOD;
  return static_cast<double>(acc);
}

double fibonacci(double depth) {
  return static_cast<double>(fib_impl(static_cast<long long>(depth)) % kMod);
}

// Flat 1D layout to match the gea side (see BenchStore note).
double nestedLoops(double n) {
  const long long N = static_cast<long long>(n);
  std::vector<long long> grid;
  grid.reserve(static_cast<size_t>(N * N));
  for (long long i = 0; i < N; ++i)
    for (long long j = 0; j < N; ++j) grid.push_back((i * 17 + j * 31) & 0xff);
  long long total = 0;
  for (long long i = 0; i < N; ++i)
    for (long long j = 0; j < N; ++j) total += grid[static_cast<size_t>(i * N + j)];
  return static_cast<double>(total % kMod);
}

double matrixMultiply(double n) {
  const long long N = static_cast<long long>(n);
  std::vector<double> a, b;
  a.reserve(static_cast<size_t>(N * N));
  b.reserve(static_cast<size_t>(N * N));
  for (long long i = 0; i < N; ++i)
    for (long long j = 0; j < N; ++j) {
      a.push_back(static_cast<double>((i * 1103515245 + j * 12345) & 0x7fffffff) / 2147483647.0);
      b.push_back(static_cast<double>((i * 134775813 + j * 1) & 0x7fffffff) / 2147483647.0);
    }
  std::vector<double> c(static_cast<size_t>(N * N), 0.0);
  for (long long i = 0; i < N; ++i)
    for (long long k = 0; k < N; ++k) {
      const double aik = a[static_cast<size_t>(i * N + k)];
      for (long long j = 0; j < N; ++j)
        c[static_cast<size_t>(i * N + j)] += aik * b[static_cast<size_t>(k * N + j)];
    }
  double checksum = 0;
  for (long long i = 0; i < N; ++i) checksum += c[static_cast<size_t>(i * N + i)];
  return static_cast<double>(static_cast<long long>(std::floor(std::fabs(checksum) * 1000.0)) % kMod);
}

double mandelbrot(double dim) {
  const long long DIM = static_cast<long long>(dim);
  const int MAX_ITER = 100;
  long long escapeSum = 0;
  for (long long py = 0; py < DIM; ++py) {
    for (long long px = 0; px < DIM; ++px) {
      // Single-precision so this hot loop runs on the ESP32-S3's hardware FPU
      // instead of libgcc soft-float `double`. Mandelbrot escape-counting on a
      // small grid has no need for double precision. (Experiment: native-only,
      // to A/B against the double gea column on the same board.)
      const float y0 = (static_cast<float>(py) / DIM) * 2 - 1;
      const float x0 = (static_cast<float>(px) / DIM) * 3 - 2;
      float x = 0, y = 0;
      int it = 0;
      while (x * x + y * y <= 4 && it < MAX_ITER) {
        const float xt = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = xt;
        ++it;
      }
      escapeSum += it;
    }
  }
  return static_cast<double>(escapeSum % kMod);
}

double binaryTrees(double depth) {
  auto tree = build_tree(static_cast<long long>(depth), 1);
  return static_cast<double>(sum_tree(tree.get()) % kMod);
}

double primeSieve(double limit) {
  const long long LIMIT = static_cast<long long>(limit);
  std::vector<char> sieve(static_cast<size_t>(LIMIT + 1), 1);
  sieve[0] = 0;
  sieve[1] = 0;
  for (long long i = 2; i * i <= LIMIT; ++i)
    if (sieve[static_cast<size_t>(i)])
      for (long long j = i * i; j <= LIMIT; j += i) sieve[static_cast<size_t>(j)] = 0;
  long long count = 0;
  for (long long i = 2; i <= LIMIT; ++i)
    if (sieve[static_cast<size_t>(i)]) ++count;
  return static_cast<double>(count % kMod);
}

double stringConcat(double n) {
  const long long ni = static_cast<long long>(n);
  std::string s;
  for (long long i = 0; i < ni; ++i) s += 'a';
  return static_cast<double>(s.size());
}

double objectCreate(double n) {
  struct Point {
    long long x, y, z;
  };
  const long long ni = static_cast<long long>(n);
  std::vector<Point> ring(256, Point{0, 0, 0});
  long long total = 0;
  for (long long i = 0; i < ni; ++i) {
    ring[static_cast<size_t>(i % 256)] = Point{(i + total) % 100000, i * 2, i * 3};
    const Point &o = ring[static_cast<size_t>((i * 31 + 7) % 256)];
    total = (total + o.x + o.y + o.z) % kMod;
  }
  return static_cast<double>(total);
}

double jsonStringify(double count, double reps) {
  const long long c = static_cast<long long>(count);
  const long long r = static_cast<long long>(reps);
  yyjson_mut_doc *doc = build_items_doc(c);
  long long total = 0;
  for (long long rep = 0; rep < r; ++rep) {
    size_t out_len = 0;
    char *json = yyjson_mut_write(doc, 0, &out_len);
    if (json) {
      total = (total + static_cast<long long>(out_len)) % kMod;
      std::free(json);
    }
  }
  yyjson_mut_doc_free(doc);
  return static_cast<double>(total);
}

double jsonParse(double count, double reps) {
  const long long c = static_cast<long long>(count);
  const long long r = static_cast<long long>(reps);
  yyjson_mut_doc *mdoc = build_items_doc(c);
  size_t text_len = 0;
  char *json = yyjson_mut_write(mdoc, 0, &text_len);
  std::string text = json ? std::string(json, text_len) : std::string();
  if (json) std::free(json);
  yyjson_mut_doc_free(mdoc);

  long long total = 0;
  for (long long rep = 0; rep < r; ++rep) {
    yyjson_doc *doc = yyjson_read(text.data(), text.size(), 0);
    if (!doc) continue;
    yyjson_val *root = yyjson_doc_get_root(doc);
    const size_t len = yyjson_arr_size(root);
    const size_t idx = len ? static_cast<size_t>(rep) % len : 0;
    yyjson_val *item = yyjson_arr_get(root, idx);
    const long long score = item ? yyjson_get_int(yyjson_obj_get(item, "score")) : 0;
    total = (total + static_cast<long long>(len) + score) % kMod;
    yyjson_doc_free(doc);
  }
  return static_cast<double>(total);
}

double ttfColdGlyph(double sizePx, double reps) {
  const int size = clamp_positive(sizePx, 48, 160);
  const int count = clamp_positive(reps, 1, 1000);
  long long sum = 0;
  for (int i = 0; i < count; ++i) {
    TtfGlyphBitmap glyph;
    if (raster_ttf_glyph(size, 'A', glyph)) sum = (sum + checksum_glyph(glyph)) % kMod;
  }
  return static_cast<double>(sum);
}

double ttfColdRun(double sizePx, double reps) {
  const int size = clamp_positive(sizePx, 48, 160);
  const int count = clamp_positive(reps, 1, 200);
  long long sum = 0;
  for (int i = 0; i < count; ++i)
    sum = (sum + raster_run_once(size, "Typography Inter 123")) % kMod;
  return static_cast<double>(sum);
}

double ttfCachedRun(double sizePx, double reps) {
  const int size = clamp_positive(sizePx, 48, 160);
  const int count = clamp_positive(reps, 1, 1000);
  return static_cast<double>(blit_cached_run(size, count));
}

}  // namespace gea::host::native_bench
