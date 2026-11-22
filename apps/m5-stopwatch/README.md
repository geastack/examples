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

## Build and flash

From the `examples` repository, after `npm install` at its root and
`npx gea setup` (choose **M5Stack StopWatch (C152)**; the suggested alias is
`stopwatch`, substitute yours if it differs):

```sh
npx gea flash --board stopwatch --app m5-stopwatch --monitor
```

`gea flash` builds first; `npx gea build --board stopwatch --app m5-stopwatch`
only compiles.

## Controls

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

## Tests and formatting

```sh
npm run format --workspace apps/m5-stopwatch
npm run format:check --workspace apps/m5-stopwatch
npm run check --workspace apps/m5-stopwatch
npm test --workspace apps/m5-stopwatch
```

The tests exercise the TS store actions (stopwatch, alarm scheduling, date
clamping, wheel outcomes), the microphone DSP against an independent FFT
reference, the badge HTTP routes, and the drag/picker physics.
[comparison/README.md](comparison/README.md) documents the factory comparison
captures.

## Contributor build (sibling checkouts)

To build against unreleased framework sources, run from the `examples`
checkout with the `core`, `targets`, `compiler` and `cli` checkouts next to it
(one parent directory holding all five), after building the plugin:

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
```

Run the same command with `flash` in place of `build` to build and install it.

The engine's native pixel regressions for the retained canvas batches and
projected images run from the same layout:

```sh
bash ../core/packages/core/test/run-canvas-retained-batch.sh
bash ../core/packages/core/test/run-projected-image.sh
```
