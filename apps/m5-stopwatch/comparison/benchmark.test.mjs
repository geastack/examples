import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const header = fileURLToPath(
  new URL('../../../../targets/targets/esp32/services/comparison_benchmark.h', import.meta.url),
)
const output = fileURLToPath(
  new URL(
    '../../../.gea/build/esp32-s3-m5stack-stopwatch/app-builds/m5-stopwatch/comparison-benchmark-test',
    import.meta.url,
  ),
)
const source = `
#include "${header}"
#include <cassert>
#include <thread>
int main() {
  using namespace gea::platform::comparison;
  assert(!frameBegin().active);
  begin("repeat-1", "idle", 1000);
  auto first = frameBegin();
  frameDone(first, 2000, 5000, 0, 0, 0);
  frameDone(frameBegin(), 7000, 11000, 2, 800, 3);
  auto result = end(12000);
  assert(result.startUs == 1000 && result.endUs == 12000);
  assert(result.schedulerFrames == 2 && result.renderedFrames == 1 && result.presentedFrames == 1);
  assert(result.presentChunks == 3 && result.presentPixels == 800);
  assert(result.work.count == 2 && result.work.sum == 7000 && result.work.maximum == 4000);
  assert(result.work.percentileUpper(99) == 5000);
  assert(result.cadence.count == 1 && result.cadence.sum == 6000);
  assert(result.presentedCadence.count == 0);
  assert(!frameBegin().active);
  begin("cadence", "idle-between-updates", 12000);
  frameDone(frameBegin(), 13000, 14000, 1, 100, 1);
  frameDone(frameBegin(), 15000, 16000, 0, 0, 0);
  frameDone(frameBegin(), 17000, 18000, 1, 100, 1);
  auto cadence = end(19000);
  assert(cadence.cadence.count == 2 && cadence.cadence.sum == 4000);
  assert(cadence.presentedCadence.count == 1 && cadence.presentedCadence.sum == 4000);
  assert(cadence.presentedCadence.percentileUpper(99) == 5000);
  begin("repeat-2", "active", 13000);
  frameDone(first, 14000, 15000, 1, 100, 1);
  assert(end(16000).schedulerFrames == 0);
  completionFence.store(false);
  begin("unfenced", "active", 30000);
  frameDone(frameBegin(), 30000, 32000, 1, 100, 1, 0, true);
  auto unfenced = end(33000);
  assert(!unfenced.completionFence && unfenced.renderedFrames == 1 && unfenced.presentedFrames == 0);
  assert(unfenced.presentedCadence.count == 0);
  completionFence.store(true);
  begin("fenced", "failure", 34000);
  frameDone(frameBegin(), 34000, 35000, 1, 100, 1, 200, true);
  frameDone(frameBegin(), 35000, 36500, 1, 100, 1, 500, false);
  auto fenced = end(37000);
  assert(fenced.completionFence && fenced.renderedFrames == 2 && fenced.presentedFrames == 1);
  assert(fenced.completionFailures == 1 && fenced.completionWaitSum == 700 && fenced.completionWaitMax == 500);
  Distribution distribution;
  assert(distribution.percentileUpper(99) == -1);
  distribution.add(300000);
  assert(distribution.percentileUpper(99) == -1 && distribution.maximum == 300000);
  // A control-task end/begin cannot count an older in-flight frame in a new run.
  begin("repeat-3", "race", 17000);
  auto old = frameBegin();
  std::thread control([] { end(18000); begin("repeat-4", "race", 19000); });
  control.join();
  frameDone(old, 17000, 20000, 1, 100, 1);
  frameDone(frameBegin(), 20000, 21000, 1, 100, 1);
  assert(end(22000).schedulerFrames == 1);
}
`
const compile = spawnSync(
  process.env.CXX || 'clang++',
  [
    '-std=c++20',
    '-pthread',
    '-DGEA_EMBEDDED_COMPARISON_BENCHMARK=1',
    '-fsanitize=address,undefined',
    '-x',
    'c++',
    '-',
    '-o',
    output,
  ],
  { input: source, encoding: 'utf8', env: { ...process.env, TMPDIR: dirname(output) } },
)

assert.equal(compile.status, 0, compile.stderr)
const run = spawnSync(output, [], { encoding: 'utf8', timeout: 30000 })

assert.equal(run.status, 0, run.stderr || String(run.error))
console.log(
  'Comparison windows distinguish idle scheduler ticks, transfers, stale frames and bounded percentiles',
)
