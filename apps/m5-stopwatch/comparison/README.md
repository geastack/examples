# Factory comparison inventory

The reference is M5Stack/M5StopWatch-UserDemo at
`6b4aa125288b6fe9dca661f10159f6e1e5ee785c`. The durable checkout lives at
`vendored-sources/M5StopWatch-UserDemo` in the workspace. Regenerate these files
from the workspace root with:

```sh
python3 examples/apps/m5-stopwatch/comparison/build-inventory.py
```

- `screen-test-manifest.json` maps every installed tool screen, worker stage,
  common overlay and browser editor state class to the Gea route/component,
  primary source evidence and existing portable test definitions.
- `source-evidence.json` stores source paths, line anchors, excerpts and SHA256
  hashes. It distinguishes real screens from unused APIs and the uninstalled
  template demo.
- `source-metrics.json` records reproducible source footprint, each included
  file/hash and the five largest files per scope. This measures size and
  concentration, not cyclomatic complexity or developer productivity.

Finite state classes include all themes/palettes/modes as ranges, interaction
phases, empty/occupied/disabled cases, staged selectors and boundary values.
They do not claim to enumerate every possible clock reading, waveform or sensor
sample. A related test verifies its named assertions, rather than every behavior
in the associated screen. Hardware observations and paired screenshots must be
attached separately; a source mapping is never a visual pass.

Factory app C++ includes inline styling. Compare it with Gea TS/JSX **plus CSS**.
Factory HAL and support code are separate scopes. Frameworks, generated native
code, assets, tests and build configuration are excluded from these source-size
counts. Shared Gea compiler/runtime/target fixes were required during the port;
excluding them from application lines does not erase that engineering work or
justify a claim of zero native implementation cost. Both applications use
substantial shared native frameworks and drivers.

The factory tracks `sdkconfig.defaults`, `dependencies.lock` and `repos.json`.
Use these production inputs for device comparison. A simulator build or an
inferred SDK default is a different configuration and must be labeled.

Measurement definitions and benchmark collection tools are documented in
[METRICS.md](METRICS.md).

Previous microphone-spectrum rates in the application README count scheduler
iterations. They do not measure rendered frames or completed display uploads.
Current comparison windows retain these frame boundaries separately; final
results are pending. A diagnostic completion fence applies to the configured
StopWatch DMA pipeline and does not establish panel scan rate, universal 60 FPS
or whole-screen pixel parity. Font-table equality, source mappings and intact
gesture receipts establish their specific evidence, not those broader claims.

## Capture controls and honest limits

The Gea startup artwork now appears for one actual app frame. TS begins after
native target/runtime initialization, so this cannot reproduce the factory's
pre-application HAL startup phase or its duration. For a report image only, save
the previous value of `localStorage['m5watch.comparisonBootHoldMs']`, set it to
`'5000'`, restart the app and capture the startup screen. The hold is clamped to
5,000 ms, does not repeat the boot WAV or initialization, and is absent by
default. Restore the saved value (or remove the key if originally absent) before
benchmarking. The corresponding test is `scripts/startup.test.mjs`.

FFT peak interpolation retains the factory's normalized center power and raw
neighbor powers. The off-bin peak label is intentionally less accurate than the
previous corrected Gea implementation; the reference-formula test records this.
Do not present its restoration as an accuracy improvement.

Badge uploads preserve the factory acceptance policy: any nonempty, bounded
JPG-labeled body can be stored without decoder validation, including invalid
JPEG bytes. Slot parsing preserves ESP-IDF numeric prefixes, case-insensitive
keys and buffer limits. Error status/message semantics match the source; the
pinned ESP-IDF 5.5.4 sends the custom message directly with `text/html` MIME,
while Gea defaults to `text/plain`. There is no generated HTML envelope.

Text antialiasing, rounded edges and canvas rasterization use different renderers.
No pixel identity, universally locked 60 FPS, speed advantage, audible output,
tactile feedback or captive-phone experience is established by this inventory.
The factory About joke does not actually reboot. There is no installed Off or
factory-reset screen; PMIC power/charging and the unused reset API are separate
hardware/platform concerns.

The embedded font source now imports the exact pinned factory bitmap tables,
including coverage, bearings, line metrics, fractional advances and pair kerning.
Browser font declarations retain their TTF sources. The app declares these TTF
and JSON inputs as compile-time-only assets so the embedded runtime does not
carry duplicate input files. Import data equality is checked independently from
final screen placement and compositing; rounded edges and transformed text still
require actual paired captures.

Gea comparison captures use `GEADEV UPLOADSHOT ARM` and `READ`. The diagnostic
captures accepted CO5300 RGB565 payload bytes during an ordinary full redraw,
requires full display coverage, and waits for completed DMA before export. It
does not replay the retained scene into a screenshot canvas or read panel GRAM.
Its temporary PSRAM allocation is released after each export and is prohibited
during benchmark windows. Static watch captures disclose a system-only frozen
fixture clock; animation timing remains monotonic and freeze is disabled before
benchmarks or time-dependent workflows.

`restore-gea.py` reconstructs saved device data with the complete physically muted
diagnostic boot set before flashing. It verifies the immutable full backup and
every firmware component, including OTA selection, rather than allowing the old
production image to boot between restoration and diagnostic installation. The
backup and merged restoration image remain private in the existing ignored build
output; they may contain device credentials and are excluded from report exports.

Factory Settings content coordinates are reproducible from its cursor layout:
section labels at y=36, 513 and 850; button tops at 88, 228, 368, 565, 705 and
902; x=46, width=374, height=119. Scroll the same content offset on both builds
before capturing later sections. Slider endpoints, picker drag/fling/settle,
modal cancellation, busy/error upload states and hardware button actions require
behavioral sequences in addition to still images.

Offline paired capture analysis runs with
`python3 comparison/compare-captures.py --factory ../../reports/m5-stopwatch/captures/factory --gea ../../reports/m5-stopwatch/captures/gea`.
It writes `examples/reports/m5-stopwatch/paired-capture-analysis.json`, comparing matching PNG filenames without
rescaling, automatic alignment or tolerance. It reports changed pixels, channel
errors, difference bounds and file hashes. Different dimensions are uncomparable in the raw metrics. Optional
`--use-receipt-crops` applies only a receipt `pixelGeometry` with matching
`rawSize`, integer `crop: [x,y,width,height]`, and nonempty geometry `evidence`.
For the 468×466 factory buffer, `[1,0,466,466]` requires recorded source/display
coordinate evidence; it is never inferred from image content. Raw images and raw
metrics remain intact. A second, separately labelled metric evaluates pixel
centers inside the aligned image’s inscribed circle, excluding rectangular
corners outside a round panel. The full rectangular metric is always retained.
Factory receipt `wireEncoding` must confirm the decoded RGB565 transport; unconfirmed
frames are marked unsuitable for pixel interpretation. Gea receipts must retain
the actual upload transport, completed-DMA marker and matching geometry; retained
scene replay does not qualify. Browser receipts separately require actual PNG
dimensions, control assertions, backend state and preview evidence.
These measurements describe rendering differences; they do not prove feature
parity or identify their cause.

The actual Badge portal is exercised with `check-portal.mjs`. On this Mac, direct
Node and Chrome requests to the AP were denied while system curl worked. The
collector therefore relays real device HTML and backend response bytes into the
browser. Crop, preview and controls still execute the unmodified factory page,
and uploads reach the physical board. This transport does not establish direct
browser connectivity or automatic captive-window launch on a phone. Failed
attempt receipts are preserved. The factory returns 404 for `/connecttest.txt`;
its other tested discovery routes and wildcard DNS respond.

For finite state coverage, each framework's capture receipt (a `results*.json` array or per-image JSON object) must include
`manifestScreenId`, the exact `manifestState` string from the inventory,
`stateVerified: true`, and a nonempty `stateEvidence` explaining the assertion or
observed state. Both receipts must identify the same state. Existing receipts
without this evidence remain unverified even when their images are identical.
Dynamic inputs such as time, IMU, microphone samples, wheel motion and animation
phase need matching evidence before a paired frame is interpreted as visual
parity. Run `python3 comparison/capture-analysis.test.py` for the offline checks.

`gesture-plan.json` defines 21 shared normal-HAL pointer recipes for launcher,
rollers and the Settings list: subthreshold motion, threshold crossing, fast
throw, slow drag, stationary hold, direction reversal and interrupted snapping.
`execute-gesture-plan.mjs` accepts a diagnostic backend with `prepare(recipe)`
and `runScheduled({ events, observeAtMs, normalHal })`. Its result must contain
actual pointer-read times and observation timestamps/positions. A prepared route,
initial selection/offset evidence and a verified physical mute clamp are required.
The executor retains timing evidence and never declares behavior parity itself.
Factory TREE dumps and USB screenshot emission pause the GUI; use compact
position telemetry during gestures and collect screenshots afterward. Identical
command recipes with missing or mismatched input sampling are not drag-parity
measurements.

The analysis also reports canonical RGB565 comparisons by reconstructing stored
channel bits (`r & 0xf8`, `g & 0xfc`, `b & 0xf8`). An exhaustive 65,536-word test
proves both floor scaling and bit replication round-trip to the same words.
This distinguishes rendering differences from PNG channel-expansion differences;
raw RGB metrics remain available and no tolerance is applied. The current factory
decoder uses the same bit replication as the Gea CLI.

`prepare-gea.mjs` seeds quiet preferences, skips the startup guide for repeatable
sampling, clears the comparison startup hold, reboots, and verifies only those
fixed storage keys. It also clears capture, gesture and frozen-clock controls.
Its clamp evidence is the flashed diagnostic artifact and its compile-time guards;
there is no independent live codec/motor-register readback command. Quiet UI
preferences provide an additional safeguard. While the user is sleeping, leave
that physically silent diagnostic image installed after restoring original data.

`check-portal.mjs` drives the original browser editor against the real device AP.
It captures desktop/mobile layouts, actual cropping, busy controls under a
controlled request delay, upload success, and a real empty-body server error.
Uploaded PNG/JPEG fixtures include 200×200 and 320×180 images to verify native
centering without resize, as well as full-size images and distinct slot colors.
Byte readback and active-slot HTTP checks do not establish device decoding:
retain subsequent display captures and normal A/B navigation evidence separately.
A desktop HTTP/DNS test does not prove automatic phone captive-login launch.
Browser receipts identify Playwright, actual PNG dimensions, viewport, backend
state and control assertions; they do not require device RGB565 wire metadata.

After the final capture assessment, `report-captures.py` fills the PDF appendix
from its retained comparisons. It selects readable browser viewport captures
while preserving full-page originals and their measurements. `report.py` uses
only explicit source-backed logical crops and retains raw source files. Render
and inspect every PDF page before presentation.
