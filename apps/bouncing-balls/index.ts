import { Display } from '@geastack/core'

Display.setFrameRate(120)
Display.setFlushConfig({ rows: 24, depth: 4 })
const BALL_R: int = 8
const BALL_COUNT = 64
const DISPLAY_W: int = Math.max(BALL_R * 2 + 1, Math.floor(window.innerWidth))
const DISPLAY_H: int = Math.max(BALL_R * 2 + 1, Math.floor(window.innerHeight))

const ballX = new Uint16Array(BALL_COUNT)
const ballY = new Uint16Array(BALL_COUNT)
const ballDx = new Int8Array(BALL_COUNT)
const ballDy = new Int8Array(BALL_COUNT)
const ballColor: Rgb565[] = new Array(BALL_COUNT)
const ctx = Display.ctx

// Integer bounds for the physics hot loop. TS `number` lowers to `double`, and
// this SoC has no double-precision FPU — so a naive `ballX[i] + dx` runs in
// soft-float (~5.9ms/frame for 1000 balls). The native `int` type lowers to
// `long long` with exact integer arithmetic on the hardware ALU, collapsing the
// physics to well under a millisecond.
const MIN_X: int = BALL_R
const MAX_X: int = DISPLAY_W - BALL_R - 1
const MIN_Y: int = BALL_R
const MAX_Y: int = DISPLAY_H - BALL_R - 1

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomVelocity(): number {
  const speed = randomInt(2, 6)
  return Math.random() < 0.5 ? -speed : speed
}

function initBalls(): void {
  for (let i = 0; i < BALL_COUNT; i++) {
    ballX[i] = randomInt(BALL_R, DISPLAY_W - BALL_R - 1)
    ballY[i] = randomInt(BALL_R, DISPLAY_H - BALL_R - 1)
    ballDx[i] = randomVelocity()
    ballDy[i] = randomVelocity()
    ballColor[i] = rgb565(randomInt(0, 255), randomInt(0, 255), randomInt(0, 255))
  }
}

function stepBalls(): void {
  for (let i: int = 0; i < BALL_COUNT; i++) {
    const dx: int = ballDx[i]
    const dy: int = ballDy[i]
    let x: int = ballX[i] + dx
    let y: int = ballY[i] + dy

    if (x < MIN_X) {
      x = MIN_X
      ballDx[i] = -dx
    } else if (x > MAX_X) {
      x = MAX_X
      ballDx[i] = -dx
    }

    if (y < MIN_Y) {
      y = MIN_Y
      ballDy[i] = -dy
    } else if (y > MAX_Y) {
      y = MAX_Y
      ballDy[i] = -dy
    }

    ballX[i] = x
    ballY[i] = y
  }
}

function drawBalls(): void {
  ctx.fillCirclesRgb565(ballX, ballY, BALL_R, ballColor)
}

let prevMs = 0
let emaFps = 0
let lastShownFps = -1
let fpsLabel = 'FPS --'

function drawFps(): void {
  ctx.fillStyle = 'rgb(0,255,128)'
  ctx.font = '22px monospace'
  ctx.fillText(fpsLabel, 6, 23)
}

function renderFrame(nowMs: number): void {
  if (prevMs > 0) {
    const dt = nowMs - prevMs
    if (dt > 0) {
      const inst = 1000 / dt
      emaFps = emaFps === 0 ? inst : emaFps * 0.9 + inst * 0.1
      // Rebuild the label string only when the integer fps changes — a per-frame
      // string concat is costly on this JS-physics-bound (1000-ball) demo.
      const f = Math.round(emaFps)
      if (f !== lastShownFps) {
        fpsLabel = 'FPS ' + String(f)
        lastShownFps = f
      }
    }
  }
  prevMs = nowMs
  stepBalls()
  ctx.beginBatch()
  ctx.clear()
  drawBalls()
  drawFps()
  ctx.endBatch()
}

initBalls()
ctx.beginBatch()
ctx.clear()
drawBalls()
drawFps()
ctx.endBatch()

requestAnimationFrame(function frame(timestampMs: number): void {
  renderFrame(timestampMs)
  requestAnimationFrame(frame)
})
