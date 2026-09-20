import { mount } from '@geastack/core'
import { App } from './components/App'
import { game } from './stores/GameStore'

game.init()
mount(App)

requestAnimationFrame(function loop(timestampMs) {
  game.tick(timestampMs)
  requestAnimationFrame(loop)
})
