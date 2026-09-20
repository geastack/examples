import { mount } from '@geastack/core'
import { Settings } from '../../shared/Settings'
import { App } from './components/App'

Settings.init()
Settings.open()

mount(App)

requestAnimationFrame(function loop(timestampMs) {
  Settings.tick(timestampMs)
  requestAnimationFrame(loop)
})
