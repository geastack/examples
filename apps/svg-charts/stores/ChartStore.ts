import { Store } from '@geastack/core'

// Chart geometry lives in viewBox units; the svg scales it to its box.
const CHART_W = 300
const CHART_H = 140
const SAMPLES = 24

export interface DonutSlice {
  index: number
  label: string
  d: string
  color: string
  value: number
}

// Working buffers, not store state: nothing renders them directly, so writing
// them every frame costs no reactive updates.
const samples: number[] = []
let phase = 0

const SLICE_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#facc15']
const SLICE_LABELS = ['CPU', 'GPU', 'NET', 'I/O']

function round1(value: number) {
  return Math.round(value * 10) / 10
}

// One donut segment as a closed path: outer arc forward, inner arc back.
function arcSegment(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0
  const ox0 = round1(cx + outer * Math.cos(start))
  const oy0 = round1(cy + outer * Math.sin(start))
  const ox1 = round1(cx + outer * Math.cos(end))
  const oy1 = round1(cy + outer * Math.sin(end))
  const ix0 = round1(cx + inner * Math.cos(end))
  const iy0 = round1(cy + inner * Math.sin(end))
  const ix1 = round1(cx + inner * Math.cos(start))
  const iy1 = round1(cy + inner * Math.sin(start))
  return `M${ox0} ${oy0}A${outer} ${outer} 0 ${large} 1 ${ox1} ${oy1}L${ix0} ${iy0}A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}Z`
}

export class ChartStore extends Store {
  // Line chart
  linePath = 'M0 140'
  areaPath = 'M0 140Z'
  lastValue = 0
  lastX = 0
  lastY = 140
  latestText = '0'

  // Donut
  slices: DonutSlice[] = []
  selected = 0
  selectedLabel = 'CPU'
  selectedText = '25%'

  // Gauge
  gaugeValue = 40
  gaugeArc = 'M0 0'
  needleTransform = 'rotate(0 100 100)'
  gaugeText = '40'
  gaugeColor = '#38bdf8'

  // Every chart updates once per rendered frame (requestAnimationFrame, 60fps
  // target). Motion follows elapsed time, so it stays smooth at any frame rate.
  start() {
    for (let i = 0; i < SAMPLES; i++) samples.push(0)
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
    for (let i = 0; i < SAMPLES; i++) {
      const u = i + p
      samples[i] = 50 + 30 * Math.sin(u / 3) + 15 * Math.sin(u / 1.7)
    }
    this.rebuildLine()
    this.rebuildDonut()
    this.setGauge(50 + 45 * Math.sin(p / 6))
  }

  rebuildLine() {
    const step = CHART_W / (SAMPLES - 1)
    let line = ''
    let x = 0
    let y = 0
    for (let i = 0; i < samples.length; i++) {
      x = round1(i * step)
      y = round1(CHART_H - (samples[i] / 100) * CHART_H)
      line += i === 0 ? `M${x} ${y}` : `L${x} ${y}`
    }
    this.lastX = x
    this.lastY = y
    this.linePath = line
    this.areaPath = `${line}L${CHART_W} ${CHART_H}L0 ${CHART_H}Z`
    this.lastValue = Math.round(samples[samples.length - 1])
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
      slice.d = arcSegment(100, 100, 90, 58, angle + gap, angle + sweep - gap)
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
    const large = end - start > Math.PI ? 1 : 0
    const r = 80
    const x0 = round1(100 + r * Math.cos(start))
    const y0 = round1(100 + r * Math.sin(start))
    const x1 = round1(100 + r * Math.cos(end))
    const y1 = round1(100 + r * Math.sin(end))
    this.gaugeArc = v < 0.5 ? `M${x0} ${y0}` : `M${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}`
    this.needleTransform = `rotate(${round1(-120 + v * 2.4)} 100 100)`
    this.gaugeText = `${Math.round(v)}`
    this.gaugeColor = v > 80 ? '#f87171' : v > 60 ? '#facc15' : '#38bdf8'
  }

  bump() {
    this.setGauge(this.gaugeValue + 10 > 100 ? 0 : this.gaugeValue + 10)
  }
}

export const charts = new ChartStore()
