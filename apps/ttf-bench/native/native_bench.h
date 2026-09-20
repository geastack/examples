// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#if defined(GEA_PICO_SDK) && GEA_PICO_SDK
extern "C" int backtrace(void **buffer, int size);
extern "C" char **backtrace_symbols(void *const *buffer, int size);
#endif

namespace gea::host::native_bench {

double ttfFontReady();
double ttfFontBytes();
double ttfCMalloc64();
double ttfScaleForSize(double sizePx);
double ttfGlyphIndex(double codepoint);
double ttfGlyphAdvance(double sizePx, double codepoint);
double ttfGlyphWidth(double sizePx, double codepoint);
double ttfGlyphHeight(double sizePx, double codepoint);
double ttfShapeCount(double codepoint);
double ttfShapeChecksum(double codepoint);
double ttfFlattenGlyph(double sizePx, double codepoint);
double ttfRasterEmptyStatic();
double ttfManualBoxStatic();
double ttfSortEdgesStatic();
double ttfScanEdgesStatic();
double ttfRasterBoxSimple();
double ttfRasterBoxStatic(double sizePx);
double ttfRasterGlyphStatic(double sizePx, double codepoint);
double ttfSpecimenWidth();
double ttfSpecimenHeight();
double ttfSpecimenReady();
double ttfSpecimenColumnBits(double x);
double ttfColdGlyph(double sizePx, double reps);
double ttfColdRun(double sizePx, double reps);
double ttfCachedRun(double sizePx, double reps);

}  // namespace gea::host::native_bench
