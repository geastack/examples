import { Component } from '@geastack/core'
import { charts } from '../stores/ChartStore'
import './App.css'

function LineChart() {
  return (
    <div class="card card-wide">
      <div class="card-head">
        <span class="card-title">Throughput</span>
        <span class="card-value">{charts.latestText}</span>
      </div>
      <svg width="340" height="170" viewBox="0 -100 3200 1600">
        <g class="grid" stroke="#1e293b" stroke-width="10">
          <line x1="0" y1="0" x2="3000" y2="0" />
          <line x1="0" y1="350" x2="3000" y2="350" />
          <line x1="0" y1="700" x2="3000" y2="700" />
          <line x1="0" y1="1050" x2="3000" y2="1050" />
          <line x1="0" y1="1400" x2="3000" y2="1400" />
        </g>
        <g transform={charts.historyShift}>
          <path d={charts.historyArea} fill="#38bdf8" fill-opacity="0.18" />
          <path d={charts.historyLine} class="line" fill="none" stroke="#38bdf8" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <path d={charts.tipArea} fill="#38bdf8" fill-opacity="0.18" />
        <path d={charts.tipLine} fill="none" stroke="#38bdf8" stroke-width="30" stroke-linecap="round" />
        <circle cx="3000" cy={charts.lastY} r="50" fill="#0f172a" stroke="#38bdf8" stroke-width="30" />
      </svg>
    </div>
  )
}

function Donut() {
  return (
    <div class="card card-square">
      <div class="card-head">
        <span class="card-title">{charts.selectedLabel}</span>
        <span class="card-value">{charts.selectedText}</span>
      </div>
      <svg width="170" height="170" viewBox="0 0 2000 2000">
        {charts.slices.map(slice => (
          <path
            key={slice.index}
            d={slice.d}
            fill={slice.color}
            class={slice.index === charts.selected ? 'slice slice-selected' : 'slice'}
            onClick={() => charts.select(slice.index)}
          />
        ))}
        <circle cx="1000" cy="1000" r="500" fill="#0f172a" pointer-events="none" />
      </svg>
    </div>
  )
}

function Gauge() {
  return (
    <div class="card card-square" onClick={() => charts.bump()}>
      <div class="card-head">
        <span class="card-title">Pressure</span>
        <span class="card-value" style={{ color: charts.gaugeColor }}>{charts.gaugeText}</span>
      </div>
      <svg width="170" height="170" viewBox="0 0 2000 2000">
        <path d="M307 1400A800 800 0 1 1 1693 1400" fill="none" stroke="#1e293b" stroke-width="160" stroke-linecap="round" />
        <path d={charts.gaugeArc} fill="none" stroke={charts.gaugeColor} stroke-width="160" stroke-linecap="round" />
        <g transform={charts.needleTransform}>
          <polygon points="960,1000 1040,1000 1000,340" fill="#e2e8f0" />
        </g>
        <circle cx="1000" cy="1000" r="100" fill="#e2e8f0" />
        <ellipse cx="1000" cy="1000" rx="40" ry="40" fill="#0f172a" />
        <rect x="700" y="1500" width="600" height="220" rx="110" ry="110" fill="none" stroke="#334155" stroke-width="20" />
      </svg>
    </div>
  )
}

export class App extends Component {
  template() {
    return (
      <div class="root">
        <span class="title">Inline SVG</span>
        <div class="row">
          <LineChart />
          <Donut />
          <Gauge />
        </div>
      </div>
    )
  }
}
