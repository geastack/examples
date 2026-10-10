# Factory feature parity

Reference: [M5StopWatch-UserDemo, 6b4aa125288b6fe9dca661f10159f6e1e5ee785c](https://github.com/m5stack/M5StopWatch-UserDemo/tree/6b4aa125288b6fe9dca661f10159f6e1e5ee785c).
Watch springs and IMU interpolation follow its pinned smooth_ui_toolkit v2.12.1 dependency.
This checklist records the behavior checked against the source; the README records actual device measurements.

| Area             | Factory behavior carried into the example                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup          | Original artwork and boot WAV; Home gesture guide on the first five boots; Home chord exits the guide.                                                                                                                                      |
| Launcher         | Eight tools in factory order; wrapping carousel, finger-following drag and snap, original arrow artwork, nearest-page dots and fading title, remembered selection, curved top clock.                                                        |
| Common input     | A/B feedback on physical press; navigation on a short release; A+B held for Home; Simple-face and alarm-row holds fire while pressed and do not also click. Modal alarms and the badge editing session block underlying navigation.         |
| Battery          | First launcher popup after 800 ms, shown for 1,800 ms; later popups for 6,000 ms; launcher charging transition sampled once per second; original spring positions and timing.                                                               |
| Fonts            | Factory Montserrat Medium body text and SemiBold titles; Maple Mono Medium and Commissioner Medium custom faces; source line heights, centered controls and required generated glyphs.                                                      |
| Classic watch    | Three display modes, fractional clock-hand positions and original hand images/pivots, uppercase weekday and factory time/date text.                                                                                                         |
| NumberFlow watch | Ten color themes; independent rolling digits, wrap direction/endpoints and preserved spring velocity; factory date text.                                                                                                                    |
| Big Number watch | Original digit artwork in four palettes.                                                                                                                                                                                                    |
| Simple watch     | Ten themes; shortest-path second-dot spring; stationary long hold toggles the dot; three-second entry hint.                                                                                                                                 |
| Stopwatch        | Physical press actions and spring feedback; start/pause/resume/reset, monotonic elapsed time, hundredths, cumulative laps newest first, scrolling, reset on exit.                                                                           |
| Alarms           | Persistent daily alarms, 07:00 add default, enable/disable, stationary hold deletion with confirmation, sequential simultaneous alerts, dismiss button, original sound/vibration cadence.                                                   |
| Badge            | Six persistent JPEG slots, occupied-slot selection, fallback after deletion/startup, original phone editor and crop controls, upload activation, thumbnail URLs, MIME checks, 2 MiB request bound, persistence and deferred Close shutdown. |
| Captive portal   | AP MAC suffix in SSID; wildcard IPv4 DNS and DHCP DNS offer; all ten factory probe paths redirect to the editor with HTTP 302 and Location.                                                                                                 |
| IMU              | Factory physical axis mapping, reset on entry, label toggle, conditional orbit visibility, independent linear ball/orbit interpolation, gyroscope size and yaw behavior.                                                                    |
| FFT              | 44.1 kHz microphone capture, 512-sample FFT, 20 logarithmic bands, factory Float32 smoothing/motion and persistent DSP state across reopening, peak-label toggle.                                                                           |
| Wheel            | Plain 2–18 option labels, factory color ordering, random direction/outcome/duration, pointer timing, easing and reset on entry.                                                                                                             |
| Settings         | Six workers; brightness 10–100, volume 0–100, sound/vibration switches, RTC time selector, staged date selector and live summaries, only the active worker saved, V0.5 text and ten-tap blue-screen sequence.                               |
| Audio            | Shared audio engine, factory Float32 PCM tone generation with 200-sample fade and replacement behavior, original note frequencies, mute behavior, 30 dB microphone input gain.                                                              |

The application contains TS/JSX and component CSS. HTTP, file cache, captive DNS,
buttons, sensors, battery, RTC, haptics and audio use shared framework/target APIs.

Launcher dragging follows the pinned [LVGL 9.5 input and scroll implementation](https://github.com/lvgl/lvgl/tree/v9.5.0/src/indev): the 10 px capture threshold, dominant-axis locking, eight pointer samples with 99 ms decay, integer throw prediction with 10% friction, one-page limits, center snapping and interruptible 200–400 ms fixed-point ease-out. Pointer history is shared across controls. The original dynamic title retains its previous opacity beyond the transition range, and indicator centers stay 16 px apart.

The launcher captures immediately when input crosses the movement threshold,
without waiting for a factory input sample. After capture, each
frame includes the latest pointer displacement rather than waiting for the next
33 ms factory input sample. Momentum history still samples at the factory cadence;
release commits the visible position before snapping. Other controls retain their
original sampled behavior. A 60 Hz frame request is not a measured presentation
rate; rendering and display-transfer time still determine device throughput.

The snap keeps its three physical icon sources stable through the midpoint,
then re-centers them after settling. Fixed-size image replacements repaint their
own boxes, and the title fades through retained alpha commands. Native replay
eligibility checks the actual transfer windows, so the unchanged curved clock
does not force moving content below it onto the general renderer. A real clock
update or transformed ink intersecting those windows retains the general path.

Pickers retain [LVGL 9.5 roller geometry](https://github.com/lvgl/lvgl/blob/v9.5.0/src/widgets/roller/lv_roller.c), tap selection, finite limits, infinite-page allocation and recentering after settling. At the user's request, dragging samples continuously and releases preserve pointer velocity, coast with a 550 ms exponential decay constant, and use a separate 140 ms final row alignment once speed falls below 0.035 px/ms. Finite limits stop the coast at the boundary. Taps retain the short snap, and a new touch interrupts the glide immediately. Roller mounts receive only their stable field identity and read the live selection through SystemStore.valueFor; passing the changing number as a native child prop recreated the component at release and discarded its animation. Store-only gesture tests did not exercise that mount boundary. Factory theme configuration and style order produce a 164 px box, 46 px row pitch and 47 px selected clipping band. Both text layers use white Montserrat 28; neighboring rows are not artificially faded. Settings opts into native momentum scrolling and restricts scrolling to the vertical axis.

The native renderer rebuilds retained scroll geometry and repaints its underlay when the framebuffer scroll fast path is rejected. Fused DMA rendering never uses framebuffer scroll/pan shortcuts because that framebuffer is stale. Previously its fallback updated row layout while leaving their drawing commands at the old positions. Pixel regressions cover overlapping overlays and fused DMA staging with a poisoned framebuffer, rounded rows, gaps, and repeated forward/reverse scrolling against full repaints. Retained screenshots alone do not validate the panel path.

Gea renders through its own engine rather than LVGL, so antialiasing and canvas
rasterization can differ. The FFT peak-frequency interpolation now reproduces
the factory's mixed raw and normalized power units. The checklist does not
establish pixel identity or a locked 60 FPS.

The original startup title/status/version now appears for one TS app frame.
Native target/runtime initialization precedes TS execution, so the factory's
prior HAL initialization phase remains a lifecycle limit. The bounded comparison
hold is disabled by default and must be cleared/restored before benchmarking.

Badge uploads retain the factory's unvalidated JPG-body policy and ESP-IDF
slot-prefix parsing, route precedence and plain error messages. Pinned ESP-IDF
5.5.4 labels error bodies `text/html`; Gea defaults to `text/plain`. See the durable
[screen/test manifest](comparison/screen-test-manifest.json) for explicit source
anchors, finite state classes and validation limits.

Hardware verification on 2026-10-10 (`stopwatch`, MAC `28:84:85:45:0B:98`, final image 6,452,608 bytes): the LuckyWheel Roller remained native node 44 across releases in both directions; the previous number-prop mount changed 44 to 67 at release. Settings scrolled to 501 and back to 0 in forward/reverse gestures. Brightness was set to 50. All 56 roller/store tests, TypeScript checking, retained rendering regressions, and the fused DMA/scroll-fallback pixel regression passed. Panel FPS was not measured, and retained screenshots are not evidence of live panel compositing.

Alarm deletion verification on 2026-10-10 (`stopwatch`, image 6,454,304 bytes): the compiler JSX runtime's reactive list rebuilt rows by appending them after static siblings. Before correction, deleting a second test alarm moved Add to y=88 and the remaining row to y=228. The runtime now bookmarks the list position before removing rows; an empty list retains a hidden marker, and populated lists remove it. The native tree regression covers initially empty/populated lists, two-to-one deletion, repeated empty transitions, coalescing, and disposal. On hardware, the remaining row stays at y=88 and Add at y=228 after deletion.

The same hardware check exposed JSON persistence reading a native live view's default backing slots: the remaining alarm saved as zero-valued fields despite displaying its real time. Native view origins now retain a typed JSON route to their source allocation; serialization follows that source, including through another view, without boxing it. Native view and existing Document-owner serialization regressions pass under ASan/UBSan. Hardware save readback retains the original 12:00 enabled alarm after adding and deleting a 07:00 test alarm, and after reboot; the row/Add positions remain 88/228 and brightness remains 50. The original saved data was restored before flashing. Performance/debug logs remain disabled. The broad compiler emitted-set gate reports existing working-tree drift (137 corpus rows moved; 1,174 runtime rows moved, 101 gained, two lost); it is not a passing gate.

Compiler rebuild validation reached successful architecture/TypeScript compilation, three binding-composition tests, 202 global-host tests, 11 deferred-intrinsic tests, native and 16-bit-wchar runtime-header syntax checks, ten recursive-carrier tests, dynamic-value metadata, and 70 value-contract tests. The remaining post-build checks were stopped during declaration overlays after hardware verification, under heavy shared machine load. The full compiler build validation is therefore incomplete.

Menu caret layering correction on 2026-10-10: both positioned arrow buttons have z-index 1, above the moving menu icons. Previously the left arrow's earlier JSX sibling position let icons paint over it during overlap. The native retained-rendering regression covers a caret descendant declared before an icon, repeated motion across it, and equality with full repaint. That regression and the app TypeScript check pass. The 6,454,320-byte production image was built and flashed with verified hashes to `stopwatch`; the device responded after reboot, both caret nodes were present, and left/right drag commands completed. Brightness remains 50 and performance/debug logging remains disabled. Overlay pixel ordering is covered by the native regression; the physical panel was not directly observed.
