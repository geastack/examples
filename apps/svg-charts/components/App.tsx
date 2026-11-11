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
      <svg width="340" height="170" viewBox="-10 -10 320 160">
        <g class="grid" stroke="#1e293b" stroke-width="1">
          <line x1="0" y1="0" x2="300" y2="0" />
          <line x1="0" y1="35" x2="300" y2="35" />
          <line x1="0" y1="70" x2="300" y2="70" />
          <line x1="0" y1="105" x2="300" y2="105" />
          <line x1="0" y1="140" x2="300" y2="140" />
        </g>
        <path d={charts.areaPath} fill="#38bdf8" fill-opacity="0.18" />
        <path d={charts.linePath} class="line" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx={charts.lastX} cy={charts.lastY} r="5" fill="#0f172a" stroke="#38bdf8" stroke-width="3" />
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
      <svg width="170" height="170" viewBox="0 0 200 200">
        {charts.slices.map(slice => (
          <path
            key={slice.index}
            d={slice.d}
            fill={slice.color}
            class={slice.index === charts.selected ? 'slice slice-selected' : 'slice'}
            onClick={() => charts.select(slice.index)}
          />
        ))}
        <circle cx="100" cy="100" r="50" fill="#0f172a" pointer-events="none" />
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
      <svg width="170" height="170" viewBox="0 0 200 200">
        <path d="M30.7 140A80 80 0 1 1 169.3 140" fill="none" stroke="#1e293b" stroke-width="16" stroke-linecap="round" />
        <path d={charts.gaugeArc} fill="none" stroke={charts.gaugeColor} stroke-width="16" stroke-linecap="round" />
        <g transform={charts.needleTransform}>
          <polygon points="96,100 104,100 100,34" fill="#e2e8f0" />
        </g>
        <circle cx="100" cy="100" r="10" fill="#e2e8f0" />
        <ellipse cx="100" cy="100" rx="4" ry="4" fill="#0f172a" />
        <rect x="70" y="150" width="60" height="22" rx="11" ry="11" fill="none" stroke="#334155" stroke-width="2" />
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
