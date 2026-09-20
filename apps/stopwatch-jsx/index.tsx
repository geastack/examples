import { mount } from '@geastack/core'
import { App } from './components/App'
import { stopwatch } from './stores/StopwatchStore'

stopwatch.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  stopwatch.tick(timestampMs)
  requestAnimationFrame(loop)
})
