import { Display, mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { breakout } from './stores/BreakoutStore'
import { fps } from './stores/FpsStore'

Display.setSupportedOrientations('all')
Display.autoRotate = true

breakout.init()
mount(App)

// The frame clock, not `Date.now()`: the timestamp this callback is handed is
// the host's own advancing frame time (`Application::frame(gea_embedded_now_ms())`),
// which is the clock the serve-delay timer is compared against. It used to be
// read as frozen -- a compiler defect that dropped the callback's argument, long
// since fixed -- and `Date.now()` was ms-since-epoch, so a delay armed off one
// clock was tested against the other and every pause expired on its first frame.
requestAnimationFrame(function loop(timestampMs: number) {
  fps.tick(timestampMs)
  breakout.tick(timestampMs)
  requestAnimationFrame(loop)
})
