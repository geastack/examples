import { Store, Display } from '@geastack/core'
import type { StyleLength } from '@geastack/core'

export interface TemperatureTick {
  index: number
  left: StyleLength
  top: StyleLength
  width: StyleLength
  height: StyleLength
  transform: string
}

function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function hex2(value: number) {
  const next = clamp(Math.round(value), 0, 255)
  return next.toString(16).padStart(2, '0')
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function percent(value: number): `${number}%` {
  return `${value}%` as `${number}%`
}

function colorFromProgress(progress: number) {
  const cold = { r: 24, g: 94, b: 196 }
  const warm = { r: 250, g: 204, b: 21 }
  const hot = { r: 220, g: 38, b: 38 }
  if (progress < 0.5) {
    const t = progress / 0.5
    return `#${hex2(mix(cold.r, warm.r, t))}${hex2(mix(cold.g, warm.g, t))}${hex2(mix(cold.b, warm.b, t))}`
  }
  const t = (progress - 0.5) / 0.5
  return `#${hex2(mix(warm.r, hot.r, t))}${hex2(mix(warm.g, hot.g, t))}${hex2(mix(warm.b, hot.b, t))}`
}

const backgroundSettleFrames = 1
let pendingBackgroundProgress = 0
let backgroundSettleFramesRemaining = 0
let backgroundSettleFramePending = false

// Background recolor throttle for direct finger drags: the full-screen gradient
// is the expensive repaint, so cap it to ~10fps while the number / ticks / text
// still update every step. Leading + trailing edge, so the final colour always
// lands. Date.now() is a monotonic clock on-device — ideal for elapsed deltas.
const backgroundThrottleMs = 100
let lastBackgroundApplyMs = 0
let throttledBackgroundProgress = 0
let backgroundThrottleFramePending = false

// Horizontal touch-drag state (non-reactive, like the background-settle vars
// above). A drag anywhere on the panel adjusts the temperature: every
// (display width / tickCount) px of horizontal travel applies one step — drag
// right to warm (same as +), drag left to cool (same as -).
let dragActive = false
let dragRefX = 0
let dragStepPx = 0
// The first step of a drag fires after only this much travel (vs a full
// dragStepPx) so it responds almost immediately from a standstill instead of
// needing a whole tick-width; later steps use the full per-tick width.
const firstDragStepPx = 14
let dragFirstStepDone = false

function buildTicks(count: number) {
  const ticks: TemperatureTick[] = []
  const radius = 40.5
  const startAngle = -135
  const arc = 270
  for (let i = 0; i < count; i++) {
    const progress = count <= 1 ? 0 : i / (count - 1)
    const angle = startAngle + progress * arc
    const radians = (angle * Math.PI) / 180
    const width = 3.84
    const height = 12.96
    const x = 50 + Math.sin(radians) * radius
    const y = 50 - Math.cos(radians) * radius
    ticks.push({
      index: i,
      left: percent(x - width / 2),
      top: percent(y - height / 2),
      width: percent(width),
      height: percent(height),
      transform: `rotate(${angle}deg)`,
    })
  }
  return ticks
}

export class TemperatureStore extends Store {
  minTemp = 16
  maxTemp = 30
  temperatureStep = 0.5
  tickCount = 28
  ticksPerTemperatureStep = 1
  temperature = 22
  filledTicks = 12
  progress = 0
  backgroundColor = '#809143'
  textColor = '#07101f'
  mutedTextColor = '#17243a'
  temperatureText = '22'
  temperatureDisplay = '22C'
  modeLabel = 'Balanced'
  comfortText = 'quiet cooling'
  fanLevel = 'fan 2'
  ticks: TemperatureTick[] = [{
    index: 0,
    left: '19.44%',
    top: '72.16%',
    width: '3.84%',
    height: '12.96%',
    transform: 'rotate(-135deg)',
  }]

  init() {
    this.temperature = 22
    this.ticks = buildTicks(this.tickCount)
    pendingBackgroundProgress = this.progress
    backgroundSettleFramesRemaining = 0
    backgroundSettleFramePending = false
    this.recalculate('immediate')
  }

  increase() {
    this.setTemperature(this.temperature + this.temperatureStep, 'debounce')
  }

  decrease() {
    this.setTemperature(this.temperature - this.temperatureStep, 'debounce')
  }

  adjustByRotary(delta: number) {
    this.setTemperature(this.temperature + delta * this.temperatureStep, 'debounce')
  }

  beginDrag(x: number) {
    dragActive = true
    dragRefX = x
    const width = Display.nativeWidth
    dragStepPx = width > 0 ? width / this.tickCount : 0
    dragFirstStepDone = false
  }

  dragTo(x: number) {
    if (!dragActive || dragStepPx <= 0) return
    // 'throttle': the number / ticks / text update on every step, but the
    // expensive full-screen background recolor is capped to ~10fps (unlike the
    // rotary's debounced settle, which waits for input to stop). The first step
    // uses firstDragStepPx (clamped so it's never harder than a normal step) so
    // the drag responds almost immediately; later steps use the per-tick width.
    let delta = x - dragRefX
    while (true) {
      const step = dragFirstStepDone ? dragStepPx : Math.min(firstDragStepPx, dragStepPx)
      if (delta >= step) {
        this.setTemperature(this.temperature + this.temperatureStep, 'throttle')
        dragRefX += step
        delta -= step
      } else if (delta <= -step) {
        this.setTemperature(this.temperature - this.temperatureStep, 'throttle')
        dragRefX -= step
        delta += step
      } else {
        break
      }
      dragFirstStepDone = true
    }
  }

  endDrag() {
    dragActive = false
  }

  setFromTick(index: number) {
    const tickIndex = clamp(index, 0, this.tickCount - 1)
    const stepIndex = (tickIndex - tickIndex % this.ticksPerTemperatureStep) / this.ticksPerTemperatureStep + 1
    const next = this.minTemp + stepIndex * this.temperatureStep
    this.setTemperature(next, 'debounce')
  }

  setPreset(value: number) {
    this.setTemperature(value, 'debounce')
  }

  setTemperature(value: number, backgroundMode = 'immediate') {
    const stepped = Math.round(value / this.temperatureStep) * this.temperatureStep
    const nextTemperature = clamp(stepped, this.minTemp, this.maxTemp)
    if (nextTemperature === this.temperature) return
    this.temperature = nextTemperature
    this.recalculate(backgroundMode)
  }

  recalculate(backgroundMode = 'immediate') {
    const span = this.maxTemp - this.minTemp
    const nextProgress = span <= 0 ? 0 : (this.temperature - this.minTemp) / span
    const stepIndex = Math.round((this.temperature - this.minTemp) / this.temperatureStep)
    const nextFilledTicks = clamp(stepIndex * this.ticksPerTemperatureStep, 0, this.tickCount)
    const nextTemperatureText = Number.isInteger(this.temperature) ? '' + this.temperature : this.temperature.toFixed(1)
    const nextTemperatureDisplay = nextTemperatureText + 'C'
    if (this.progress !== nextProgress) this.progress = nextProgress
    if (this.filledTicks !== nextFilledTicks) this.filledTicks = nextFilledTicks
    if (this.temperatureText !== nextTemperatureText) this.temperatureText = nextTemperatureText
    if (this.temperatureDisplay !== nextTemperatureDisplay) this.temperatureDisplay = nextTemperatureDisplay
    // Text contrast (number + labels) is cheap, so apply it NOW — same frame as the
    // number — regardless of how the expensive background gradient is scheduled below.
    // Otherwise crossing the contrast threshold (e.g. 27->26.5) repaints the new number
    // for one frame in the OLD text colour before the deferred background settle flips it.
    this.applyTextContrast(nextProgress)
    if (backgroundMode === 'debounce') {
      this.deferBackgroundProgress(nextProgress)
    } else if (backgroundMode === 'throttle') {
      this.throttleBackgroundProgress(nextProgress)
    } else {
      this.applyBackgroundProgress(nextProgress)
    }
    if (this.temperature <= 18) {
      this.applyMode('Glacial', 'deep cool', 'fan 4')
    } else if (this.temperature <= 21) {
      this.applyMode('Cool', 'crisp airflow', 'fan 3')
    } else if (this.temperature <= 25) {
      this.applyMode('Balanced', 'quiet cooling', 'fan 2')
    } else if (this.temperature <= 28) {
      this.applyMode('Warm', 'soft hold', 'fan 1')
    } else {
      this.applyMode('Heat', 'boost mode', 'fan auto')
    }
  }

  applyMode(modeLabel: string, comfortText: string, fanLevel: string) {
    if (this.modeLabel !== modeLabel) this.modeLabel = modeLabel
    if (this.comfortText !== comfortText) this.comfortText = comfortText
    if (this.fanLevel !== fanLevel) this.fanLevel = fanLevel
  }

  // Number + label contrast colours. Cheap (no gradient), so applied immediately
  // every step via recalculate() — kept out of the deferred/throttled background path.
  applyTextContrast(progress: number) {
    const highContrast = progress > 0.76 || progress < 0.24
    const nextTextColor = highContrast ? '#ffffff' : '#07101f'
    const nextMutedTextColor = highContrast ? '#dbe7f3' : '#17243a'
    if (this.textColor !== nextTextColor) this.textColor = nextTextColor
    if (this.mutedTextColor !== nextMutedTextColor) this.mutedTextColor = nextMutedTextColor
  }

  applyBackgroundProgress(progress: number) {
    const nextBackgroundColor = colorFromProgress(progress)
    if (this.backgroundColor !== nextBackgroundColor) this.backgroundColor = nextBackgroundColor
    // Re-assert contrast (no-op when recalculate already applied it this step).
    this.applyTextContrast(progress)
  }

  deferBackgroundProgress(progress: number) {
    pendingBackgroundProgress = progress
    backgroundSettleFramesRemaining = backgroundSettleFrames
    if (!backgroundSettleFramePending) this.scheduleBackgroundSettleFrame()
  }

  scheduleBackgroundSettleFrame() {
    backgroundSettleFramePending = true
    requestAnimationFrame(() => this.settleBackgroundFrame())
  }

  settleBackgroundFrame() {
    if (backgroundSettleFramesRemaining > 0) {
      backgroundSettleFramesRemaining--
      this.scheduleBackgroundSettleFrame()
      return
    }
    backgroundSettleFramePending = false
    this.applyBackgroundProgress(pendingBackgroundProgress)
  }

  throttleBackgroundProgress(progress: number) {
    throttledBackgroundProgress = progress
    this.flushThrottledBackground()
  }

  flushThrottledBackground() {
    const now = Date.now()
    if (now - lastBackgroundApplyMs >= backgroundThrottleMs) {
      // Window elapsed: recolor now (leading edge / steady cadence).
      lastBackgroundApplyMs = now
      backgroundThrottleFramePending = false
      this.applyBackgroundProgress(throttledBackgroundProgress)
    } else if (!backgroundThrottleFramePending) {
      // Inside the window: poll forward a frame at a time until it elapses, so
      // the latest progress lands on the trailing edge (no lost final colour).
      backgroundThrottleFramePending = true
      requestAnimationFrame(() => {
        backgroundThrottleFramePending = false
        this.flushThrottledBackground()
      })
    }
  }
}

export const temperature = new TemperatureStore()
