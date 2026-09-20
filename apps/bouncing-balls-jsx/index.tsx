import { Display, mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { balls } from './stores/BallStore'

Display.setFrameRate(120)
Display.setVSync(false)
Display.setTextRasterCache(true)
Display.setFlushConfig({ rows: 64, depth: 2 })

balls.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  balls.tick(timestampMs)
  requestAnimationFrame(loop)
})
