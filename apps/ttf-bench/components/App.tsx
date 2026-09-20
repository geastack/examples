import { Component } from '@geastack/core'
import { ttfBench } from '../stores/TtfBenchStore'
import { TtfSpecimen } from './TtfSpecimen'

export class App extends Component {
  template() {
    return (
      <div class="ttf-app">
        <span class="ttf-title">Native TTF probe</span>
        <span class="ttf-status">{ttfBench.status}</span>
        <div class="ttf-row ttf-head">
          <span class="ttf-name">workload</span>
          <span class="ttf-time">ms</span>
        </div>
        {ttfBench.rows.map(row => (
          <div class="ttf-row">
            <span class="ttf-name">{row.name}</span>
            <span class="ttf-time">{row.value}</span>
          </div>
        ))}
        <div class="ttf-specimen">
          <span class="ttf-specimen-title">stb specimen</span>
          <TtfSpecimen />
        </div>
      </div>
    )
  }
}
