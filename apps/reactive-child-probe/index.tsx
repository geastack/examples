import { mount } from '@geastack/core'
import './styles.css'
import { App } from './components/App'
import { ticker } from './stores/TickStore'

mount(App)

requestAnimationFrame(function loop(timestampMs) {
  ticker.tick(timestampMs)
  requestAnimationFrame(loop)
})
