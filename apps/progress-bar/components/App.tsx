import { Component } from '@geastack/core'
import { ProgressBar, progressFraction } from '@geastack/elements'
import { demo } from '../stores/DemoStore'

export class App extends Component {
  // The buttons drive #demo-bar. The .demo-cases bars below them never change;
  // they cover default props, a fractional value with an empty label, a
  // negative range, an inverted range and a NaN value for core's pipeline test.
  template() {
    return (
      <div class="demo-app">
        <span class="demo-title">ProgressBar</span>
        <ProgressBar
          id="demo-bar"
          class={{ 'demo-bar': true, 'demo-bar--narrow': !demo.wide }}
          value={demo.value}
          min={demo.min}
          max={demo.max}
          indeterminate={demo.busy}
          reducedMotion={demo.still}
          label={demo.label}
        />
        <div class="demo-buttons">
          <button class="demo-button" onClick={() => demo.step(-25)}>Minus</button>
          <button class="demo-button" onClick={() => demo.step(25)}>Plus</button>
          <button class="demo-button" onClick={() => demo.setValue(150)}>Over</button>
          <button class="demo-button" onClick={() => demo.setValue(-20)}>Under</button>
        </div>
        <div class="demo-buttons">
          <button class="demo-button" onClick={() => demo.zeroRange()}>Zero range</button>
          <button class="demo-button" onClick={() => demo.toggleBusy()}>Busy</button>
          <button class="demo-button" onClick={() => demo.toggleStill()}>Still</button>
          <button class="demo-button" onClick={() => demo.toggleWide()}>Resize</button>
        </div>
        <div class="demo-buttons">
          <button class="demo-button" onClick={() => demo.reset()}>Reset</button>
        </div>
        <div class="demo-cases">
          <ProgressBar class="demo-case demo-case--defaults" />
          <ProgressBar class="demo-case demo-case--default-range" value={25} />
          <ProgressBar class="demo-case demo-case--fraction" value={33.34} label="" />
          <ProgressBar class="demo-case demo-case--negative" value={-75.5} min={-100.5} max={-50.5} />
          <ProgressBar class="demo-case demo-case--inverted" value={60} min={100} max={0} />
          <ProgressBar class="demo-case demo-case--nan" value={NaN} label={'NaN gives [' + progressFraction(NaN, 0, 100) + ']'} />
        </div>
      </div>
    )
  }
}
