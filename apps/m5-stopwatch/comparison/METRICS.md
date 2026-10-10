# Device comparison measurement protocol

Compare the complete factory and Gea applications on the same StopWatch.
Identify every result with the firmware SHA-256, ESP-IDF/toolchain versions,
source revisions and dirty changes, sdkconfig and instrumentation variant.
Source parity, device-tested functionality and pixel equality are separate
claims. Raw logs and screenshots should remain traceable to their builds.

## Build footprint

These offline tools never build, flash or open a device. From the examples
project, pass explicit existing build paths:

```sh
python3 apps/m5-stopwatch/comparison/analyze-build.py \
  --framework gea --variant production \
  --build-dir .gea/build/esp32-s3-m5stack-stopwatch/app-builds/m5-stopwatch \
  --elf .gea/build/esp32-s3-m5stack-stopwatch/app-builds/m5-stopwatch/gea_embedded.elf \
  --bin .gea/build/esp32-s3-m5stack-stopwatch/app-builds/m5-stopwatch/gea_embedded.bin \
  --output apps/m5-stopwatch/comparison/gea-production-build.json
```

Use the factory build paths with `--framework factory`. Keep production and
benchmark manifests separate. App image bytes include image headers, padding
and checksum; they are the primary application flash footprint. ELF file bytes
include debug information and are not flashed bytes. The analyzer records
allocated sections, static IRAM/DRAM/PSRAM/RTC regions, flashed payloads,
partitions, sdkconfig controls and Gea defines. IDF dummy/noload sections
reserve or alias virtual addresses: listed, but excluded from physical totals.

When analyzing retained images after another build, supply their saved
`--sdkconfig`, `--ninja` and `--project-description`. If matching Ninja/project
metadata was not retained, use `--no-build-metadata`; attributing the current
diagnostic macros to a production image is incorrect. Flash payload accounting
uses the selected app image with support files currently in the build directory,
and explicitly labels that scope.

Report application image, bootloader, partition table, filesystem data and OTA
reserved capacity separately. Static memory and heap-used measurements cannot
simply be added: static regions may already be excluded from the heap budget.
The full applications include artwork, fonts, audio, networking and DSP. Their
footprint does not isolate renderer implementation size.

The preserved `gea-precomparison-build.json` identifies the original
6,617,472-byte image, with IDF 6.0.2 and perf-lite enabled. Its named `.bin` and
`.elf` remain in the existing ignored app build directory. This is a historical
identified baseline, not a stripped production-size result.

## Sampling windows and variants

Gea diagnostics are disabled by default. Build with
`GEA_EMBEDDED_COMPARISON_BENCHMARK=1` for sampling. Disable detailed profiling
and automatic logs in the primary sample with `GEA_EMBEDDED_PERF=0` and
`GEA_EMBEDDED_FRAME_SCHEDULER_FPS_LOG=0`. Retain ordinary dirty rendering,
cache policy, display DMA settings, audio processing and workers. The benchmark
flag clamps the physical ES8311 codec volume to zero, keeps the amplifier off,
and clamps StopWatch motor PWM to zero even when UI volume or vibration settings
are enabled. Disclose this silent diagnostic configuration for both frameworks;
audible speaker and physical haptic verification are outside these runs.

The reusable collector cold-boots each selected scene, records the declared
firmware artifact and its SDK configuration, verifies the connected MAC and
466x466 geometry, and saves all raw replies plus per-window JSON. Its main
scenarios use stationary IMU input and a passive microphone. These conditions
do not measure moving-sensor or driven-spectrum throughput. The optional wheel
scenario is a stationary two-sector wheel; animated interaction sequences are
separate workloads.

```sh
node apps/m5-stopwatch/comparison/run-gea.mjs \
  --port /dev/cu.usbmodem21101 \
  --build-report apps/m5-stopwatch/comparison/gea-benchmark-build.json
```

Use `--dry-run` to inspect scene/input plans without opening a port. An existing
output log is never overwritten. `--output-prefix` selects a different durable
result name; `--scenes` selects explicit scenario IDs. Each run receives an
operator-selected artifact identity; MAC verification does not remotely prove
the flashed image hash. Only the serial owner may run this collector.

The serial owner requests:

```text
GEADEV BENCH BEGIN classic-1 classic-active
[observe 10 seconds of ordinary operation]
GEADEV BENCH END
```

Factory accepts `BENCH BEGIN run_id scenario` and `BENCH END`. Both produce
`SWBENCH {JSON}` with schema version 1. Factory runs use two separate variants:
original LVGL 33ms refresh and diagnostic `REFRESH 16`. The factory task still
services LVGL on its original 10ms loop; a 16ms timer does not guarantee 60 FPS.
This split separates scheduling policy from renderer throughput. Never merge
the variants into one median. Idle screens retain their normal dirty policy;
forcing redraw changes the workload.

For Classic, NumberFlow, FFT and IMU: warm up at least three seconds after entry,
then take three 10-second windows. Retain every run; report median and range,
not the best run. Prefer a cold boot per workload, with memory sampled before
any screenshot. Additional scenarios cover idle launcher, running stopwatch,
picker drag/snap, wheel animation and badge AP/session. Describe the physical
sensor/microphone stimulus or input replay method. Use one operator or agreed
diagnostic script; simultaneous physical interaction invalidates the scripted
window and must be recorded with its reason.

Gea accepts only frames that start and finish in the same measurement window.
Partial boundary frames are excluded; the denominator remains actual monotonic
BEGIN-to-END wall time. Keep exact durations and use long windows to bound
this edge effect. A nominal 300-frame counter is not a ten-second timer.

## Definitions

| Metric              | Boundary and interpretation                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scheduler frames    | Gea completed application-frame iterations; factory completed `lv_timer_handler` iterations. Different policies, not visual FPS.                                                                                                                                                                                                     |
| Rendered frames     | Gea iterations with submitted pixel damage; factory LVGL render-ready events. Preserve the boundary difference.                                                                                                                                                                                                                      |
| Presented frames    | Diagnostic fenced variants count upload frames after the actual final DMA completion wait. Gea counts same-window iterations with submitted damage and completed chunks; factory counts last-flush completions. Unfenced variants leave completion FPS unavailable. Upload FPS is count/window wall time, not AMOLED scan frequency. |
| Chunks / pixels     | Transfer chunks and pixel volume. A partial chunk is not a whole frame.                                                                                                                                                                                                                                                              |
| Work sum / maximum  | Wall duration: Gea app/layout/raster/flush wait; factory `lv_timer_handler`. Includes blocking, not CPU utilization.                                                                                                                                                                                                                 |
| Render duration sum | Factory render-start to render-ready time. Gea leaves unavailable without an equivalent isolated boundary.                                                                                                                                                                                                                           |
| Scheduler cadence   | `cadence_*`: completed scheduler iteration gaps.                                                                                                                                                                                                                                                                                     |
| Presented cadence   | `presented_cadence_*`: consecutive fenced upload-frame completion gaps, excluding idle scheduler iterations. The diagnostic final wait is part of measured work; `completion_wait_us_sum/max` records its wall time. Failed completion waits invalidate the completion FPS claim.                                                    |
| P99 upper bound     | 1ms histogram bins. `-1` means no samples or unbounded overflow at 255ms.                                                                                                                                                                                                                                                            |
| Heap total / free   | Allocatable budget / free bytes using `INTERNAL\|8BIT` or `SPIRAM\|8BIT`. Used is total minus free.                                                                                                                                                                                                                                  |
| Heap minimum free   | Low-water mark since boot, explicitly `heap_min_scope: boot`; BENCH BEGIN does not reset it.                                                                                                                                                                                                                                         |
| Largest free block  | Largest current allocation; report with total free to expose fragmentation.                                                                                                                                                                                                                                                          |

Internal and PSRAM capability sets are disjoint. DMA-capable RAM is a subset,
so it cannot be added as a third pool. Heap measurements are not process RSS.
CPU utilization requires FreeRTOS runtime-counter deltas for idle and relevant
application/DSP/display tasks, with counter timebase and conversion recorded.
Dual-core CPU can be expressed as up to 200% of one core or 100% of both cores;
state the denominator. Gea `TASKSTATS` needs runtime-statistics support. Never
label `work_us/window_us` as CPU utilization.

## Controls and overhead

Match or disclose CPU 240MHz, 16MB flash mode/frequency, octal 80MHz PSRAM,
FreeRTOS 1000Hz, ESP-IDF/toolchain, optimization/assertions, logging, brightness,
radio state, audio rate, display QSPI frequency, frame buffers, DMA queue,
cache budgets and time seed. Keep each implementation's normal allocation
policy in the application comparison; label any matched-policy experiment
separately. Factory display is 468x466 with a 466x466 UI, versus Gea 466x466;
disclose the two-column transfer difference and any screenshot crop.

Benchmark counters add histograms, short mutex sections and odometer reads.
Measure binary/static-memory differences against the uninstrumented build;
do not claim a fixed timing overhead without a measured A/B run. Detailed
profiling, heap tracing, task-stack scans, USB output and screenshots belong
outside sampling windows. Legacy Gea `SCREENSHOT` replays the retained scene
and is not upload evidence. The comparison uses diagnostic `UPLOADSHOT`: ARM
allocates a capture-only PSRAM shadow (RGB565 pixels plus one coverage bit per
pixel, approximately 461KB for 466x466), requests one normal full repaint,
and records exact accepted CO5300 wire payloads. READ blocks app rendering at
a frame boundary, waits for final DMA completion, verifies complete coverage,
exports canonical RGB565 RLE, and frees the shadow. DISARM also frees it.
This proves submitted pixels after the completion fence; actual panel GRAM
contents and AMOLED scan timing remain unverified. Capture copies and the
allocation change timing and the boot heap minimum. All capture/trace buffers
must be disarmed and freed before BENCH; measurements cold-boot first, before
any capture or trace.

`GEADEV COMPLETION 1|0` selects fenced/unfenced benchmark variants while no
window is active. It never changes production flag-0 behavior. Compare FFT
and IMU windows with both settings and retain measured completion-wait time;
do not assume a fixed instrumentation overhead or label unfenced submission
rate as completed upload FPS. `GEADEV CLOCKFREEZE epoch_seconds` holds only
system wall time before app callbacks for static captures; monotonic input
and animation clocks continue. Zero disables it; reboot clears it. BENCH
rejects frozen clocks and armed captures/traces.

## Analysis and validation

```sh
python3 apps/m5-stopwatch/comparison/analyze-logs.py \
  apps/m5-stopwatch/comparison/gea-benchmark.log \
  apps/m5-stopwatch/comparison/factory-benchmark.log \
  --output apps/m5-stopwatch/comparison/measurements.json
node apps/m5-stopwatch/comparison/benchmark.test.mjs
python3 apps/m5-stopwatch/comparison/analysis.test.py
```

The analyzer retains each sample and raw source line, rejects duplicate run
identities, groups framework/variant/scenario separately and preserves missing
metrics as unavailable. Upload FPS, app image size and live/peak memory should
appear beside variant, repetitions and practical limitations in the report.

## Staged gesture analysis

Run the offline comparison after both collectors retain their original
`SWGESTURE` plus the common receipt wrapper:

```sh
python3 apps/m5-stopwatch/comparison/compare-gestures.py \
  --factory reports/m5-stopwatch/gestures/factory \
  --gea reports/m5-stopwatch/gestures/gea \
  --output reports/m5-stopwatch/gesture-comparison.json
python3 apps/m5-stopwatch/comparison/gesture-analysis.test.py
```

The default timing bound is exactly zero microseconds. A nonzero
`--timing-bound-us` is an explicitly labelled sampling experiment, never an
inferred tolerance or time-alignment search. Report requested staging time,
actual injection time and actual consumed-input time separately. The analyzer
pairs changed handled pointer states in declared sequence, retains all repeated
factory polls, and never searches for a later matching move. Factory release
coordinates use the last pressed point because its normal LVGL callback does
not update the point on release. Gea uses its recorded callback coordinates
and keeps queued release-edge coordinates separately.

Only equal requested observation times are paired. Actual-time differences
remain in the result, and a closed input or timing gate makes trajectory
comparisons unavailable. No interpolation, nearest-time pairing or hidden
pixel tolerance is used. Rectangular widget bounds do not substitute for
actual transformed corners. Gea displayed row text is not a native committed
roller getter; committed results need an ordinary OK/Save action and actual
resulting public labels, retained separately as `committedOutcome` with
`ordinaryUiConfirmed`, `kind`, `value` and `evidence`.

A receipt may declare `coordinateMapping.rawToLogicalSubtract: [x,y]` only
with nonempty primary-source `evidence`. This is a scene-specific source
coordinate mapping, not image alignment. The factory's native scroll offsets
are preserved while pointer, layout and corner coordinates are normalized;
original values and file hashes remain available. Missing, truncated or
ambiguous state and input evidence is reported as unavailable. Matching sparse
fields or final values does not establish full motion parity.

The fenced Gea collector requires and retains `MEM` evidence of positive
`flush_rows`, `flush_depth` and `flush_bytes` before every sampling window.
Its completion boundary is validated for the actual configured StopWatch DMA
slot pipeline. This experiment does not claim completion correctness for every
other possible CO5300 target profile.

The dormant shared-plan Gea collector is
`node apps/m5-stopwatch/comparison/run-gea-gestures.mjs --dry-run`.
Live collection requires the serial owner's explicit handoff, `--port` and the
retained final diagnostic `--build-report`. It cold-boots each recipe, verifies
actual route/initial row evidence, stores raw traces and original protocol logs,
and releases trace buffers. The AlarmAdd cases then exercise ordinary OK and
record the added actual alarm label; no Store or private native getter is used.
Factory records authoritative final LVGL picker indices without pressing Save.
The analyzer labels that native-picker versus saved-label boundary separately
from a both-framework ordinary-confirmation comparison.

Launcher transformed-corner measurements pair source-declared visible image
motifs in left-to-right layout order. They never match factory node IDs to Gea
IDs or search for a spatial alignment. Actual image descendants and Gea icon
wrappers have documented source roles; matching geometry does not verify
logical asset identity or full visual parity.
