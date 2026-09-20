import { Accelerometer, Audio, Store, audioContext } from '@geastack/core'
import {
  BALL_DX,
  BALL_DY,
  BALL_R,
  BALL_START_X,
  BALL_START_Y,
  BRICK_H,
  BRICK_COLS,
  BRICK_COUNT,
  BRICK_STEP_X,
  BRICK_STEP_Y,
  BRICK_W,
  BRICK_X,
  BRICK_Y,
  H,
  MISS_PAUSE_MS,
  PADDLE_BOUNCE_DIVISOR,
  PADDLE_H,
  PADDLE_HIT_PAD,
  PADDLE_MARGIN,
  PADDLE_START_X,
  PADDLE_TILT_DEADZONE,
  PADDLE_TILT_SCALE,
  PADDLE_W,
  PADDLE_Y,
  S,
  TOP_WALL_Y,
  W,
  WIN_PAUSE_MS,
} from '../constants'

// Master volume for `sound()`, as a percent. This feeds the host's single gain
// node, so 0 mutes every oscillator no matter how many are started -- which is
// exactly how this app went silent. Square waves are harsh, so keep it well
// under the host default of 80.
const AUDIO_VOLUME_PERCENT = 25

export class BreakoutStore extends Store {
  bricks = [{ x: 0, y: 0, alive: 1, opacity: 255, color: '#EF4444' }]
  ballX = 0
  ballY = 0
  ballLeft = 0
  ballTop = 0
  ballDx = 0
  ballDy = 0
  paddleX = 0
  paddleXPx = 0
  score = 0
  lives = 3
  remainingBricks = 0
  roundWon = 0
  serveAtMs = 0
  status = 'Tilt or drag to move.'
  viewportW = 0
  viewportH = 0
  viewportScale = 1

  sound(frequency: number, durationMs: number) {
    const oscillator = audioContext.createOscillator()
    oscillator.type = 'square'
    oscillator.frequency.value = frequency
    oscillator.connect(audioContext.destination)
    const now = audioContext.currentTime
    oscillator.start(now)
    oscillator.stop(now + durationMs * 0.001)
  }

  syncBallLayout() {
    this.ballLeft = this.ballX - BALL_R
    this.ballTop = this.ballY - BALL_R
  }

  clampPaddleX() {
    if (this.paddleX < PADDLE_MARGIN) this.paddleX = PADDLE_MARGIN
    if (this.paddleX > W - PADDLE_W - PADDLE_MARGIN) {
      this.paddleX = W - PADDLE_W - PADDLE_MARGIN
    }
  }

  syncPaddleLayout() {
    const nextX = Math.round(this.paddleX)
    if (this.paddleXPx !== nextX) this.paddleXPx = nextX
  }

  positionBricks() {
    for (let i = 0; i < this.bricks.length; i++) {
      this.bricks[i].x = BRICK_X + (i % BRICK_COLS) * BRICK_STEP_X
      this.bricks[i].y = BRICK_Y + ((i / BRICK_COLS) | 0) * BRICK_STEP_Y
    }
  }

  syncViewport() {
    if (this.viewportW === W && this.viewportH === H) return
    if (this.viewportW > 0 && this.viewportH > 0) {
      const rx = W / this.viewportW
      const ry = H / this.viewportH
      const rs = S / this.viewportScale
      this.ballX = this.ballX * rx
      this.ballY = this.ballY * ry
      this.ballDx = this.ballDx * rs
      this.ballDy = this.ballDy * rs
      this.paddleX = this.paddleX * rx
      this.clampPaddleX()
      this.positionBricks()
      this.syncBallLayout()
      this.syncPaddleLayout()
    }
    this.viewportW = W
    this.viewportH = H
    this.viewportScale = S
  }

  resetBricks() {
    this.remainingBricks = BRICK_COUNT
    // Grow by PUSHING real elements, never by assigning `length`. Raising
    // `length` on a one-element array leaves holes, so `this.bricks[1]` is
    // `undefined` and the writes below throw -- that is what JavaScript does,
    // and the compiler is right to say so.
    while (this.bricks.length < BRICK_COUNT) {
      this.bricks.push({ x: 0, y: 0, alive: 1, opacity: 255, color: '#EF4444' })
    }
    for (let i = 0; i < this.bricks.length; i++) {
      this.bricks[i].alive = 1
      this.bricks[i].opacity = 255
      if (i < 6) this.bricks[i].color = '#F97316'
      else if (i < 12) this.bricks[i].color = '#EAB308'
      else if (i < 18) this.bricks[i].color = '#22C55E'
      else this.bricks[i].color = '#38BDF8'
    }
    this.positionBricks()
  }

  init() {
    Audio.setVolume(AUDIO_VOLUME_PERCENT)
    this.viewportW = W
    this.viewportH = H
    this.viewportScale = S
    Accelerometer.start()
    this.ballX = BALL_START_X
    this.ballY = BALL_START_Y
    this.syncBallLayout()
    this.ballDx = BALL_DX
    this.ballDy = BALL_DY
    this.paddleX = PADDLE_START_X
    this.syncPaddleLayout()
    this.score = 0
    this.lives = 3
    this.roundWon = 0
    this.serveAtMs = 0
    this.status = 'Tilt or drag to move.'
    this.resetBricks()
  }

  resetBall() {
    this.ballX = BALL_START_X
    this.ballY = BALL_START_Y
    this.syncBallLayout()
    this.ballDx = -this.ballDx
    this.ballDy = BALL_DY
  }

  movePaddleTo(x: number) {
    this.syncViewport()
    this.paddleX = x - PADDLE_W / 2
    this.clampPaddleX()
    this.syncPaddleLayout()
  }

  handleTouchStart(x: number) {
    this.movePaddleTo(x)
  }

  handleTouchMove(x: number) {
    this.movePaddleTo(x)
  }

  tick(timestampMs: number) {
    this.syncViewport()

    if (this.serveAtMs > 0) {
      if (timestampMs < this.serveAtMs) return
      this.serveAtMs = 0
      if (this.roundWon || this.lives <= 0) {
        this.init()
      } else {
        this.resetBall()
      }
    }

    let tilt = -Accelerometer.tiltX
    if (tilt > -PADDLE_TILT_DEADZONE && tilt < PADDLE_TILT_DEADZONE) tilt = 0
    if (tilt !== 0) {
      this.paddleX = this.paddleX + tilt * PADDLE_TILT_SCALE
      this.clampPaddleX()
      this.syncPaddleLayout()
    }

    this.ballX = this.ballX + this.ballDx
    this.ballY = this.ballY + this.ballDy
    this.syncBallLayout()

    if (this.ballX < BALL_R || this.ballX > W - BALL_R) {
      this.ballDx = -this.ballDx
      this.sound(300, 22)
    }
    if (this.ballY < TOP_WALL_Y) {
      this.ballDy = -this.ballDy
      this.sound(340, 22)
    }

    if (
      this.ballY > PADDLE_Y - PADDLE_HIT_PAD &&
      this.ballY < PADDLE_Y + PADDLE_H + PADDLE_HIT_PAD &&
      this.ballX > this.paddleX &&
      this.ballX < this.paddleX + PADDLE_W
    ) {
      this.ballDy = BALL_DY
      this.ballDx = (this.ballX - (this.paddleX + PADDLE_W / 2)) / PADDLE_BOUNCE_DIVISOR
      this.sound(520, 38)
    }

    for (let i = 0; i < this.bricks.length; i++) {
      if (
        this.bricks[i].alive &&
        this.ballX > this.bricks[i].x &&
        this.ballX < this.bricks[i].x + BRICK_W &&
        this.ballY > this.bricks[i].y &&
        this.ballY < this.bricks[i].y + BRICK_H
      ) {
        this.bricks[i].alive = 0
        this.bricks[i].opacity = 0
        this.ballDy = -this.ballDy
        this.score = this.score + 10
        this.remainingBricks = this.remainingBricks - 1
        this.sound(720, 48)
      }
    }

    if (this.remainingBricks <= 0) {
      this.roundWon = 1
      this.status = 'You win. New round coming.'
      this.serveAtMs = timestampMs + WIN_PAUSE_MS
      this.sound(880, 140)
    }

    if (this.ballY > H) {
      this.lives = this.lives - 1
      if (this.lives <= 0) {
        this.status = 'Game over. Resetting.'
        this.sound(120, 180)
      } else {
        this.status = 'Ball lost. Lives ' + this.lives
        this.sound(180, 110)
      }
      this.serveAtMs = timestampMs + MISS_PAUSE_MS
    }
  }
}

export const breakout = new BreakoutStore()
export const game = breakout
