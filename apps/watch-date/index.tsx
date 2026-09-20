import { mount } from '@geastack/core'
import { App } from './components/App'
import { dateWatch } from './stores/DateWatchStore'

dateWatch.init()
mount(App)

// Tick from the monotonic frame clock; the store reads the real wall clock
// (gea::host::Clock) each frame and only re-renders when the minute/day changes.
requestAnimationFrame(function loop(timestampMs) {
  dateWatch.tick(timestampMs)
  requestAnimationFrame(loop)
})
