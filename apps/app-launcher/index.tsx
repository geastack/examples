import { Display, Input, mount } from '@geastack/core'
import { Settings } from '../../shared/Settings'
import { App } from './components/App'
import { launcher } from './stores/LauncherStore'

Display.setFlushConfig({ rows: 32, depth: 2 })

Settings.init()
launcher.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  Settings.tick(timestampMs)
  launcher.tick(timestampMs)
  // BOOT button (ESP32) — short press at the launcher sets the back-button
  // flag from the platform side. Close Settings if open; otherwise no-op.
  if (Input.consumeBackButton() && Settings.visible) Settings.close()
  requestAnimationFrame(loop)
})
