import { Display, Profiler, loadAssetImage } from '@geastack/core'
import type { GeaCanvasElement, GeaEmbeddedImage } from '@geastack/core'

// A watchOS-style honeycomb of circles you can pan around. Everything is
// drawn each frame into one <canvas>, so the fisheye scale — circles shrink
// as they near the screen edge — recomputes from the live pan offset on every
// frame. Layout, radii, and physics are all derived from `unit = min(W, H)`,
// so the same code fits a round watch, a square AMOLED, the P4, or e-paper.

const W = Math.max(1, Math.floor(window.innerWidth))
const H = Math.max(1, Math.floor(window.innerHeight))
const unit = Math.min(W, H)
const CX = W / 2
const CY = H / 2

const COUNT = 30

// --- Layout / sizing (all relative to `unit`, so it's responsive) ----------
const BASE_RADIUS = unit * 0.11 // full-scale circle radius
const PITCH_X = unit * 0.25 // centre-to-centre spacing on a row
const PITCH_Y = PITCH_X * 0.866 // hex row spacing (√3/2)

// The physical panel is a ROUNDED rectangle (the AMOLED clips its corners with a
// 64px radius), so the visible boundary near a corner is the corner arc, not the
// square edge. The fisheye measures distance to this rounded boundary, so bubbles
// start shrinking earlier as they approach a corner and never get clipped by it.
const CORNER_RADIUS = Math.min(128, W / 2, H / 2)
const INNER_HALF_W = W / 2 - CORNER_RADIUS // half-width of the straight-edge span
const INNER_HALF_H = H / 2 - CORNER_RADIUS

// Safe-area inset: the panel's extreme edge columns/rows fall in the bezel/curve,
// so the fisheye targets a boundary pulled IN by this many px. Circles stay this
// far short of the absolute framebuffer edge instead of being drawn tangent to it
// (which spilled into the panel edge). Tune to taste.
const PAN_MARGIN = 50 // px of overscroll past the grid's own bounding box
const EDGE_INSET = 6
const EDGE_FISHEYE = true

// No-shrink interior band. A circle only shrinks within (CORNER_RADIUS - EDGE_INSET -
// BASE_RADIUS) of the rounded boundary. If |dx| <= NS_HALF_W AND |dy| <= NS_HALF_H it
// sits comfortably inside that band on BOTH axes (the *0.707 folds the corner diagonal
// into an axis box), so it CANNOT be shrinking — computeFisheye skips the entire SDF
// (the soft-double qx/qy/ox/oy/dist/sqrt/e) and just translates base + pan. Most
// circles, most frames, are interior: there is genuinely nothing to recompute.
const NS_SHRINK_REACH = CORNER_RADIUS - EDGE_INSET - BASE_RADIUS
// How far past the inner straight-edge rect a circle can sit before it starts to
// shrink. On a straight edge the full reach applies; in a corner the diagonal-safe
// box (×0.707) is used so sqrt(qx²+qy²) <= NS_REACH.
const NS_REACH = NS_SHRINK_REACH > 0 ? NS_SHRINK_REACH : 0
const NS_REACH_DIAG = NS_REACH * 0.7071067811865476

// INTEGER fast path. The S3 FPU is single-precision, so JS `double` math is software-
// emulated and slow; integer math (Int32Array reads + int add/sub/compare) is hardware
// and fast — the reason bouncing-balls runs 1000 balls. Per-circle screen positions and
// the geometry constants are pre-rounded to int here so the fisheye's hot path (the
// interior test + the translate that 16/30 circles take) is pure integer.
const baseScreenX = new Int32Array(COUNT) // CX + baseX[i], rounded (no pan)
const baseScreenY = new Int32Array(COUNT)
const _panI = new Int32Array(2) // [floor(panX), floor(panY)] — refreshed once per frame
// Integer geometry constants: [CX, CY, INNER_HALF_W, INNER_HALF_H, NS_REACH, NS_REACH_DIAG, BASE_RADIUS, W, H]
const _ci = new Int32Array(9)
// Fisheye: a circle is FULL SIZE until its perimeter actually touches a screen
// edge (its centre is within one radius of it). From there its radius is just
// the distance to the nearest edge, so it stays tangent to the boundary — fully
// visible the whole time — and shrinks to nothing exactly at the edge. No
// margin: shrinking begins right at the edge, not before.

// --- Pan / inertia physics --------------------------------------------------
// Velocity is tracked in px/ms (framerate-independent). dt is floored before
// dividing so a tiny frame interval (the sim can run at 200+fps) can't spike
// the estimate, and the result is capped so a flick can't fling the cluster
// far past the rubber-band faster than the spring recovers.
const INERTIA_DAMP = 0.94 // velocity retained per ~16ms after release
const VELOCITY_SMOOTH = 0.6 // EMA on the dragging velocity estimate
const VEL_DT_FLOOR = 6 // ms; min interval used in the velocity divisor
const VEL_MAX = unit * 0.012 // px/ms; cap on release fling speed
const RUBBER = 0.55 // drag resistance once past the pan limit
const SPRING_K = 0.18 // pull back toward the limit when released past it
const STOP_VEL = 0.004 // px/ms below which inertia is considered stopped

// --- Press / tap feedback ---------------------------------------------------
const TAP_TOL = unit * 0.03 // max finger travel still counted as a tap
const PRESS_MS = 420 // press bounce duration
const LABEL_MS = 1400 // how long the tapped label stays up
const LABEL_FONT_PX = 18 // must equal the .bubble-grid-label size baked in fonts.css

const baseX = new Float64Array(COUNT)
const baseY = new Float64Array(COUNT)
// Per-circle colours: a golden-angle HSV spread, packed once at layout into
// native pixels, read each frame at the draw call.
const colorR = new Int32Array(COUNT)
const colorG = new Int32Array(COUNT)
const colorB = new Int32Array(COUNT)
const color565: Rgb565[] = new Array(COUNT)
const batchX = new Uint16Array(COUNT)
const batchY = new Uint16Array(COUNT)
const batchColor: Rgb565[] = new Array(COUNT)
const scalarX = new Int32Array(COUNT)
const scalarY = new Int32Array(COUNT)
const scalarR = new Int32Array(COUNT)
const scalarColor: Rgb565[] = new Array(COUNT)
const scalarBatchX = new Uint16Array(COUNT)
const scalarBatchY = new Uint16Array(COUNT)
const scalarBatchColor: Rgb565[] = new Array(COUNT)
function setHsvColor(i: number, h: number, s: number, v: number): void {
  _dbgHsv++
  const c = v * s
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) { r = c; g = x } else if (hp < 2) { r = x; g = c } else if (hp < 3) { g = c; b = x }
  else if (hp < 4) { g = x; b = c } else if (hp < 5) { r = x; b = c } else { r = c; b = x }
  const m = v - c
  colorR[i] = Math.round((r + m) * 255)
  colorG[i] = Math.round((g + m) * 255)
  colorB[i] = Math.round((b + m) * 255)
  color565[i] = rgb565(colorR[i], colorG[i], colorB[i])
}
// Fisheye output for one circle, set by computeFisheye(i). Plain module globals
// instead of per-circle scale/drawnX/drawnY arrays: both the draw loop and
// hitTest call computeFisheye(i) and read these back, so the hot path does zero
// bounds-checked array WRITES (the old arrays cost 90 such writes/frame and
// existed only to hand positions to the rare hitTest).
let fishX = 0
let fishY = 0
let fishR = 0

// ── Icon mode ───────────────────────────────────────────────────────────────
// Draw each bubble as a watchOS-style app icon (white glyph on a coloured disc,
// one per NAMES entry) instead of a flat filled circle. The icons are bundled
// PNG/JPEG assets under assets/icons/, generated by tools/build-icons.py from
// Material Design Icons (Apache-2.0); the disc colours are the same golden-angle
// HSV wheel setHsvColor() paints, so the two modes look consistent.
//
// >>> COMMENT OUT THE SINGLE ASSIGNMENT BELOW to go back to plain circles. <<<
// It is a `let` seeded to '' precisely so removing that one line disables icon
// mode outright — every icon path is guarded on ICON_SET being non-empty.
// Point it at .../jpg instead of .../png to compare the two encodings.
let ICON_SET = ''
ICON_SET = 'assets/icons/jpg'

// The file extension is the last three characters of the directory name, so the
// line above is genuinely the only thing to edit when switching encodings.
const ICON_EXT = ICON_SET.length > 0 ? '.' + ICON_SET.substring(ICON_SET.length - 3) : ''
// Hoisted: `ICON_SET.length > 0` inside the draw loop lowers to
// gea_cpp_string_utf16_length() -- a real string walk, re-run for every bubble
// of every frame. The answer is fixed at startup.
const ICONS_ON = ICON_SET.length > 0
const iconImages: GeaEmbeddedImage[] = []
// Basenames match tools/build-icons.py: NN-lowercased-name.
const ICON_STEMS = [
  '00-pocketcasts', '01-simplenote', '02-icecubes', '03-kickstarter',
  '04-loop', '05-netnewswire', '06-bitwarden', '07-brave',
  '08-deltachat', '09-duckduckgo', '10-element', '11-ente',
  '12-freeotp', '13-homeasst', '14-swiftfin', '15-kiwix',
  '16-firefox', '17-mullvad', '18-nextcloud', '19-openhab',
  '20-organicmaps', '21-osmand', '22-owncloud', '23-session',
  '24-raivo', '25-threema', '26-vlc', '27-wikipedia',
  '28-wire', '29-wordpress'
]

function loadIcons(): void {
  if (ICON_SET.length == 0) return
  // Decoding is deferred to first draw and memoized per asset, so this only
  // resolves paths to slot ids; the RGB565 conversion happens on frame 1.
  for (let i = 0; i < COUNT; i++) {
    iconImages.push(loadAssetImage(ICON_SET + '/' + ICON_STEMS[i] + ICON_EXT))
  }
}

const NAMES = [
  'Pocket Casts', 'Simplenote', 'Ice Cubes', 'Kickstarter',
  'Loop', 'NetNewsWire', 'Bitwarden', 'Brave',
  'Delta Chat', 'DuckDuckGo', 'Element', 'Ente',
  'FreeOTP', 'Home Asst', 'Swiftfin', 'Kiwix',
  'Firefox', 'Mullvad', 'Nextcloud', 'openHAB',
  'Organic Maps', 'OsmAnd', 'ownCloud', 'Session',
  'Raivo', 'Threema', 'VLC', 'Wikipedia',
  'Wire', 'WordPress'
]

// Pan state.
let panX = 0
let panY = 0
let velX = 0
let velY = 0
let maxPanX = 0
let maxPanY = 0

// Drag tracking. Velocity is measured per-frame (displacement this frame ÷
// frame dt) so we never need per-event timestamps, which the runtime's Event
// type doesn't expose.
let dragging = false
let lastX = 0
let lastY = 0
let dragDX = 0 // pan displacement accumulated since the last frame
let dragDY = 0
let downX = 0
let downY = 0
let moved = 0

// Press feedback. A tap only records WHICH circle in `wantPress`; the frame
// loop stamps the start times, because reading the frame clock (lastFrameMs)
// from inside an event handler is unreliable on the WASM/device path — handler
// writes to module globals propagate, but the clock read can be stale.
let wantPress = -1
let pressIndex = -1
let pressStartMs = 0
let labelIndex = -1
let labelStartMs = 0

// Clock + FPS. Different runtimes expose a usable clock differently: on the
// WASM sim the requestAnimationFrame timestamp is frozen but Date.now() ticks;
// on device the rAF timestamp ticks. So each frame we take whichever delta
// looks sane (rAF arg first, then Date.now()), and otherwise step a fixed
// amount — the loop's animation ALWAYS advances, and FPS reads real whenever a
// clock works.
const FALLBACK_DT = 16 // ms per frame when no clock is usable
let clockMs = 0 // synthetic monotonic clock driving all animation
let prevRaf = 0 // last requestAnimationFrame timestamp
let prevWall = 0 // last Date.now() reading

// === DEBUG: per-second call counts (find redundant recompute). Logged + reset
// every 60 frames from step(). Expected at 30 balls / 60fps: fisheye≈1800/s,
// fill≈1800/s, step=draw≈60/s, build/hsv=0/s after init. Anything else is redundant.
let _dbgFrames = 0
let _dbgFisheye = 0
let _dbgFast = 0
let _dbgEdge = 0
let _dbgShrink = 0
let _dbgFill = 0
let _dbgIcon = 0
let _tPresent = 0
let _dbgStep = 0
let _dbgDraw = 0
let _dbgHitTest = 0
let _dbgBuild = 0
let _dbgHsv = 0
let _dbgPressBump = 0
let _dbgApplyPan = 0
// Section timers (microseconds, summed over the 60-frame window) to attribute cb.
let _tStep = 0
let _tClear = 0
let _tLoop = 0
let _tText = 0
let fps = 0
let frameMs = FALLBACK_DT
// The live fps/frameMs above update every frame (smooth EMA). The DISPLAYED
// readout is latched from them only every FPS_SAMPLE_MS so the number on screen
// is legible instead of flickering each frame.
const FPS_SAMPLE_MS = 500
let displayFps = 0
let displayFrameMs = FALLBACK_DT
let lastFpsSampleMs = -FPS_SAMPLE_MS
// Pre-baked, constant-per-run readout geometry + a cached text string. drawFps() runs
// EVERY frame; building the font string and the "N FPS  M ms" text there meant ~5 boxed
// string allocations + a font re-parse per frame (gea_cpp_to_string concats) for numbers
// that only change every 500ms. So bake the font/position once and rebuild the text only
// when the latched readout changes — drawFps then just sets a const font and draws a cached
// string.
const FPS_FONT_PX = Math.round(unit * 0.1)
const FPS_FONT = FPS_FONT_PX + 'px Bebas Neue'
const FPS_EST_WIDTH = Math.round(FPS_FONT_PX * 5.0)
const FPS_X = Math.round(CX - FPS_EST_WIDTH / 2)
const FPS_Y = H - FPS_FONT_PX - Math.round(unit * 0.02)
let fpsText = '0 FPS   16.0 ms'
let showFpsOverlay = Date.now() < 0

type Canvas2DContext = ReturnType<GeaCanvasElement['getContext']>
let ctx: Canvas2DContext


// Build the honeycomb: generate a hex lattice, keep the 20 nodes nearest the
// centre (gives a round watchOS-style blob), then recentre on the centroid.
function buildLayout(): void {
  _dbgBuild++
  const cax = new Float64Array(81)
  const cay = new Float64Array(81)
  const cad = new Float64Array(81)
  let n = 0
  for (let row = -4; row <= 4; row++) {
    const offset = ((row % 2) + 2) % 2 === 1 ? PITCH_X / 2 : 0
    for (let col = -4; col <= 4; col++) {
      const x = col * PITCH_X + offset
      const y = row * PITCH_Y
      cax[n] = x
      cay[n] = y
      cad[n] = x * x + y * y
      n++
    }
  }
  // Partial selection sort: pull the COUNT nearest candidates to the front.
  for (let i = 0; i < COUNT; i++) {
    let best = i
    for (let j = i + 1; j < n; j++) {
      if (cad[j] < cad[best]) best = j
    }
    const tx = cax[i]
    const ty = cay[i]
    const td = cad[i]
    cax[i] = cax[best]
    cay[i] = cay[best]
    cad[i] = cad[best]
    cax[best] = tx
    cay[best] = ty
    cad[best] = td
  }
  let mx = 0
  let my = 0
  for (let i = 0; i < COUNT; i++) {
    mx += cax[i]
    my += cay[i]
  }
  mx /= COUNT
  my /= COUNT
  let extentX = 0
  let extentY = 0
  for (let i = 0; i < COUNT; i++) {
    baseX[i] = cax[i] - mx
    baseY[i] = cay[i] - my
    baseScreenX[i] = CX + baseX[i] // rounded to int by the Int32Array store
    baseScreenY[i] = CY + baseY[i]
    setHsvColor(i, i * 137.5 + 12, 0.82, 1)
    if (Math.abs(baseX[i]) > extentX) extentX = Math.abs(baseX[i])
    if (Math.abs(baseY[i]) > extentY) extentY = Math.abs(baseY[i])
  }
  // Pan range: let any circle be dragged all the way to the centre (plus a
  // little slack) so the grid feels free to move instead of pinning early.
  // Pan travel = however far the grid overflows the panel, plus a small
  // overscroll. The old limit (half the grid's own width) let you drag until
  // the far column reached screen centre, i.e. most of the icons off-display.
  // Clamp to the grid BOX instead: you can reach the far edge and PAN_MARGIN
  // beyond it, and no further. A grid narrower than the panel gets only the
  // margin, so it can wobble but never wander off.
  maxPanX = Math.max(0, extentX + BASE_RADIUS - W / 2) + PAN_MARGIN
  maxPanY = Math.max(0, extentY + BASE_RADIUS - H / 2) + PAN_MARGIN
  // Pre-round the geometry constants to int for the fisheye's integer hot path.
  _ci[0] = CX
  _ci[1] = CY
  _ci[2] = INNER_HALF_W
  _ci[3] = INNER_HALF_H
  _ci[4] = NS_REACH
  _ci[5] = NS_REACH_DIAG
  _ci[6] = BASE_RADIUS
  _ci[7] = W
  _ci[8] = H
}

// Press bounce: overshoot up then settle back to 1.0 over PRESS_MS.
function pressBump(index: int): number {
  _dbgPressBump++
  if (index !== pressIndex) return 1
  const t = (clockMs - pressStartMs) / PRESS_MS
  if (t >= 1) return 1
  // Quick dip (finger down) then a springy overshoot back up.
  const dip = 0.12 * Math.sin(t * Math.PI) // 0 → peak → 0
  const wobble = 0.18 * Math.sin(t * Math.PI * 2) * (1 - t)
  return 1 - dip + wobble
}

function applyPanLimits(): void {
  _dbgApplyPan++
  if (panX > maxPanX) panX = maxPanX
  else if (panX < -maxPanX) panX = -maxPanX
  if (panY > maxPanY) panY = maxPanY
  else if (panY < -maxPanY) panY = -maxPanY
}

// Temporary measurement harness: drive a deterministic pan so circle mode and
// icon mode are compared under IDENTICAL motion. A static scene diffs clean and
// flushes almost nothing, which hides the entire rasterise+DMA cost that the
// panning case actually pays. Set to false for normal interactive use.
const AUTO_PAN = false

function step(rafTs: number): void {
  _dbgStep++
  _dbgFrames++
  if (AUTO_PAN) {
    const t = rafTs * 0.001
    panX = Math.sin(t * 0.9) * (maxPanX * 0.85)
    panY = Math.cos(t * 0.7) * (maxPanY * 0.85)
  }
  if (_dbgFrames >= 60) {
    console.log(
      'BGDBG f=' + _dbgFrames + ' fisheye=' + _dbgFisheye + ' fast=' + _dbgFast + ' edge=' + _dbgEdge +
        ' shrink=' + _dbgShrink + ' fill=' + _dbgFill + ' icon=' + _dbgIcon + ' draw=' + _dbgDraw + ' hit=' + _dbgHitTest +
        ' build=' + _dbgBuild + ' hsv=' + _dbgHsv + ' pressBump=' + _dbgPressBump + ' applyPan=' + _dbgApplyPan +
        ' | us/60f step=' + Math.round(_tStep) + ' clear=' + Math.round(_tClear) + ' loop=' + Math.round(_tLoop) +
        ' text=' + Math.round(_tText) + ' present=' + Math.round(_tPresent)
    )
    _dbgFrames = 0
    _dbgFisheye = 0
    _dbgFast = 0
    _dbgEdge = 0
    _dbgShrink = 0
    _dbgFill = 0
    _dbgIcon = 0
    _dbgStep = 0
    _dbgDraw = 0
    _dbgHitTest = 0
    _dbgBuild = 0
    _dbgHsv = 0
    _dbgPressBump = 0
    _dbgApplyPan = 0
    _tStep = 0
    _tClear = 0
    _tLoop = 0
    _tText = 0
    _tPresent = 0
  }
  // Pick whichever clock actually advanced this frame: the rAF timestamp
  // (real on device), else Date.now() (real on the WASM sim), else a fixed
  // step. Either way the animation clock keeps moving.
  const rafDelta = prevRaf > 0 ? rafTs - prevRaf : 0
  const wall = Date.now()
  const wallDelta = prevWall > 0 ? wall - prevWall : 0
  prevRaf = rafTs
  prevWall = wall
  let dt = FALLBACK_DT
  if (rafDelta > 1 && rafDelta < 200) dt = rafDelta
  else if (wallDelta > 1 && wallDelta < 200) dt = wallDelta
  clockMs += dt

  // Consume a pending tap (recorded by the pointer handler); stamp on clockMs.
  if (wantPress >= 0) {
    pressIndex = wantPress
    pressStartMs = clockMs
    labelIndex = wantPress
    labelStartMs = clockMs
    wantPress = -1
  }

  if (dragging) {
    // Velocity in px/ms = displacement this frame ÷ (floored) frame interval,
    // smoothed, then capped so a fast flick stays recoverable.
    const invVdt = 1 / Math.max(VEL_DT_FLOOR, dt) // one reciprocal, not two divides
    velX += (dragDX * invVdt - velX) * VELOCITY_SMOOTH
    velY += (dragDY * invVdt - velY) * VELOCITY_SMOOTH
    if (velX > VEL_MAX) velX = VEL_MAX
    else if (velX < -VEL_MAX) velX = -VEL_MAX
    if (velY > VEL_MAX) velY = VEL_MAX
    else if (velY < -VEL_MAX) velY = -VEL_MAX
    dragDX = 0
    dragDY = 0
  } else {
    // Inertia glide. velX/velY are px/ms, so advance by dt.
    panX += velX * dt
    panY += velY * dt
    const damp = Math.pow(INERTIA_DAMP, dt / 16)
    velX *= damp
    velY *= damp
    if (Math.abs(velX) < STOP_VEL) velX = 0
    if (Math.abs(velY) < STOP_VEL) velY = 0
    // Rubber-band spring back if flung past the limit.
    if (panX > maxPanX) panX += (maxPanX - panX) * SPRING_K
    else if (panX < -maxPanX) panX += (-maxPanX - panX) * SPRING_K
    if (panY > maxPanY) panY += (maxPanY - panY) * SPRING_K
    else if (panY < -maxPanY) panY += (-maxPanY - panY) * SPRING_K
  }

  // NOTE: do NOT force a whole-screen flush while panning. The dirty-rect diff already
  // finds the actual changed region, which during a slow pan / momentum tail is far
  // smaller than the full viewport (that's where stutter shows). Forcing Display.invalidate()
  // here made every moving frame a 13ms full-screen flush — counterproductive. Let the
  // diff decide.

  // FPS (EMA of measured frame time).
  frameMs += (dt - frameMs) * 0.15
  fps = frameMs > 0 ? 1000 / frameMs : 0
  // Latch the on-screen readout at most every FPS_SAMPLE_MS, and rebuild the cached
  // display string HERE (twice a second) instead of in drawFps() every frame.
  if (clockMs - lastFpsSampleMs >= FPS_SAMPLE_MS) {
    displayFps = fps
    displayFrameMs = frameMs
    lastFpsSampleMs = clockMs
    fpsText = Math.round(displayFps) + ' FPS   ' + displayFrameMs.toFixed(1) + ' ms'
  }
}

// Compute circle `i`'s fisheye radius + on-screen centre against the panel's
// ROUNDED-RECTANGLE boundary (corners clipped at CORNER_RADIUS), into the
// fishX/fishY/fishR globals. `e` is the rounded-box SDF distance to the boundary;
// the radius sits halfway between `e` and full size so the near edge stays tangent,
// and the circle is pushed inward along the boundary normal by (r - e) only when it
// actually reaches the edge. Math.min/max/sign are written as ternaries (they'd
// otherwise lower to un-inlined cross-TU `gea::runtime::math::*({…})` calls); only
// abs/sqrt remain (compiler intrinsics). Shared by draw() and hitTest().
// Takes the base coords by VALUE (not an index): the caller reads baseX[i]/baseY[i]
// with the loop variable `i`, which geatsc proves in-bounds (fixed-length typed
// array indexed by a loop var bounded by COUNT) → direct access, no bounds-check
// IIFE. Passing the index instead would read inside here via a `number` param,
// which can't be proven in-bounds and pays the checked read.
// Set false by computeFisheye when the circle's bounding box is entirely off the
// panel — the draw loop then skips it. Off-screen circles have large |dx|/|dy|, which
// land in the EXPENSIVE corner branch (two sqrts + a divide) only to be discarded by
// the r<0.5 cull afterwards; culling before the SDF removes that wasted work, and
// during a pan a large fraction of the 30-circle grid is off-screen.
let fishVisible = true

function computeFisheye(i: int): void {
  _dbgFisheye++
  // INTEGER hot path. Positions and geometry are pre-rounded to int (baseScreenX/Y, _panI,
  // _ci), so the interior test + the translate that most circles take run on the S3's
  // hardware integer ALU instead of software-emulated double. rawX/rawY = screen position;
  // dx/dy = offset from centre; qx/qy = overshoot past the inner straight-edge rect.
  const rawX = baseScreenX[i] + _panI[0]
  const rawY = baseScreenY[i] + _panI[1]
  if (!EDGE_FISHEYE) {
    const br = _ci[6]
    if (rawX + br < 0 || rawX - br > _ci[7] || rawY + br < 0 || rawY - br > _ci[8]) {
      fishVisible = false
      return
    }
    fishVisible = true
    fishR = br
    fishX = rawX
    fishY = rawY
    return
  }
  const dx = rawX - _ci[0]
  const dy = rawY - _ci[1]
  const adx = dx < 0 ? -dx : dx
  const ady = dy < 0 ? -dy : dy
  const qx = adx - _ci[2]
  const qy = ady - _ci[3]
  const nsr = _ci[4]
  // Non-shrinking fast path FIRST (no SDF, no sqrt, no cull). Inner rect + both straight-
  // edge bands at FULL reach; corners use the diagonal-safe box (_ci[5]). Pure integer.
  const interior = qx <= 0 || qy <= 0 ? qx <= nsr && qy <= nsr : qx <= _ci[5] && qy <= _ci[5]
  if (interior) {
    _dbgFast++
    fishVisible = true
    fishR = _ci[6]
    fishX = rawX
    fishY = rawY
    return
  }
  const br = _ci[6]
  // Off-screen cull — reached only for non-interior (near-edge) circles.
  if (rawX + br < 0 || rawX - br > _ci[7] || rawY + br < 0 || rawY - br > _ci[8]) {
    fishVisible = false
    return
  }
  _dbgEdge++
  fishVisible = true
  const ox = qx > 0 ? qx : 0
  const oy = qy > 0 ? qy : 0
  // Distance to the rounded-rect boundary. The real Math.sqrt is needed ONLY in the
  // corner region (qx>0 && qy>0); on a straight edge or inside, the distance is a
  // single axis (sqrt of one square = that axis), so skip the sqrt for every circle
  // that isn't in a corner — i.e. almost all of them, every frame.
  const dist = qx > 0 && qy > 0 ? Math.sqrt(ox * ox + oy * oy) : ox > oy ? ox : oy
  const mq = qx > qy ? qx : qy
  const e = CORNER_RADIUS - (mq < 0 ? mq : 0) - dist - EDGE_INSET
  // FAST PATH — not within shrink range of the boundary (e >= BASE_RADIUS): full
  // radius, no edge push. A circle only shrinks within ~BASE_RADIUS of the edge, so
  // this covers the MAJORITY of circles each frame, skipping the half/rad clamp +
  // the (e < rad) push entirely. Exact, not an approximation.
  if (e >= BASE_RADIUS) {
    fishR = BASE_RADIUS
    fishX = rawX
    fishY = rawY
    return
  }
  _dbgShrink++
  const half = (e + BASE_RADIUS) / 2
  const rad = half <= 0 ? 0 : half < BASE_RADIUS ? half : BASE_RADIUS
  fishR = rad
  fishX = rawX
  fishY = rawY
  if (e < rad) {
    let nx = 0
    let ny = 0
    const sgnx = dx > 0 ? -1 : dx < 0 ? 1 : 0
    const sgny = dy > 0 ? -1 : dy < 0 ? 1 : 0
    if (qx > 0 && qy > 0) {
      // corner → radial toward the arc centre. One reciprocal (a soft-emulated
      // double divide on the S3's single-precision FPU) instead of two divides by L.
      const invL = 1 / (Math.sqrt(qx * qx + qy * qy) || 1)
      nx = sgnx * qx * invL
      ny = sgny * qy * invL
    } else if (qx >= qy) {
      nx = sgnx
    } else {
      ny = sgny
    }
    fishX = rawX + nx * (rad - e)
    fishY = rawY + ny * (rad - e)
  }
}

function draw(): void {
  _dbgDraw++
  // beginBatch/endBatch MUST wrap every frame's canvas drawing — without it the
  // runtime never re-records the draw commands and just replays the first
  // frame's cached display list, so the panel freezes even though the app keeps
  // running. (Same pattern as apps/canvas-3d and apps/maps.)
  ctx.beginBatch()
  // One base clear resets the previous frame and keeps the command stream in
  // the Tab5 presenter's fast clear+circles shape.
  const _t0 = Profiler.nowUs()
  ctx.clear()
  const _t1 = Profiler.nowUs()
  _tClear += _t1 - _t0

  // Compute each circle's fisheye radius + on-screen centre against the panel's
  // ROUNDED-RECTANGLE boundary (the AMOLED clips its corners at CORNER_RADIUS).
  //
  // `e` is the signed distance from the centre to that boundary (the standard
  // rounded-box SDF). On the straight edges it's just the edge distance; inside a
  // corner it's the distance to the corner ARC, which is SMALLER — so a bubble
  // starts shrinking earlier as it nears a corner and never pokes past the round.
  //
  // RADIUS sits halfway between `e` and full size, so the near side stays TANGENT
  // to the boundary (e.g. its top touches the border) instead of receding. The
  // bubble is then pushed inward along the boundary NORMAL by (r - e) — but only
  // when `e < r`, i.e. when the CURRENT (already-shrunk) radius actually reaches
  // the boundary, so a small bubble never "falls" toward an edge it isn't
  // touching. On a straight edge the normal is axis-aligned; in a corner it is
  // radial (toward the arc centre), so the bubble slides along the round.
  // Draw each circle: computeFisheye(i) sets fishX/fishY/fishR (the full SDF math
  // lives there, shared with hitTest), then fill. No z-ordering — the hex pitch
  // (0.25·unit) exceeds a bubble diameter (0.22·unit) and the fisheye only shrinks,
  // so bubbles never overlap.
  // Refresh the integer pan once per frame (truncated to int by the Int32Array store).
  _panI[0] = panX
  _panI[1] = panY
  let batchCount = 0
  let scalarCount = 0
  const fullRadius = _ci[6]
  for (let i: int = 0; i < COUNT; i++) {
    computeFisheye(i)
    if (!fishVisible) continue
    // No press-bump: a tap shows the name, it does not enlarge the bubble.
    const r = fishR
    if (r >= 0.5) {
      const ri = Math.round(r)
      if (ICONS_ON) {
        // The icon spans the same pixels the circle would: a radius-ri circle
        // covers centre-ri .. centre+ri inclusive, i.e. 2*ri+1 px.
        //
        // drawImageCircle, not drawImage: the tiles are OPAQUE (JPEG has no
        // alpha channel), and a square opaque tile paints its corners over
        // whatever it overlaps. The bubbles sit close enough -- and the fisheye
        // pushes edge ones closer still -- that those corners bite chunks out
        // of their neighbours. Masking to the circle in the blit fixes it
        // without an alpha plane, and touches ~21% fewer pixels.
        const d = ri * 2 + 1
        _dbgIcon++
        ctx.drawImageCircle(iconImages[i], Math.round(fishX) - ri, Math.round(fishY) - ri, d, d)
        continue
      }
      if (ri === fullRadius) {
        batchX[batchCount] = fishX
        batchY[batchCount] = fishY
        batchColor[batchCount] = color565[i]
        batchCount++
      } else {
        scalarX[scalarCount] = Math.round(fishX)
        scalarY[scalarCount] = Math.round(fishY)
        scalarR[scalarCount] = ri
        scalarColor[scalarCount] = color565[i]
        scalarCount++
      }
    }
  }
  if (batchCount > 0) {
    _dbgFill += batchCount
    ctx.fillCirclesRgb565(batchX, batchY, fullRadius, batchColor, batchCount)
  }
  // The edge-shrunk circles almost always have DISTINCT radii, so grouping them
  // by radius was an O(n^2) scan that produced ~8 batches for ~12 circles --
  // i.e. it paid a quadratic scan to discover there was nothing to batch. The
  // scan measured ~134us/frame against ~22us for ALL the fill calls combined,
  // so emitting one call per circle is strictly cheaper. Identical output: the
  // same circles at the same radii and colours, only the batching differs.
  for (let i: int = 0; i < scalarCount; i++) {
    const radius = scalarR[i]
    if (radius <= 0) continue
    scalarBatchX[0] = scalarX[i]
    scalarBatchY[0] = scalarY[i]
    scalarBatchColor[0] = scalarColor[i]
    _dbgFill++
    ctx.fillCirclesRgb565(scalarBatchX, scalarBatchY, radius, scalarBatchColor, 1)
  }

  const _t2 = Profiler.nowUs()
  _tLoop += _t2 - _t1
  drawLabel()
  if (showFpsOverlay) drawFps()
  _tText += Profiler.nowUs() - _t2
  // endBatch is where the frame is actually RASTERIZED and DMA'd to the panel.
  // The loop above only records display commands, so an image's real blit cost
  // shows up here and nowhere else.
  const _t3 = Profiler.nowUs()
  ctx.endBatch()
  _tPresent += Profiler.nowUs() - _t3
}

function drawLabel(): void {
  if (labelIndex < 0) return
  const age = clockMs - labelStartMs
  if (age > LABEL_MS) {
    labelIndex = -1
    return
  }
  // Ease in over the first 120ms, hold, then fade over the last 300ms.
  const fade = age > LABEL_MS - 300 ? (LABEL_MS - age) / 300 : age < 120 ? age / 120 : 1
  // A dark chip toast at screen centre so the name is readable over any circle.
  const py = CY
  const w = unit * 0.6
  const h = unit * 0.17
  ctx.globalAlpha = 0.92 * fade
  ctx.fillStyle = 'rgb(10,12,16)'
  ctx.fillRect(CX - w / 2, py - h / 2, w, h)
  ctx.globalAlpha = fade
  ctx.fillStyle = 'rgb(255,255,255)'
  // LABEL_FONT_PX must match the size baked in fonts.css (.bubble-grid-label):
  // the baker emits one atlas per declared size, and ctx.font only renders from
  // a baked size.
  ctx.font = LABEL_FONT_PX + 'px Oswald'
  // textAlign/textBaseline are no-ops on this canvas and fillText anchors the
  // TOP-LEFT at (x, y) -- which is why the name used to start at the centre and
  // run out past the chip. Centre it on the real measured width.
  const name = NAMES[labelIndex]
  const tw = ctx.measureText(name)
  // Vertically centre on the text's INK, not the line box: fillText anchors the
  // top of the line box, which carries the ascender/descender the glyphs never
  // fill, so half-the-font-size left the name sagging below the chip's middle.
  ctx.fillText(name, CX - tw / 2, py - ctx.measureTextInkCenter(name))
  ctx.globalAlpha = 1
}

function drawFps(): void {
  // Everything here is pre-baked (FPS_FONT/FPS_X/FPS_Y) or cached (fpsText, rebuilt only
  // on the 500ms latch in step()), so this frame-hot path does no string allocation —
  // just a const font set + one fillText of the cached string. The canvas runtime treats
  // textAlign/textBaseline as no-ops and exposes no measureText, so fillText anchors the
  // top-left at (x, y); FPS_X hand-centres it (Bebas Neue runs ~3.9x font size wide).
  ctx.fillStyle = 'rgb(255,255,255)'
  ctx.font = FPS_FONT
  ctx.fillText(fpsText, FPS_X, FPS_Y)
}

function hitTest(px: number, py: number): number {
  _dbgHitTest++
  // Bubbles never overlap (hex pitch > diameter), so at most one contains the
  // point. Recompute each circle's fisheye centre/radius (computeFisheye sets
  // fishX/fishY/fishR) — this runs only on a tap, so it costs nothing per frame
  // and lets the draw loop skip persisting scale/drawnX/drawnY arrays.
  _panI[0] = panX
  _panI[1] = panY
  for (let i: int = 0; i < COUNT; i++) {
    computeFisheye(i)
    if (!fishVisible) continue // off-screen → fish globals are stale, can't be the tap target
    const dx = px - fishX
    const dy = py - fishY
    if (dx * dx + dy * dy <= fishR * fishR) return i
  }
  return -1
}

// The public API is FREE FUNCTIONS, not methods on a returned object. A
// component that stores the grid in a `BubbleGrid | null` field and calls
// `grid.pointerMove(...)` lowers that to a boxed gea_cpp_value dynamic-invoke,
// which silently no-ops on the device/WASM path (same failure mode that froze
// the RAF loop). Free functions mutating module state lower to direct C++
// calls, so input always lands.

export function initBubbleGrid(canvas: GeaCanvasElement): void {
  ctx = canvas.getContext('2d')
  buildLayout()
  loadIcons()
  // Paint one frame immediately so the grid is visible before any input.
  step(0)
  draw()
}

export function bubbleFrame(_nowMs: number): void {
  // Always draw: the display must update continuously (live FPS, visible pan).
  const _ts = Profiler.nowUs()
  step(_nowMs)
  _tStep += Profiler.nowUs() - _ts
  draw()
}

export function bubblePointerDown(x: number, y: number): void {
  dragging = true
  lastX = x
  lastY = y
  dragDX = 0
  dragDY = 0
  downX = x
  downY = y
  moved = 0
  velX = 0
  velY = 0
}

export function bubblePointerMove(x: number, y: number): void {
  if (!dragging) return
  const dx = x - lastX
  const dy = y - lastY
  lastX = x
  lastY = y
  moved += Math.abs(dx) + Math.abs(dy)
  // Touch slop. A tap is never perfectly still: the finger jitters a few px
  // between touch and lift. Applying that jitter as pan shifts EVERY icon a
  // subpixel and re-rasters the whole field -- which, landing on the same
  // frame the tapped-name popup appears, read as the popup disturbing the
  // background (Ice Cubes' edge changing, seams between neighbours). Absorb
  // all travel below TAP_TOL: panning only begins once the finger clearly
  // means to drag, so a real tap leaves the scene perfectly still and the
  // popup is the ONLY thing that changes.
  if (moved < TAP_TOL) return
  let usableX = dx
  let usableY = dy
  // Rubber-band resistance while dragging past the limit.
  if ((panX > maxPanX && dx > 0) || (panX < -maxPanX && dx < 0)) usableX = dx * RUBBER
  if ((panY > maxPanY && dy > 0) || (panY < -maxPanY && dy < 0)) usableY = dy * RUBBER
  panX += usableX
  panY += usableY
  dragDX += usableX
  dragDY += usableY
}

export function bubblePointerUp(x: number, y: number): void {
  if (!dragging) return
  dragging = false
  // A tap: the finger barely moved (a drag pans instead). Record the target;
  // step() stamps the press/label start on the next frame.
  if (moved < TAP_TOL) {
    const i = hitTest(downX, downY)
    if (i >= 0) {
      wantPress = i
      velX = 0
      velY = 0
    }
  }
}
