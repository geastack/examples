import { system } from './stores/SystemStore'
import { Display, loadAssetImage, mount } from '@geastack/core'
import { App } from './apps/apps'
import { drawGraphic } from './common/canvas/render'
import { bootSound } from './lib/audio'
import { icons } from './assets'

Display.setDevicePixelRatio(1)
Display.setFrameRate(60)
Display.setVSync(false)
Display.setTextRasterCache(true)
Display.setFlushConfig({ rows: 16, depth: 2 })
// Target hardware initialization precedes the TS entry point. Present the
// original startup artwork for one app frame, then enter the guide/launcher;
// this does not claim to cover the earlier native HAL initialization phase.
system.init()
const initialScreen = system.screen

system.screen = 'boot'
mount(App)
let booted = false
let initialized = false

requestAnimationFrame(function loop(timestamp: int) {
  if (!booted) {
    booted = true
    bootSound()
    requestAnimationFrame(loop)

    return
  }

  if (!initialized) {
    // A deferred PNG decode costs tens of milliseconds on first exposure.
    // Prepare the eight shared menu images during startup, before a snap
    // can reveal a new neighbor and block an animation frame.
    for (const icon of icons) {
      loadAssetImage(icon).decode()
    }

    initialized = true
    system.screen = initialScreen
  }

  system.tick(timestamp)

  drawGraphic()
  requestAnimationFrame(loop)
})
