import { Component, mount } from '@geastack/core'
import { AnalogClockView } from './src/AnalogClockView'
import { analogClock } from './src/ClockStore'

class App extends Component {
  template() {
    return <AnalogClockView />
  }
}

analogClock.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  analogClock.tick(timestampMs)
  requestAnimationFrame(loop)
})
