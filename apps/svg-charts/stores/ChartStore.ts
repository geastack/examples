import { Store } from '@geastack/core'

// Chart geometry lives in viewBox units; the svg scales it to its box. Units
// are a tenth of the old 300x140 plot so every coordinate is a whole number:
// integers turn into path text with a couple of divisions, while a fraction
// needs the full shortest-round-trip double formatting (slow on soft-float
// targets such as the ESP32).
const CHART_W: i32 = 3000
const CHART_H: i32 = 1400
const SAMPLES: i32 = 24
const STEP: i32 = 125 // CHART_W / SAMPLES
// A new throughput sample arrives every SAMPLE_MS; between arrivals the
// history scrolls left smoothly, so past points keep their values and only move.
const SAMPLE_MS = 160

// Throughput reading number `index` (a fixed value per index: history never
// changes once recorded).
function reading(index: number) {
  return 50 + 30 * Math.sin(index / 3) + 15 * Math.sin(index / 1.7)
}

export interface DonutSlice {
  index: number
  label: string
  d: string
  color: string
  value: i32
}

// Animation clock, not store state: nothing renders it directly.
let phase = 0

const SLICE_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#facc15']
const SLICE_LABELS = ['CPU', 'GPU', 'NET', 'I/O']

// A value in tenths, spelled with one decimal from integers only.
function tenths(value: number): string {
  const t: i32 = Math.round(value * 10)
  const a: i32 = t < 0 ? -t : t
  const whole: i32 = Math.floor(a / 10)
  const frac: i32 = a - whole * 10
  return `${t < 0 ? '-' : ''}${whole}.${frac}`
}

function toY(value: number): i32 {
  return Math.round(CHART_H - (value / 100) * CHART_H)
}

// One donut segment as a closed path: outer arc forward, inner arc back.
function arcSegment(cx: i32, cy: i32, outer: i32, inner: i32, start: number, end: number) {
  const large: i32 = end - start > Math.PI ? 1 : 0
  const ox0: i32 = Math.round(cx + outer * Math.cos(start))
  const oy0: i32 = Math.round(cy + outer * Math.sin(start))
  const ox1: i32 = Math.round(cx + outer * Math.cos(end))
  const oy1: i32 = Math.round(cy + outer * Math.sin(end))
  const ix0: i32 = Math.round(cx + inner * Math.cos(end))
  const iy0: i32 = Math.round(cy + inner * Math.sin(end))
  const ix1: i32 = Math.round(cx + inner * Math.cos(start))
  const iy1: i32 = Math.round(cy + inner * Math.sin(start))
  return `M${ox0} ${oy0}A${outer} ${outer} 0 ${large} 1 ${ox1} ${oy1}L${ix0} ${iy0}A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}Z`
}

export class ChartStore extends Store {
  // Line chart. The recorded history only changes when a new reading lands
  // (every SAMPLE_MS); between readings it slides left through a translate,
  // so its geometry is reused and only the short live tip is rebuilt.
  historyLine = 'M0 1400'
  historyArea = 'M0 1400Z'
  historyShift = 'translate(0 0)'
  tipLine = 'M3000 1400'
  tipArea = 'M3000 1400Z'
  lastValue: i32 = 0
  lastY: i32 = 1400
  latestText = '0'
  newestShown: i32 = -1

  // Donut
  slices: DonutSlice[] = []
  selected = 0
  selectedLabel = 'CPU'
  selectedText = '25%'

  // Gauge
  gaugeValue = 40
  gaugeArc = 'M0 0'
  needleTransform = 'rotate(0 1000 1000)'
  gaugeText = '40'
  gaugeColor = '#38bdf8'

  // Every chart updates once per rendered frame (requestAnimationFrame, 60fps
  // target). Motion follows elapsed time, so it stays smooth at any frame rate.
  start() {
    this.step(0)
    const frame = (timestampMs: number) => {
      this.step(timestampMs)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  step(timestampMs: number) {
    phase = timestampMs * 0.004
    const p = phase
    this.rebuildLine(timestampMs / SAMPLE_MS)
    this.rebuildDonut()
    this.setGauge(50 + 45 * Math.sin(p / 6))
  }

  // `now` is the live position on the sample timeline (fractional). Reading k
  // sits at x = (k - newest + SAMPLES) * STEP in history space, so the newest
  // reading is at the right edge; the history group shifts left by the
  // fraction of a step elapsed since it landed, and the svg viewport clips the
  // part that slides past x = 0. The tip joins the newest reading to the live
  // value at the right edge.
  rebuildLine(now: number) {
    const newest: i32 = Math.floor(now)
    const frac = now - newest
    if (newest !== this.newestShown) {
      this.newestShown = newest
      let line = `M0 ${toY(reading(newest - SAMPLES))}`
      for (let k: i32 = 1; k <= SAMPLES; k++) line += `L${k * STEP} ${toY(reading(newest - SAMPLES + k))}`
      this.historyLine = line
      this.historyArea = `${line}L${CHART_W} ${CHART_H}L0 ${CHART_H}Z`
    }
    const shift: i32 = Math.round(frac * STEP)
    this.historyShift = `translate(${-shift} 0)`
    const live = reading(newest) + (reading(newest + 1) - reading(newest)) * frac
    const tipX: i32 = CHART_W - shift
    const tipY: i32 = toY(reading(newest))
    const liveY: i32 = toY(live)
    this.tipLine = `M${tipX} ${tipY}L${CHART_W} ${liveY}`
    this.tipArea = `M${tipX} ${tipY}L${CHART_W} ${liveY}L${CHART_W} ${CHART_H}L${tipX} ${CHART_H}Z`
    this.lastY = liveY
    this.lastValue = Math.round(live)
    this.latestText = `${this.lastValue}`
  }

  rebuildDonut() {
    const t = phase * 2
    const values = [
      30 + 10 * Math.sin(t / 7),
      25 + 8 * Math.cos(t / 5),
      20 + 6 * Math.sin(t / 3),
      15 + 5 * Math.cos(t / 4),
    ]
    let total = 0
    for (let i = 0; i < values.length; i++) total += values[i]
    // The four slices are created once; each frame only rewrites their
    // fields, so the list keeps its nodes and only the paths repaint.
    if (this.slices.length === 0) {
      const initial: DonutSlice[] = []
      for (let i = 0; i < values.length; i++)
        initial.push({ index: i, label: SLICE_LABELS[i], d: 'M0 0', color: SLICE_COLORS[i], value: 0 })
      this.slices = initial
    }
    let angle = -Math.PI / 2
    for (let i = 0; i < values.length; i++) {
      const sweep = (values[i] / total) * Math.PI * 2
      const gap = 0.03
      const slice = this.slices[i]
      slice.d = arcSegment(1000, 1000, 900, 580, angle + gap, angle + sweep - gap)
      slice.value = Math.round((values[i] / total) * 100)
      angle += sweep
    }
    this.updateSelectedText()
  }

  select(index: number) {
    this.selected = index
    this.updateSelectedText()
  }

  updateSelectedText() {
    const slice = this.slices[this.selected]
    this.selectedLabel = slice.label
    this.selectedText = `${slice.value}%`
  }

  setGauge(value: number) {
    const v = Math.max(0, Math.min(100, value))
    this.gaugeValue = v
    // 240 degree sweep from 150 deg (bottom-left) clockwise.
    const start = (150 * Math.PI) / 180
    const end = start + (v / 100) * ((240 * Math.PI) / 180)
    const large: i32 = end - start > Math.PI ? 1 : 0
    const r: i32 = 800
    const x0: i32 = Math.round(1000 + r * Math.cos(start))
    const y0: i32 = Math.round(1000 + r * Math.sin(start))
    const x1: i32 = Math.round(1000 + r * Math.cos(end))
    const y1: i32 = Math.round(1000 + r * Math.sin(end))
    this.gaugeArc = v < 0.5 ? `M${x0} ${y0}` : `M${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}`
    this.needleTransform = `rotate(${tenths(-120 + v * 2.4)} 1000 1000)`
    const shown: i32 = Math.round(v)
    this.gaugeText = `${shown}`
    this.gaugeColor = v > 80 ? '#f87171' : v > 60 ? '#facc15' : '#38bdf8'
  }

  bump() {
    this.setGauge(this.gaugeValue + 10 > 100 ? 0 : this.gaugeValue + 10)
  }
}

export const charts = new ChartStore()
