import { system } from '../../stores/SystemStore'
import { watchFace } from '../../apps/app_watch_face/store'
import { fft } from '../../apps/app_fft/store'
import { luckyWheel } from '../../apps/app_lucky_wheel/store'
import { canvasContext, canvasGeneration } from './CanvasSurface'
import { drawClassic } from '../../apps/app_watch_face/view/classic'
import { drawSimple } from '../../apps/app_watch_face/view/simple'
import { drawImu } from '../../apps/app_imu/view/view'
import { drawFft } from '../../apps/app_fft/view/view'
import { drawWheel } from '../../apps/app_lucky_wheel/view/wheel'

let lastStaticKey = ''
let lastGeneration = -1

export function drawGraphic() {
  const ctx = canvasContext()

  if (ctx === null) {
    return
  }

  const generation = canvasGeneration()

  if (generation !== lastGeneration) {
    lastGeneration = generation
    lastStaticKey = ''
  }

  if (
    system.screen !== 'watch' &&
    system.screen !== 'imu' &&
    system.screen !== 'fft' &&
    system.screen !== 'wheel'
  ) {
    return
  }

  if (system.screen === 'watch' && watchFace.face !== 0 && watchFace.face !== 3) {
    return
  }

  if (system.screen === 'wheel' && !luckyWheel.wheelReady) {
    return
  }

  let staticKey = ''

  if (system.screen === 'fft') {
    staticKey = 'fft:' + fft.fftRevision + ':' + fft.fftDiscSize
  } else if (system.screen === 'wheel') {
    staticKey = 'wheel:' + luckyWheel.options
  } else if (system.screen === 'watch' && watchFace.face === 0) {
    staticKey =
      'classic:' +
      watchFace.classicMode +
      ':' +
      watchFace.time +
      ':' +
      watchFace.weekday +
      ':' +
      watchFace.day
  }

  if (staticKey.length > 0 && staticKey === lastStaticKey) {
    return
  }

  lastStaticKey = staticKey

  ctx.beginBatch()
  if (system.screen !== 'fft') {
    ctx.clear()
  }

  if (system.screen === 'watch' && watchFace.face === 0) {
    drawClassic(ctx)
  } else if (system.screen === 'watch' && watchFace.face === 3) {
    drawSimple(ctx)
  } else if (system.screen === 'imu') {
    drawImu(ctx)
  } else if (system.screen === 'fft') {
    drawFft(ctx)
  } else if (system.screen === 'wheel' && luckyWheel.wheelReady) {
    drawWheel(ctx)
  }

  ctx.endBatch()
}
