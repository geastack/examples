import { configureCanvas3dDisplay, drawInitialCanvas3dFrame, initCanvas3dDemo, renderCanvas3dFrame } from './src/runtime'

// Raise the cadence cap well above the achievable rate so the scheduler runs
// work-bound (graceful overrun) at the present-wall (~85fps) instead of the
// 62.5fps default cap. Frame work is ~11ms (recording ~2.7ms + present ~8.5ms).
configureCanvas3dDisplay()

initCanvas3dDemo()

drawInitialCanvas3dFrame()

const frame = (timestampMs: number) => {
  renderCanvas3dFrame(timestampMs)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
