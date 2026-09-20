import { Component } from '@geastack/core'
import { bench } from '../stores/BenchStore'

export class App extends Component {
  template() {
    return (
      <div class="bench-app" momentum>
        <span class="bench-title">gea vs native C++</span>
        <span class="bench-status">{bench.status}</span>
        <div class="bench-row bench-head">
          <span class="bench-name">workload</span>
          <span class="bench-gea">gea</span>
          <span class="bench-native">native</span>
        </div>
        {bench.rows.map(row => (
          <div class="bench-row">
            <span class="bench-name">{row.name}</span>
            <span class="bench-gea">{row.gea < 0 ? '-' : `${row.gea} ms`}</span>
            <span class="bench-native">{`${row.native} ms`}</span>
          </div>
        ))}
      </div>
    )
  }
}
