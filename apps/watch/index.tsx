import { mount } from '@geastack/core'
import { App } from './components/App'
import { watch } from './stores/WatchStore'

watch.init()
mount(App)

// Advance the clock from the monotonic frame clock. This keeps time moving
// (and verifiable) before SNTP is wired; once SNTP sets the system clock the
// store will anchor `baseSec` to the real epoch (M10).
requestAnimationFrame(function loop(timestampMs) {
  watch.tick(timestampMs)
  requestAnimationFrame(loop)
})
