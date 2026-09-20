import { loadAssets } from './src/assets'
import { createGame } from './src/game'
import { bindInput } from './src/input'
import {
  DISPLAY_HEIGHT,
  DISPLAY_WIDTH,
  clearCanvas,
  color,
  configureCanvasRuntime,
  drawText,
  fillRect
} from './src/runtime'

function showLoading() {
  clearCanvas()
  fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT, color(47, 150, 209))
  drawText('Loading Sky Hop...', 20, 224, color(255, 255, 255), 2)
}

function showLoadError() {
  clearCanvas()
  fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT, color(31, 41, 55))
  drawText('Asset load failed', 24, 214, color(255, 255, 255), 2)
  drawText('Rebuild the web app.', 24, 252, color(248, 196, 77), 1)
}

async function startGame() {
  configureCanvasRuntime()
  showLoading()

  const assets = loadAssets()
  if (!assets) {
    showLoadError()
    return
  }

  const input = bindInput()
  const game = createGame()
  game.assets = assets
  game.input = input
  let lastTimestampMs = 0
  let fpsWindowStartMs = 0
  let fpsWindowFrames = 0
  let fpsText = 'FPS --'

  requestAnimationFrame(function frame(timestampMs) {
    if (lastTimestampMs === 0) lastTimestampMs = timestampMs
    const deltaMs = Math.min(42, timestampMs - lastTimestampMs)
    lastTimestampMs = timestampMs
    if (fpsWindowStartMs === 0) fpsWindowStartMs = timestampMs
    fpsWindowFrames++
    const fpsElapsedMs = timestampMs - fpsWindowStartMs
    if (fpsElapsedMs >= 500) {
      fpsText = 'FPS ' + Math.round((fpsWindowFrames * 1000) / fpsElapsedMs)
      fpsWindowFrames = 0
      fpsWindowStartMs = timestampMs
    }

    // Input is event-driven: handlers update the module-level keyboard/pointer
    // state. Refresh this frame-local value from those event states before tick.
    input.poll()
    game.input = input
    game.fpsText = fpsText
    game.deltaMs = deltaMs
    game.tick()
    game.render()
    requestAnimationFrame(frame)
  })
}

void startGame()
