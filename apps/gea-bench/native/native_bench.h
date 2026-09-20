// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#include <cstdint>

#if defined(GEA_PICO_SDK) && GEA_PICO_SDK
extern "C" int backtrace(void **buffer, int size);
extern "C" char **backtrace_symbols(void *const *buffer, int size);
#endif

// Hand-written native-C++ baselines owned by the on-device benchmark app. Each
// mirrors a fixture from
// packages/geatsc/bench/comparison (and its native baseline in
// generated-output/native-cpp/src/<name>.cpp), with sizes scaled for the
// ESP32. The app times these against the geatsc-compiled gea versions of the
// same algorithms on the same board, showing a "gea ms" vs "native ms" column.
//
// JSON uses yyjson, not simdjson: simdjson's speed is x86/Arm SIMD the ESP32-S3
// Xtensa core lacks, so on-device yyjson is the real "fast native JSON" baseline.

namespace gea::host::native_bench {

double loopOverhead(int32_t n);
double arrayRead(double n);
double arrayWrite(double n);
double closure(double n);
double methodCalls(double n);
double mathIntensive(double n);
double modulo(double n);
double factorial(double n);
double fibonacci(double depth);
double nestedLoops(double n);
double matrixMultiply(double n);
double mandelbrot(double dim);
double binaryTrees(double depth);
double primeSieve(double limit);
double stringConcat(double n);
double objectCreate(double n);
double jsonStringify(double count, double reps);
double jsonParse(double count, double reps);
double ttfColdGlyph(double sizePx, double reps);
double ttfColdRun(double sizePx, double reps);
double ttfCachedRun(double sizePx, double reps);

}  // namespace gea::host::native_bench
