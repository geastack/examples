import { Display, rgb } from '@geastack/core'

Display.setFrameRate(60)
Display.setFlushConfig({ rows: 32, depth: 2 })

const DISPLAY_W = 410
const DISPLAY_H = 502
const BALL_R = 8
const BALL_COUNT = 24
const BAND_COUNT = 14
const BAND_H = Math.floor(DISPLAY_H / BAND_COUNT)

const bandStyles = [
  'rgb(239,71,58)',   // red
  'rgb(243,109,44)',  // red-orange
  'rgb(247,148,30)',  // orange
  'rgb(250,185,43)',  // amber
  'rgb(252,222,56)',  // yellow
  'rgb(166,203,58)',  // yellow-green
  'rgb(80,184,60)',   // green
  'rgb(76,172,142)',  // teal
  'rgb(72,159,224)',  // blue
  'rgb(85,115,210)',  // periwinkle
  'rgb(99,71,196)',   // indigo
  'rgb(130,74,194)',  // blue-violet
  'rgb(160,78,192)',  // violet
  'rgb(200,80,170)',  // magenta
]

const ballX = new Uint16Array(BALL_COUNT)
const ballY = new Uint16Array(BALL_COUNT)
const ballDx = new Int8Array(BALL_COUNT)
const ballDy = new Int8Array(BALL_COUNT)
const ballColor = new Uint32Array(BALL_COUNT)
const prevX = new Uint16Array(BALL_COUNT)
const prevY = new Uint16Array(BALL_COUNT)

const ctx = Display.ctx

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomVelocity(): number {
  const speed = randomInt(1, 5)
  return Math.random() < 0.5 ? -speed : speed
}

function initBalls(): void {
  for (let i = 0; i < BALL_COUNT; i++) {
    ballX[i] = randomInt(BALL_R, DISPLAY_W - BALL_R - 1)
    ballY[i] = randomInt(BALL_R, DISPLAY_H - BALL_R - 1)
    ballDx[i] = randomVelocity()
    ballDy[i] = randomVelocity()
    ballColor[i] = rgb(randomInt(64, 255), randomInt(64, 255), randomInt(64, 255))
    prevX[i] = ballX[i]
    prevY[i] = ballY[i]
  }
}

const CELL = 64

function drawRainbow(): void {
  const colsAcross = Math.ceil(DISPLAY_W / CELL)
  const rowsDown = Math.ceil(DISPLAY_H / CELL)
  for (let cy = 0; cy < rowsDown; cy++) {
    for (let cx = 0; cx < colsAcross; cx++) {
      ctx.fillStyle = ((cx + cy) & 1) === 0 ? 'rgb(0,0,0)' : 'rgb(255,255,255)'
      const x = cx * CELL
      const y = cy * CELL
      const w = Math.min(CELL, DISPLAY_W - x)
      const h = Math.min(CELL, DISPLAY_H - y)
      ctx.fillRect(x, y, w, h)
    }
  }
}

function eraseOldBalls(): void {
  for (let i = 0; i < BALL_COUNT; i++) {
    const x = prevX[i]
    const y = prevY[i]
    const x0 = x - BALL_R < 0 ? 0 : x - BALL_R
    const y0 = y - BALL_R < 0 ? 0 : y - BALL_R
    const x1 = x + BALL_R >= DISPLAY_W ? DISPLAY_W - 1 : x + BALL_R
    const y1 = y + BALL_R >= DISPLAY_H ? DISPLAY_H - 1 : y + BALL_R
    for (let yy = y0; yy <= y1; yy++) {
      let xx = x0
      while (xx <= x1) {
        const cx = (xx / CELL) | 0
        const cy = (yy / CELL) | 0
        const cellEndX = Math.min((cx + 1) * CELL - 1, x1)
        ctx.fillStyle = ((cx + cy) & 1) === 0 ? 'rgb(0,0,0)' : 'rgb(255,255,255)'
        ctx.fillRect(xx, yy, cellEndX - xx + 1, 1)
        xx = cellEndX + 1
      }
    }
  }
}

function stepBalls(): void {
  for (let i = 0; i < BALL_COUNT; i++) {
    const dx = ballDx[i]
    const dy = ballDy[i]
    let x = ballX[i] + dx
    let y = ballY[i] + dy

    if (x < BALL_R) {
      x = BALL_R
      ballDx[i] = -dx
    } else if (x >= DISPLAY_W - BALL_R) {
      x = DISPLAY_W - BALL_R - 1
      ballDx[i] = -dx
    }

    if (y < BALL_R) {
      y = BALL_R
      ballDy[i] = -dy
    } else if (y >= DISPLAY_H - BALL_R) {
      y = DISPLAY_H - BALL_R - 1
      ballDy[i] = -dy
    }

    ballX[i] = x
    ballY[i] = y
  }
}

function renderFrame(): void {
  eraseOldBalls()
  stepBalls()
  for (let i = 0; i < BALL_COUNT; i++) {
    prevX[i] = ballX[i]
    prevY[i] = ballY[i]
  }
  ctx.fillCirclesRgb565(ballX, ballY, BALL_R, ballColor)
  ctx.flush()
}

initBalls()
drawRainbow()
ctx.fillCirclesRgb565(ballX, ballY, BALL_R, ballColor)
ctx.flush()

requestAnimationFrame(function frame(_timestampMs: number): void {
  renderFrame()
  requestAnimationFrame(frame)
})
