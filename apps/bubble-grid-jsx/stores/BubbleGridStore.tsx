import { Profiler, Store } from '@geastack/core'

export interface Bubble {
  x: number
  y: number
  size: number
  color: string
  opacity: number
}

const PROF_MAX2 = 0
const PROF_MIN2 = 1
const PROF_MIN3 = 2
const PROF_SQRT = 3
const PROF_SIN = 4
const PROF_POW = 5
const PROF_ROUND = 6
const PROF_COLOR_FROM_RGB = 7
const PROF_HSV_COLOR = 8
const PROF_INIT = 9
const PROF_PREPARE_FRAME = 10
const PROF_POINTER_DOWN = 11
const PROF_POINTER_MOVE = 12
const PROF_POINTER_UP = 13
const PROF_BUILD_LAYOUT = 14
const PROF_STEP = 15
const PROF_UPDATE_BUBBLES = 16
const PROF_SET_BUBBLE = 17
const PROF_UPDATE_LABEL = 18
const PROF_PRESS_BUMP = 19
const PROF_COMPUTE_FISHEYE = 20
const PROF_HIT_TEST = 21
const PROF_SHOULD_UPDATE_BUBBLES = 22
export const PROF_FRAME_LOOP = 23
export const PROF_APP_TEMPLATE = 24
export const PROF_TOUCH_START = 25
export const PROF_TOUCH_MOVE = 26
export const PROF_TOUCH_END = 27
export const PROF_BUBBLE_FIELD = 28
export const PROF_RENDER_BUBBLE = 29
export const PROF_BUBBLE_LABEL = 30
export const PROF_FPS_BADGE = 31

const PROF_COUNT = 32
const PROF_STACK_LIMIT = 96
const PROF_WINDOW_US = 500000
let PROF_ENABLED = false
const PROF_NAMES = [
  'max2',
  'min2',
  'min3',
  'sqrt',
  'sin',
  'pow',
  'round',
  'colorFromRgb',
  'hsvColor',
  'init',
  'prepareFrame',
  'pointerDown',
  'pointerMove',
  'pointerUp',
  'buildLayout',
  'step',
  'updateBubbles',
  'setBubble',
  'updateLabel',
  'pressBump',
  'computeFisheye',
  'hitTest',
  'shouldUpdateBubbles',
  'frameLoop',
  'App.template',
  'onTouchStart',
  'onTouchMove',
  'onTouchEnd',
  'BubbleField',
  'renderBubble',
  'BubbleLabel',
  'FpsBadge'
]
const profCalls = new Float64Array(PROF_COUNT)
const profInclusiveUs = new Float64Array(PROF_COUNT)
const profSelfUs = new Float64Array(PROF_COUNT)
const profMaxUs = new Float64Array(PROF_COUNT)
const profStackIds = new Float64Array(PROF_STACK_LIMIT)
const profStackStartUs = new Float64Array(PROF_STACK_LIMIT)
const profStackChildUs = new Float64Array(PROF_STACK_LIMIT)
let profDepth = 0
let profWindowStartUs = 0
let profFrameCount = 0
let profMovingFrameCount = 0
let profBubbleVisits = 0
let profBubbleChanged = 0
let profBubbleFieldWrites = 0
let profGeometrySkips = 0
let profPointerMoves = 0
let profDisabledSink = 0

export function profileEnter(id: number): number {
  if (!PROF_ENABLED) return 0
  const startUs = Profiler.nowUs()
  profCalls[id]++
  if (profDepth < PROF_STACK_LIMIT) {
    profStackIds[profDepth] = id
    profStackStartUs[profDepth] = startUs
    profStackChildUs[profDepth] = 0
    profDepth++
  }
  return startUs
}

export function profileExit(id: number, startUs: number): void {
  if (!PROF_ENABLED) {
    profDisabledSink += id < startUs ? 1 : 0
    return
  }
  const endUs = Profiler.nowUs()
  const elapsedUs = endUs - startUs
  let childUs = 0
  if (profDepth > 0) {
    const top = profDepth - 1
    if (profStackIds[top] === id) {
      childUs = profStackChildUs[top]
      profDepth = top
    }
  }
  profInclusiveUs[id] += elapsedUs
  profSelfUs[id] += elapsedUs - childUs
  if (elapsedUs > profMaxUs[id]) profMaxUs[id] = elapsedUs
  if (profDepth > 0) profStackChildUs[profDepth - 1] += elapsedUs
}

function profileReset(startUs: number): void {
  for (let i = 0; i < PROF_COUNT; i++) {
    profCalls[i] = 0
    profInclusiveUs[i] = 0
    profSelfUs[i] = 0
    profMaxUs[i] = 0
  }
  profDepth = 0
  profWindowStartUs = startUs
  profFrameCount = 0
  profMovingFrameCount = 0
  profBubbleVisits = 0
  profBubbleChanged = 0
  profBubbleFieldWrites = 0
  profGeometrySkips = 0
  profPointerMoves = 0
}

function profileLog(spanUs: number): void {
  const fps = profFrameCount > 0 ? profFrameCount * 1000000 / spanUs : 0
  console.log(
    '[bubble-prof] window=' + (spanUs / 1000).toFixed(1) +
    'ms frames=' + profFrameCount +
    ' moving=' + profMovingFrameCount +
    ' fps=' + fps.toFixed(1)
  )
  console.log(
    '[bubble-prof] counters bubbleVisits=' + profBubbleVisits +
    ' bubbleChanged=' + profBubbleChanged +
    ' bubbleFieldWrites=' + profBubbleFieldWrites +
    ' geometrySkips=' + profGeometrySkips +
    ' pointerMoves=' + profPointerMoves
  )
  for (let i = 0; i < PROF_COUNT; i++) {
    const calls = profCalls[i]
    if (calls <= 0) continue
    console.log(
      '[bubble-prof] ' + PROF_NAMES[i] +
      ' calls=' + calls +
      ' total=' + (profInclusiveUs[i] / 1000).toFixed(3) + 'ms' +
      ' self=' + (profSelfUs[i] / 1000).toFixed(3) + 'ms' +
      ' avg=' + (profInclusiveUs[i] / calls).toFixed(1) + 'us' +
      ' max=' + (profMaxUs[i] / 1000).toFixed(3) + 'ms'
    )
  }
}

function profileFrame(moving: boolean): void {
  if (!PROF_ENABLED) return
  const nowUs = Profiler.nowUs()
  if (profWindowStartUs <= 0) profileReset(nowUs)
  profFrameCount++
  if (moving) profMovingFrameCount++
  const spanUs = nowUs - profWindowStartUs
  if (spanUs >= PROF_WINDOW_US) {
    if (profMovingFrameCount > 0) profileLog(spanUs)
    profileReset(nowUs)
  }
}

function max2(a: number, b: number): number {
  const __p = profileEnter(PROF_MAX2)
  const __r = a > b ? a : b
  profileExit(PROF_MAX2, __p)
  return __r
}

function min2(a: number, b: number): number {
  const __p = profileEnter(PROF_MIN2)
  const __r = a < b ? a : b
  profileExit(PROF_MIN2, __p)
  return __r
}

function min3(a: number, b: number, c: number): number {
  const __p = profileEnter(PROF_MIN3)
  const __r = min2(min2(a, b), c)
  profileExit(PROF_MIN3, __p)
  return __r
}

const W = max2(1, Math.floor(window.innerWidth))
const H = max2(1, Math.floor(window.innerHeight))
const unit = min2(W, H)
const CX = W / 2
const CY = H / 2

const COUNT = 30
const BASE_RADIUS = unit * 0.11
const PITCH_X = unit * 0.25
const PITCH_Y = PITCH_X * 0.866
const CORNER_RADIUS = min3(128, W / 2, H / 2)
const INNER_HALF_W = W / 2 - CORNER_RADIUS
const INNER_HALF_H = H / 2 - CORNER_RADIUS
const EDGE_INSET = 6

const INERTIA_DAMP = 0.94
const VELOCITY_SMOOTH = 0.6
const VEL_DT_FLOOR = 6
const VEL_MAX = unit * 0.012
const RUBBER = 0.55
const SPRING_K = 0.18
const STOP_VEL = 0.004

const TAP_TOL = unit * 0.03
const PRESS_MS = 420
const LABEL_MS = 1400
const FALLBACK_DT = 16
const FPS_SAMPLE_MS = 500

const FPS_FONT_PX = Math.round(unit * 0.1)
const FPS_TOP = H - FPS_FONT_PX - Math.round(unit * 0.02)

const LABEL_WIDTH = unit * 0.6
const LABEL_HEIGHT = unit * 0.17
const LABEL_LEFT = CX - LABEL_WIDTH / 2
const LABEL_TOP = CY - LABEL_HEIGHT / 2
const LABEL_FONT_PX = Math.round(unit * 0.085)
const PI = 3.141592653589793

const NAMES = [
  'Music',
  'Maps',
  'Mail',
  'Photos',
  'Timer',
  'Wallet',
  'Heart',
  'Phone',
  'Camera',
  'Notes',
  'Stocks',
  'Home',
  'News',
  'Radio',
  'Weather',
  'Clock',
  'Books',
  'Calls',
  'Wind',
  'Walk',
  'Sleep',
  'Tides',
  'Coach',
  'Cards',
  'Globe',
  'Pulse',
  'Sound',
  'Trail',
  'Tasks',
  'Voice'
]

const baseX = new Float64Array(COUNT)
const baseY = new Float64Array(COUNT)
let fishX = 0
let fishY = 0
let fishR = 0
let fishVisible = true
let lastBubblePanX = 1000000000
let lastBubblePanY = 1000000000
let lastBubblePressIndex = -2
let lastBubblePressStep = -1
let panX = 0
let panY = 0
let velX = 0
let velY = 0
let maxPanX = 0
let maxPanY = 0
let dragging = false
let lastX = 0
let lastY = 0
let dragDX = 0
let dragDY = 0
let downX = 0
let downY = 0
let moved = 0
let wantPress = -1
let pressIndex = -1
let pressStartMs = 0
let labelIndex = -1
let labelStartMs = 0
let clockMs = 0
let prevRaf = 0
let prevWall = 0
let frameMs = FALLBACK_DT
let lastFpsSampleMs = -FPS_SAMPLE_MS
let animationToken = 0
let animationScheduled = false

function sqrt(value: number): number {
  const __p = profileEnter(PROF_SQRT)
  const __r = Math.sqrt(value)
  profileExit(PROF_SQRT, __p)
  return __r
}

function sin(value: number): number {
  const __p = profileEnter(PROF_SIN)
  const __r = Math.sin(value)
  profileExit(PROF_SIN, __p)
  return __r
}

function pow(base: number, exponent: number): number {
  const __p = profileEnter(PROF_POW)
  const __r = Math.pow(base, exponent)
  profileExit(PROF_POW, __p)
  return __r
}

function round(value: number): number {
  const __p = profileEnter(PROF_ROUND)
  const __r = Math.round(value)
  profileExit(PROF_ROUND, __p)
  return __r
}

export class BubbleGridStore extends Store {
  screenWidth: number = W
  fpsTop: number = FPS_TOP
  fpsFontSize: number = FPS_FONT_PX
  fpsText = '0 FPS   16.0 ms'
  labelLeft: number = LABEL_LEFT
  labelTop: number = LABEL_TOP
  labelWidth: number = LABEL_WIDTH
  labelHeight: number = LABEL_HEIGHT
  labelFontSize: number = LABEL_FONT_PX
  labelText = ''
  labelChipOpacity = 0
  labelTextOpacity = 0
  bubbles: Bubble[] = []

  init() {
    const __p = profileEnter(PROF_INIT)
    // Grow by PUSHING real elements, never by assigning `length`. Raising
    // `length` on an empty array leaves holes, so `this.bubbles[0]` is
    // `undefined` and every read below throws -- that is what JavaScript does,
    // and the compiler is right to say so.
    while (this.bubbles.length < COUNT) {
      this.bubbles.push({ x: 0, y: 0, size: 0, color: '#000000', opacity: 0 })
    }
    this.buildLayout()
    for (let i = 0; i < COUNT; i++) {
      const r = Math.floor(Math.random() * 256)
      const g = Math.floor(Math.random() * 256)
      const b = Math.floor(Math.random() * 256)
      this.setBubble(i, 0, 0, 0, 0, 'rgb(' + r + ',' + g + ',' + b + ')')
    }
    this.step(0)
    this.updateBubbles()
    this.updateLabel()
    profileExit(PROF_INIT, __p)
  }

  private prepareFrame(timestampMs: number): boolean {
    const __p = profileEnter(PROF_PREPARE_FRAME)
    this.step(timestampMs)
    const geometryUpdated = this.shouldUpdateBubbles()
    if (geometryUpdated) {
      this.updateBubbles()
    } else {
      profGeometrySkips++
    }
    this.updateLabel()
    profileExit(PROF_PREPARE_FRAME, __p)
    const shouldAnimate = this.shouldAnimate()
    profileFrame(geometryUpdated || dragging || shouldAnimate || dragDX !== 0 || dragDY !== 0)
    return shouldAnimate
  }

  private shouldAnimate(): boolean {
    if (dragging) return false
    if (velX !== 0 || velY !== 0) return true
    const clampedPanX = panX > maxPanX ? maxPanX : panX < -maxPanX ? -maxPanX : panX
    const clampedPanY = panY > maxPanY ? maxPanY : panY < -maxPanY ? -maxPanY : panY
    if (round(panX) !== round(clampedPanX) || round(panY) !== round(clampedPanY)) return true
    if (pressIndex >= 0 && clockMs - pressStartMs < PRESS_MS) return true
    if (labelIndex >= 0 && clockMs - labelStartMs <= LABEL_MS) return true
    return false
  }

  private cancelAnimation(): void {
    animationToken++
    animationScheduled = false
  }

  private scheduleAnimationIfNeeded(): void {
    if (!this.shouldAnimate() || animationScheduled) return
    animationScheduled = true
    const token = animationToken
    requestAnimationFrame((timestampMs) => this.animationFrame(timestampMs, token))
  }

  private animationFrame(timestampMs: number, token: number): void {
    if (token !== animationToken) {
      animationScheduled = false
      return
    }
    animationScheduled = false
    const shouldContinue = this.prepareFrame(timestampMs)
    if (shouldContinue) this.scheduleAnimationIfNeeded()
  }

  pointerDown(x: number, y: number) {
    const __p = profileEnter(PROF_POINTER_DOWN)
    this.cancelAnimation()
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
    profileExit(PROF_POINTER_DOWN, __p)
  }

  pointerMove(x: number, y: number) {
    const __p = profileEnter(PROF_POINTER_MOVE)
    profPointerMoves++
    if (!dragging) {
      profileExit(PROF_POINTER_MOVE, __p)
      return
    }
    const dx = x - lastX
    const dy = y - lastY
    let usableX = dx
    let usableY = dy
    if ((panX > maxPanX && dx > 0) || (panX < -maxPanX && dx < 0)) usableX = dx * RUBBER
    if ((panY > maxPanY && dy > 0) || (panY < -maxPanY && dy < 0)) usableY = dy * RUBBER
    panX += usableX
    panY += usableY
    dragDX += usableX
    dragDY += usableY
    moved += (dx < 0 ? -dx : dx) + (dy < 0 ? -dy : dy)
    lastX = x
    lastY = y
    this.prepareFrame(Date.now())
    profileExit(PROF_POINTER_MOVE, __p)
  }

  private shouldUpdateBubbles(): boolean {
    const __p = profileEnter(PROF_SHOULD_UPDATE_BUBBLES)
    const panKeyX = round(panX)
    const panKeyY = round(panY)
    let pressStep = -1
    if (pressIndex >= 0) {
      const pressAge = clockMs - pressStartMs
      if (pressAge < PRESS_MS) pressStep = round(pressAge)
    }
    const shouldUpdate =
      panKeyX !== lastBubblePanX ||
      panKeyY !== lastBubblePanY ||
      pressIndex !== lastBubblePressIndex ||
      pressStep !== lastBubblePressStep
    lastBubblePanX = panKeyX
    lastBubblePanY = panKeyY
    lastBubblePressIndex = pressIndex
    lastBubblePressStep = pressStep
    profileExit(PROF_SHOULD_UPDATE_BUBBLES, __p)
    return shouldUpdate
  }

  pointerUp(_x: number, _y: number) {
    const __p = profileEnter(PROF_POINTER_UP)
    if (!dragging) {
      profileExit(PROF_POINTER_UP, __p)
      return
    }
    dragging = false
    if (moved < TAP_TOL) {
      const i = this.hitTest(downX, downY)
      if (i >= 0) {
        wantPress = i
        velX = 0
        velY = 0
      }
    }
    this.prepareFrame(Date.now())
    this.scheduleAnimationIfNeeded()
    profileExit(PROF_POINTER_UP, __p)
  }

  private buildLayout() {
    const __p = profileEnter(PROF_BUILD_LAYOUT)
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
      if (Math.abs(baseX[i]) > extentX) extentX = Math.abs(baseX[i])
      if (Math.abs(baseY[i]) > extentY) extentY = Math.abs(baseY[i])
    }
    maxPanX = extentX + BASE_RADIUS
    maxPanY = extentY + BASE_RADIUS
    profileExit(PROF_BUILD_LAYOUT, __p)
  }

  private step(rafTs: number) {
    const __p = profileEnter(PROF_STEP)
    const rafDelta = prevRaf > 0 ? rafTs - prevRaf : 0
    const wall = Date.now()
    const wallDelta = prevWall > 0 ? wall - prevWall : 0
    prevRaf = rafTs
    prevWall = wall
    let dt = FALLBACK_DT
    if (rafDelta > 1 && rafDelta < 200) dt = rafDelta
    else if (wallDelta > 1 && wallDelta < 200) dt = wallDelta
    clockMs += dt

    if (wantPress >= 0) {
      pressIndex = wantPress
      pressStartMs = clockMs
      labelIndex = wantPress
      labelStartMs = clockMs
      wantPress = -1
    }

    if (dragging) {
      const invVdt = 1 / (dt > VEL_DT_FLOOR ? dt : VEL_DT_FLOOR)
      velX += (dragDX * invVdt - velX) * VELOCITY_SMOOTH
      velY += (dragDY * invVdt - velY) * VELOCITY_SMOOTH
      if (velX > VEL_MAX) velX = VEL_MAX
      else if (velX < -VEL_MAX) velX = -VEL_MAX
      if (velY > VEL_MAX) velY = VEL_MAX
      else if (velY < -VEL_MAX) velY = -VEL_MAX
      dragDX = 0
      dragDY = 0
    } else {
      panX += velX * dt
      panY += velY * dt
      const damp = pow(INERTIA_DAMP, dt / 16)
      velX *= damp
      velY *= damp
      const absVelX = velX < 0 ? -velX : velX
      const absVelY = velY < 0 ? -velY : velY
      if (absVelX < STOP_VEL) velX = 0
      if (absVelY < STOP_VEL) velY = 0
      if (panX > maxPanX) panX += (maxPanX - panX) * SPRING_K
      else if (panX < -maxPanX) panX += (-maxPanX - panX) * SPRING_K
      if (panY > maxPanY) panY += (maxPanY - panY) * SPRING_K
      else if (panY < -maxPanY) panY += (-maxPanY - panY) * SPRING_K
      if (velX === 0) {
        if (panX > maxPanX && panX - maxPanX < 0.5) panX = maxPanX
        else if (panX < -maxPanX && -maxPanX - panX < 0.5) panX = -maxPanX
      }
      if (velY === 0) {
        if (panY > maxPanY && panY - maxPanY < 0.5) panY = maxPanY
        else if (panY < -maxPanY && -maxPanY - panY < 0.5) panY = -maxPanY
      }
    }

    frameMs += (dt - frameMs) * 0.15
    if (clockMs - lastFpsSampleMs >= FPS_SAMPLE_MS) {
      const displayFps = frameMs > 0 ? 1000 / frameMs : 0
      lastFpsSampleMs = clockMs
      this.fpsText = round(displayFps) + ' FPS   ' + frameMs.toFixed(1) + ' ms'
    }
    profileExit(PROF_STEP, __p)
  }

  private updateBubbles() {
    const __p = profileEnter(PROF_UPDATE_BUBBLES)
    for (let i = 0; i < COUNT; i++) {
      profBubbleVisits++
      const bubble = this.bubbles[i]
      this.computeFisheye(baseX[i], baseY[i])
      let nextX = 0
      let nextY = 0
      let nextSize = 0
      let nextOpacity = 0
      if (!fishVisible) {
        nextX = bubble.x
        nextY = bubble.y
      } else {
        let r = fishR
        if (i === pressIndex) r = fishR * this.pressBump(i)
        if (r < 0.5) {
          nextX = bubble.x
          nextY = bubble.y
        } else {
          nextX = fishX - r
          nextY = fishY - r
          nextSize = r * 2
          nextOpacity = 255
        }
      }
      const ix = round(nextX)
      const iy = round(nextY)
      const isize = round(nextSize)
      let changed = false
      if (bubble.x !== ix) {
        bubble.x = ix
        profBubbleFieldWrites++
        changed = true
      }
      if (bubble.y !== iy) {
        bubble.y = iy
        profBubbleFieldWrites++
        changed = true
      }
      if (bubble.size !== isize) {
        bubble.size = isize
        profBubbleFieldWrites++
        changed = true
      }
      if (bubble.opacity !== nextOpacity) {
        bubble.opacity = nextOpacity
        profBubbleFieldWrites++
        changed = true
      }
      if (changed) profBubbleChanged++
    }
    profileExit(PROF_UPDATE_BUBBLES, __p)
  }

  private setBubble(index: number, x: number, y: number, size: number, opacity: number, color: string) {
    const __p = profileEnter(PROF_SET_BUBBLE)
    const bubble = this.bubbles[index]
    const ix = round(x)
    const iy = round(y)
    const isize = round(size)
    if (bubble.x !== ix) bubble.x = ix
    if (bubble.y !== iy) bubble.y = iy
    if (bubble.size !== isize) bubble.size = isize
    if (bubble.opacity !== opacity) bubble.opacity = opacity
    if (bubble.color !== color) bubble.color = color
    profileExit(PROF_SET_BUBBLE, __p)
  }

  private updateLabel() {
    const __p = profileEnter(PROF_UPDATE_LABEL)
    if (labelIndex < 0) {
      this.labelChipOpacity = 0
      this.labelTextOpacity = 0
      profileExit(PROF_UPDATE_LABEL, __p)
      return
    }
    const age = clockMs - labelStartMs
    if (age > LABEL_MS) {
      labelIndex = -1
      this.labelChipOpacity = 0
      this.labelTextOpacity = 0
      profileExit(PROF_UPDATE_LABEL, __p)
      return
    }
    const fade = age > LABEL_MS - 300 ? (LABEL_MS - age) / 300 : age < 120 ? age / 120 : 1
    this.labelText = NAMES[labelIndex]
    this.labelChipOpacity = round(235 * fade)
    this.labelTextOpacity = round(255 * fade)
    profileExit(PROF_UPDATE_LABEL, __p)
  }

  private pressBump(index: number): number {
    const __p = profileEnter(PROF_PRESS_BUMP)
    if (index !== pressIndex) {
      profileExit(PROF_PRESS_BUMP, __p)
      return 1
    }
    const t = (clockMs - pressStartMs) / PRESS_MS
    if (t >= 1) {
      profileExit(PROF_PRESS_BUMP, __p)
      return 1
    }
    const dip = 0.12 * sin(t * PI)
    const wobble = 0.18 * sin(t * PI * 2) * (1 - t)
    const __r = 1 - dip + wobble
    profileExit(PROF_PRESS_BUMP, __p)
    return __r
  }

  private computeFisheye(bx: number, by: number) {
    const __p = profileEnter(PROF_COMPUTE_FISHEYE)
    const rawX = CX + bx + panX
    const rawY = CY + by + panY
    if (rawX + BASE_RADIUS < 0 || rawX - BASE_RADIUS > W || rawY + BASE_RADIUS < 0 || rawY - BASE_RADIUS > H) {
      fishVisible = false
      profileExit(PROF_COMPUTE_FISHEYE, __p)
      return
    }
    fishVisible = true
    const dx = rawX - CX
    const dy = rawY - CY
    const adx = dx < 0 ? -dx : dx
    const ady = dy < 0 ? -dy : dy
    const qx = adx - INNER_HALF_W
    const qy = ady - INNER_HALF_H
    const ox = qx > 0 ? qx : 0
    const oy = qy > 0 ? qy : 0
    const dist = qx > 0 && qy > 0 ? sqrt(ox * ox + oy * oy) : ox > oy ? ox : oy
    const mq = qx > qy ? qx : qy
    const e = CORNER_RADIUS - (mq < 0 ? mq : 0) - dist - EDGE_INSET
    if (e >= BASE_RADIUS) {
      fishR = BASE_RADIUS
      fishX = rawX
      fishY = rawY
      profileExit(PROF_COMPUTE_FISHEYE, __p)
      return
    }
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
        const len = sqrt(qx * qx + qy * qy)
        const invL = 1 / (len > 0 ? len : 1)
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
    profileExit(PROF_COMPUTE_FISHEYE, __p)
  }

  private hitTest(px: number, py: number): number {
    const __p = profileEnter(PROF_HIT_TEST)
    for (let i = 0; i < COUNT; i++) {
      this.computeFisheye(baseX[i], baseY[i])
      if (!fishVisible) continue
      const dx = px - fishX
      const dy = py - fishY
      if (dx * dx + dy * dy <= fishR * fishR) {
        profileExit(PROF_HIT_TEST, __p)
        return i
      }
    }
    profileExit(PROF_HIT_TEST, __p)
    return -1
  }
}

export const bubbleGrid = new BubbleGridStore()
