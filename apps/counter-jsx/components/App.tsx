import { ReactiveComponent } from '@geastack/core'
import './App.css'
import './CounterValue.css'
import './MinusButton.css'
import './PlusButton.css'
import './ResetButton.css'

// Component-as-store: App holds its own reactive state (no CounterStore). On the
// embedded target `count`/`status` compile to typed Signals; each tap calls a
// typed method whose Signal write re-renders only the dependent text node.
export class App extends ReactiveComponent {
  count = 0
  status = 'Ready'

  increment() {
    this.count = this.count + 1
    this.updateStatus()
  }

  decrement() {
    this.count = this.count - 1
    this.updateStatus()
  }

  reset() {
    this.count = 0
    this.status = 'Reset to zero'
  }

  updateStatus() {
    if (this.count > 0) this.status = 'Counting up'
    else if (this.count < 0) this.status = 'Below zero'
    else this.status = 'Back at zero'
  }

  template() {
    return (
      <div class="counter-app">
        <span class="counter-title">Counter</span>
        <div class="counter-display">
          <span class="counter-value">{this.count}</span>
        </div>
        <div class="counter-controls">
          <div class="counter-minus-button" onClick={() => this.decrement()}>
            <span class="counter-minus-symbol">-</span>
          </div>
          <div class="counter-plus-button" onClick={() => this.increment()}>
            <span class="counter-plus-symbol">+</span>
          </div>
        </div>
        <div class="counter-reset-button" onClick={() => this.reset()}>
          <span class="counter-reset-label">Reset</span>
        </div>
        <span class="counter-status">{this.status}</span>
      </div>
    )
  }
}
