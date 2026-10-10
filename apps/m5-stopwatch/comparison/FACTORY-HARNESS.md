# Factory reference harness

The reference is the actual M5Stack firmware at `m5stack/M5StopWatch-UserDemo`
commit `6b4aa125288b6fe9dca661f10159f6e1e5ee785c`, checked out under
`vendored-sources/M5StopWatch-UserDemo`. Dependencies use its `repos.json` refs;
ESP-IDF is 5.5.4. The original tracked `sdkconfig.defaults` and dependencies lock
are retained. Original optimization is `CONFIG_COMPILER_OPTIMIZATION_DEBUG`/`-Og`;
the separate O2 builds change only optimization to `PERF`.

`factory-diagnostics.patch` adds a CMake `FACTORY_COMPARISON` opt-in. With it off,
the diagnostic unit is excluded and every HAL hook is preprocessor-disabled.
With it on, ordinary factory widgets, LVGL input handling, rendering, microphone,
and app logic run unchanged. Commands inject only HAL touch/button states. No
community simulator or recreated factory view is used.

The diagnostic hardware clamps codec volume/mute, speaker amplifier enable and
motor duty before boot audio. Logical settings and timing remain testable, but
physical audio/haptic output cannot be validated while these clamps are active.
Pristine production images must not be flashed while the user is sleeping.

## Control and capture

`python3 comparison/factory-device.py TREE` reports actual LVGL object geometry,
label text(hexUTF-8), opacity, hidden state, roller selection and slider value.
`--key A`, `--key B` and `--key HOME` use the original HAL debounce/click/hold path;
HOME holds both buttons 800ms. `--tap x y --hold ms` uses actual touch handling.
`--capture name` stores real framebuffer PNG, original wire words and a state and
command receipt under `examples/reports/m5-stopwatch/captures/factory`.

M5GFX `LGFXBase::readRect(uint16_t*)` uses `swap565_t` unless `_swapBytes` changes
conversion. The factory default leaves it false. The host swaps the returned
16-bit words before RGB expansion. `factory-decoder.test.py` tests known colors
and exact recovery of all 65,536 original words. Initial misdecoded captures were
corrected losslessly by `correct-factory-captures.py`; original words are retained.

Factory HAL configures a 468x466 framebuffer. Raw captures retain that size.
WatchFaceManager and the alarm list place their 466px app container at x=0;
launcher, IMU, FFT and wheel center their 466px containers at x=1. Receipts derive
crop origins from actual LVGL TREE geometry and retain `[x,0,466,466]` in
x,y,width,height format. Without a matched466px container, crop is unavailable;
raw pixels remain intact. Cropping is scene-specific and does not resize either image.

The system-only TIME command sets UTC epoch without RTC writes. A 500ms delay does
not guarantee a settled new second because factory views update each 1000ms;
receipts and rendered clock text must be checked before claiming a matched pixel
comparison. O2 diagnostics also offer opt-in CLOCKFREEZE for static captures only: system
time is held at the fixture epoch while monotonic animation time continues, so
digits settle. It is off after reboot and unused in all benchmark windows.
Dynamic screens are compared semantically unless inputs/time match.

## Measurements

`benchmark-factory.py` cold-boots each canonical workload, waits 6.5s for startup,
warms up 3s, then collects 3×10s windows without screenshots, tree scans or serial
traffic inside the windows. Scene defaults match `run-gea.mjs`: menu, Classic,
NumberFlow, stationary IMU, passive microphone FFT, running stopwatch, idle wheel.
Stock refresh is 33ms. `--refresh 16` changes only LVGL's display refresh timer;
the HAL scheduler still polls at 10ms and the LVGL input timer is unchanged.

The framebuffer AMOLED driver has an empty end-transaction hook and can return
while the last row is queued. BENCH mode therefore optionally fences the final
flush with the existing bus `wait()`. `COMPLETION 1` counts completed frames and
records that wait's sum/max. `COMPLETION 0` retains the stock asynchronous policy,
reports submitted frames and leaves presented frames null. A/B windows quantify
this instrumentation effect. It is disabled outside BENCH mode. Scheduler,
render, submitted and completed counts are distinct; panel scan rate is not
measured. CPU work means wall time in `lv_timer_handler`, including transfer waits.
Heap minima are lifetime-since-boot, explicitly labelled, not window minima.

Before factory flashing, the entire 16MiB device flash was backed up and verified.
Final restoration merges the complete physically silent Gea boot set into a
validated copy of that backup and writes one full16MiB image. This preserves
user storage while preventing an intermediate boot of audible production firmware.

## Timed gestures

The diagnostic staged protocol is `GESTURE RESET`, repeated
`GESTURE TOUCH at_ms state x y` and `GESTURE OBSERVE at_ms`, then
`GESTURE BEGIN` and `GESTURE RESULT`. BEGIN replies before setting its monotonic
clock origin. No USB output occurs during playback or observations. Results
retain requested and actual injection times, actual LVGL input-read timestamps,
and real scroll offsets/roller values with container bounds and transformed
corners. Launcher icons are actual image children of the200px icon containers
(source launcher/view.cpp:245–275); only viewport-intersecting images are
recorded. Roller selection uses public lv_roller_get_selected; label corners
include object/ancestor transforms. Input raw coordinates are retained, with
receipt-backed logical origin mapping from the actual466px scene container. This records
scheduler jitter instead of pretending commands were sampled at their requested
times. Up to 128 events/observations and 256 pointer reads are bounded; dropped
reads or truncated node lists invalidate a strict comparison. All trace buffers
allocate only when armed, free after RESULT, and BENCH rejects armed traces.

## Capture-only variant

`build-factory.py --optimization O2 --capture` creates separately retained
`StopWatch-UserDemo-capture-O2` artifacts. Its compound CAPTURE refreshes the
actual display, then captures TREE, framebuffer and public transformed attributes
under the existing GUI lock. This static-capture intervention is never used
in benchmark windows. Each new receipt records the exact binary and PNG SHA256.
Original87 Og captures are preserved in factory-original-Og-captures.zip, with
their original provenance; absent old binary hashes remain unavailable.
