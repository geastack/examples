# M5 StopWatch factory application in Gea

A TypeScript/JSX recreation of M5Stack's C152 factory application for the
466 × 466 round AMOLED. UI components, navigation, timing, alarm scheduling,
watch faces and animation are compiled by geatsc; no LVGL runtime is included.

The feature set and artwork follow the factory app. [PARITY.md](./PARITY.md) records the source audit and remaining output differences. Gea rasterizes text, rounded
edges and FFT triangles through its own renderer, so this is not a pixel-identical
LVGL port. Peak-frequency interpolation retains the factory implementation's
mixed raw and normalized power units; matching that formula does not establish
whole-screen pixel parity.

The reference is [M5StopWatch-UserDemo](https://github.com/m5stack/M5StopWatch-UserDemo/tree/6b4aa125288b6fe9dca661f10159f6e1e5ee785c),
revision `6b4aa125288b6fe9dca661f10159f6e1e5ee785c`. Original MIT artwork,
boot sound and phone badge editor are included with their license. Fonts use
SIL OFL licenses included beside the font files. [Font provenance](./assets/FONTS.md)
records the pinned LVGL Montserrat Medium body face and advance checks.
`scripts/import-factory-assets.py`
reproduces the LVGL RGB565/RGB565A8 artwork as PNG, including the four digit palettes.

The UI follows the factory source layout under `apps/`:

- `app_launcher/view`: launcher carousel and gesture guide.
- `app_watch_face/view`: `classic`, `number_flow`, `big_number`, `simple` and
  `watch_face_manager`.
- `app_alarm_clock/view`: `alarm_list`, `add_alarm` and `trigger_alarm`.
- `app_badge`, `app_fft`, `app_imu`, `app_lucky_wheel`, `app_stopwatch`: their
  individual views, including wheel selection and badge editing.
- `app_setup/view` and `app_setup/workers`: settings, device controls, date/time
  selectors and the about screen.

Components with view-specific styles import an adjacent CSS file. `apps/apps.tsx` only selects
screens and connects shared navigation. `common/` holds rollers, the top clock,
status bar, dialogs and the canvas surface; common adjustment styles are reused
across tools. Canvas painting lives in the relevant view modules. The shared
`WatchStore` retains application state and coordinates navigation and services.

From the examples repository:

```sh
gea build --board stopwatch --app m5-stopwatch
gea flash --board stopwatch --app m5-stopwatch
npm run format --workspace apps/m5-stopwatch
npm run format:check --workspace apps/m5-stopwatch
npm run check --workspace apps/m5-stopwatch
npm test --workspace apps/m5-stopwatch
```

Hold yellow A and blue B together to return to the menu. A/B and horizontal
swipes move through the carousel and watch faces. Touch icons to open a tool;
swipe down from the top for battery status. The first five boots display the original
home gesture guide.

- **AlarmClock:** persistent daily alarms, enable switches, add-time selector,
  long-press deletion dialog and dismissible sound/vibration alert.
- **WatchFace:** classic (three display modes), number flow (ten themes),
  original big-number artwork (four palettes), simple (ten themes and a
  long-press toggle for the second dot).
- **Stopwatch:** start, stop, resume, reset, cumulative laps, newest laps first,
  scrolling history and the original hours/minutes/seconds/hundredths format.
  Actions use the monotonic clock independently of rendering; stopping updates
  the displayed time immediately and excludes time spent paused.
- **Badge:** six persistent JPG slots; A/B selects an occupied slot; long press
  opens the edit dialog. The AP is `M5StopWatch-xxxx`; connecting a phone
  triggers captive-portal detection. Open `192.168.4.1` if the phone does not
  show its network login page, then crop/zoom, choose a background, upload, activate/delete
  slots and finish editing. The original phone editor limits source images
  to 3 MB and sends a resized JPG.
- **IMU:** live BMI270 acceleration, moving ball, orientation orbit and
  tap-to-toggle labels. Gyroscope magnitude changes the ball's size and
  integrated yaw moves the orbit indicator.
- **Audio.FFT:** 44.1 kHz ES8311 microphone capture, a 512-sample Hann-windowed FFT,
  twenty logarithmic bands, learned noise suppression, attack/decay smoothing,
  spectrum animation and a tap-to-toggle peak-frequency label.
- **LuckyWheel:** 2–18 options, balanced sector colors, clockwise/counterclockwise
  pointer spins, outward-facing labels, random outcomes away from sector
  boundaries and cubic easing.
- **Settings:** brightness, volume, button sound/vibration, RTC time and date,
  firmware version and the ten-tap blue-screen easter egg.

The example contains only TypeScript/JSX application code. Board bindings provide
`Battery`, `Clock`, `Haptics`, native key events and the shared ES8311 audio engine.
The microphone spectrum is calculated by a compiled TS `AudioWorkletProcessor`.
Microphone processing and factory button/alarm PCM tones share one 44.1 kHz
`AudioContext`; the original boot WAV plays through `new Audio(...).play()`.
The generic engine's `GEA_AUDIO_DEVICE_SAMPLE_RATE=44100` build option selects
the board's capture and playback clock, with full-duplex audio enabled.
`GEA_AUDIO_RECORD_GAIN_DB=30` selects the factory microphone input gain.
The badge editor runs through `http.createServer`, `WiFi.startAccessPoint`,
`WiFi.startCaptivePortal` and the
file-cache APIs; JPEG uploads arrive as typed `Uint8Array` request bodies.
Settings and alarms use `localStorage`. There are no app-owned C/C++ sources,
native compiler plugins or private hardware bindings.

For development against the workspace's updated APIs, build the plugin first
and run the following from the `examples` repository:

```sh
(cd ../core/packages/geatsc-plugin-gea && npm run build)

GEATSC2_GEA_PLUGIN="$PWD/../core/packages/geatsc-plugin-gea/dist/host-shims" \
GEA_TARGETS_ROOT="$PWD/../targets" \
GEA_COMPILER_DIR="$PWD/../compiler" \
GEA_CORE_DIR="$PWD/../core/packages/core" \
GEA_HOST_DIR="$PWD/../core/packages/host" \
GEA_ENGINE_DIR="$PWD/../core/packages/engine" \
GEA_ELEMENTS_DIR="$PWD/../core/packages/elements" \
GEA_PLUGIN_DIR="$PWD/../core/packages/geatsc-plugin-gea" \
GEA_IDF_JOBS=4 node ../cli/bin/gea.mjs build --board stopwatch --app m5-stopwatch

GEA_TARGETS_ROOT="$PWD/../targets" \
node ../cli/bin/gea.mjs flash --no-build --board stopwatch --app m5-stopwatch
```

The installed packages must include these APIs before the ordinary build command
can use them.

The 87 scoped tests exercise actual TS store actions, including a stalled-render
stopwatch sequence and factory classic-hand angles; daily alarm scheduling; date clamping; wheel outcomes;
microphone tone, noise, smoothing and high-frequency response; an independent
FFT reference, sample-clock publication at 60 Hz with unchanged DSP state; and
the six-slot badge HTTP routes with deferred shutdown. Source-based drag and picker
checks cover integer velocity history, momentum prediction, fixed-point easing,
stationary holds, axis locking, interrupted snaps, wrapping, finite limits,
shared samples across columns and original picker geometry.
The generic engine's native pixel regression also verifies rotated images,
noncentral and negative pixel origins, percentage origins, source alpha and
node opacity, clipping, retained snapshots and transform updates. Classic
hands and wheel labels use the factory pivots through standard CSS transforms.
Complete opaque numeric canvas batches can remain as retained framework commands:
the engine replays them in the normal painter order directly into the framebuffer
or DMA strips. Incremental drawing, images, text, paths and unsupported style
effects materialize the owned bitmap. Native pixel tests compare both paths,
including overlapping translucent geometry, overlays, clipping, snapshots,
poisoned 16-row strips and fallback after mutations.

Run those native checks from the `examples` repository:

```sh
bash ../core/packages/core/test/run-canvas-retained-batch.sh
bash ../core/packages/core/test/run-projected-image.sh
```

Both runners enable triangle occlusion and reuse the core test `.build` output.
These checks do not establish button sound audibility, display parity or the
device's frame rate.

Previous checks on the connected C152 StopWatch (2026-10-05) recorded
scheduler-only microphone-spectrum rates: 1,152 iterations in 19,179 ms
(60.1 per second), 57.9–60.7 across longer 300-iteration windows, and
62.1–62.5 in a later set of 300-iteration windows. These count scheduler
iterations, rather than rendered frames or completed display uploads. They do
not establish display FPS or a universally locked 60 FPS. Those checks reported
44.1 kHz capture with zero lost samples. The app requests 60 FPS at DPR 1.

The current same-board factory comparison records rendered frames and, in
diagnostic fenced windows, completed DMA uploads separately. Final benchmark
results remain pending. [Measurement definitions](comparison/METRICS.md) explain
the frame boundaries, configuration differences and instrumentation overhead;
the previous scheduler-only figures are not substituted for those results.

On-device badge validation confirmed new uploads, replacement of occupied slots,
byte-exact JPEG downloads (including a 257,178-byte replacement), rejection of
invalid uploads without damaging the
existing image, deletion and persistence across reboot. DHCP advertises the
board as DNS; wildcard DNS and all ten factory captive-portal redirects work.
A phone's automatic login window has not been observed directly. The firmware
stops HTTP/DNS and Wi-Fi on Close and restores the normal display buffers.
Watch faces, stopwatch, IMU, wheel and settings were also checked on the board.
The font audit corrected the body face to factory Montserrat Medium and restored
source line heights and text alignment. Device captures verify the curved top
clock, watch faces, stopwatch labels, brightness controls and wheel selector.
Eighty consecutive NumberFlow captures retained the seconds tens glyph; earlier
captures intermittently omitted it, and a physical-panel check remains pending.
On-device touch injection verified a short fast launcher flick advancing one page,
a slow held drag returning to its page and a reverse flick returning to the previous
page. The wheel selector advanced from 2 to 7 under momentum, retained 7 after a
small slow drag, selected 8 by a row tap and clamped at 2 and 18. The alarm minute
picker wrapped 00 to 59. Native captures confirm the factory's 164 px picker height,
46 px row pitch and 47 px selection band. The board's diagnostic injection now owns
the touch stream through release, preventing an idle physical controller from
prematurely lifting synthetic gestures. An interrupted-animation capture overlapped
with the user's physical touch and is not an isolated device assertion; focused
source-based tests cover that behavior.

The final firmware has a 404×202 confirmation dialog and a 466×466 settings list;
static universal CSS matching is covered by a native regression.
Physical A/B presses, speaker audibility and vibration still need hands-on
confirmation. The retained production image is 5,669,456 bytes, leaving
1,670,576 bytes in the 7 MiB application partition (7,340,032 bytes).
[The production artifact manifest](comparison/gea-production-build.json) records
its image hash and static-memory footprint. The shared native renderer's ESP-only triangle cache uses 33,536
bytes of PSRAM for immutable exact division results; desktop rendering keeps
its hardware-division path.

The transient factory startup artwork has a TypeScript component and appears for
one actual app frame. Target/runtime hardware initialization happens before the
TS entry point, so its earlier factory HAL phase and duration cannot be recreated
there. Comparison capture controls and the source/test inventory are documented
in [comparison/README.md](comparison/README.md).

Badge HTTP compatibility deliberately retains the factory's acceptance of
nonempty JPG-labeled bytes without validating their decoder contents. Error
status and plain message bodies match the source. Pinned ESP-IDF 5.5.4 labels
those error bodies `text/html`; Gea defaults to `text/plain`.
