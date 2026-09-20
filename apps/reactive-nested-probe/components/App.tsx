import { ReactiveComponent } from '@geastack/core'
import { Rail } from './Rail'
import { Panel } from './Panel'

// EXPERIMENTAL probe for the two mount shapes a typed parent couldn't do
// before: <Rail/> — a function child whose keyed-list renderer reads its boxed
// store param (now threaded the global store), and <Panel/> — a reactive child
// (fresh typed instance). The parent's own typed Signal state must keep
// working alongside both.
export class App extends ReactiveComponent {
  count = 0

  bump() {
    this.count = this.count + 1
  }

  template() {
    return (
      <div class="probe-app">
        <span class="probe-title">Nested probe</span>
        <Rail />
        <Panel />
        <div class="probe-card" onClick={() => this.bump()}>
          <span class="probe-count">{this.count}</span>
        </div>
        <span class="probe-hint">chips select · panel counts · card bumps</span>
      </div>
    )
  }
}
