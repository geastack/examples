import { ReactiveComponent } from '@geastack/core'
import { TickBadge } from './TickBadge'

// EXPERIMENTAL probe: a ReactiveComponent (typed self-store) whose template
// MOUNTS a function-component child. Verifies the typed renderer composes with
// the regular boxed child renderer instead of silently rendering nothing.
export class App extends ReactiveComponent {
  count = 0

  bump() {
    this.count = this.count + 1
  }

  template() {
    return (
      <div class="probe-app" onClick={() => this.bump()}>
        <span class="probe-title">Reactive child probe</span>
        <TickBadge />
        <div class="probe-card">
          <span class="probe-count">{this.count}</span>
        </div>
        <span class="probe-hint">tap to bump</span>
      </div>
    )
  }
}
