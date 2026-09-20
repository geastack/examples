import { Display, mount } from '@geastack/core'
import { Settings } from '../../../shared/Settings'
import './styles.css'
import './stores/HIDService'
import { App } from './components/App'

Display.setFlushConfig({ rows: 40, depth: 2 })

Settings.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  Settings.tick(timestampMs)
  requestAnimationFrame(loop)
})
