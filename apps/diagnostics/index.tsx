import { mount } from '@geastack/core'
import { App } from './components/App'
import { diag } from './stores/DiagnosticsStore'

diag.initialize()
mount(App)

// Poll live subsystem values each frame. The rAF timestamp is frozen on the gea
// runtime, so tick() reads its own clocks/host state rather than the arg.
requestAnimationFrame(function loop(_timestampMs: number) {
  diag.tick()
  requestAnimationFrame(loop)
})
