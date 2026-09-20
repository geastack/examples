import { Display, mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { fps } from './stores/FpsStore'

Display.setBrightness(100)
Display.setFlushConfig({ rows: 32, depth: 2 })
// Display.setAA(2) // TODO: see docs/css-3d-cube-aa-notes.md

mount(App)

let lastFpsLogMs = 0
requestAnimationFrame(function loop(timestampMs) {
  fps.tick(timestampMs)
  // TEMP (regression diagnosis): emit real fps to serial once/sec — negligible overhead.
  if (timestampMs - lastFpsLogMs >= 1000) {
    console.log('FPSLOG ' + fps.fpsText)
    lastFpsLogMs = timestampMs
  }
  requestAnimationFrame(loop)
})
