import { Display, ReactiveComponent, mount } from '@geastack/core'
import './styles.css'

// E-paper refresh policy (no-op on boards without an e-paper panel). The
// counter has no animation — every update should use the slow, crisp vendor
// waveform, so disable the fast-streak mode outright. (Animated apps would
// instead raise fastStreakWindowMs, or ship custom 159-byte partialLut /
// fastLut waveforms; Display.epaperFullRefresh() forces an anti-ghost flash.)
Display.setEpaperRefreshConfig({ fastStreakWindowMs: 0 })

export class App extends ReactiveComponent {
  count = 0
  increment() {
    this.count = this.count + 1
  }
  decrement() {
    this.count = this.count - 1
  }
  reset() {
    this.count = 0
  }
  keydown(keyCode: number) {
    // Hardware buttons (e-paper BOOT/PWR) and keyboards: ArrowUp / ArrowDown.
    if (keyCode === 38) this.increment()
    else if (keyCode === 40) this.decrement()
  }
  template() {
    // Styling lives in styles.css: vmin-sized so one layout fits every board
    // viewport, with an `@media (monochrome)` light theme for e-paper panels.
    return (
      <div class="counter-app" onKeyDown={event => this.keydown(event.keyCode)}>
        <span class="counter-title">Counter</span>
        <div class="counter-card">
          <span class="counter-count">{this.count}</span>
        </div>
        <div class="counter-controls">
          <div class="counter-button counter-button--minus" onClick={() => this.decrement()}>
            <span class="counter-minus-label">-</span>
          </div>
          <div class="counter-button counter-button--plus" onClick={() => this.increment()}>
            <span class="counter-plus-label">+</span>
          </div>
        </div>
        <div class="counter-reset" onClick={() => this.reset()}>
          <span class="counter-reset-label">Reset</span>
        </div>
      </div>
    )
  }
}

mount(App)
