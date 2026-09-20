import { Store } from '@geastack/core'
import { BALL_COUNT } from '../constants'

const BALL_R = 8
const BALL_D = BALL_R * 2
const MIN_FIELD_SIZE = BALL_D + 1

interface Ball {
  x: int
  y: int
  dx: int
  dy: int
  color: string
}

function fieldWidth(): number {
  return Math.max(MIN_FIELD_SIZE, Math.floor(window.innerWidth))
}

function fieldHeight(): number {
  return Math.max(MIN_FIELD_SIZE, Math.floor(window.innerHeight))
}

function seededPosition(seed: number, max: number): number {
  return max > 0 ? seed % (max + 1) : 0
}

export class BallStore extends Store {
  balls: Ball[] = [{ x: 0, y: 0, dx: 0, dy: 0, color: '#000000' }]
  fpsText = 'FPS: --'
  fpsWindowStartMs = 0
  fpsWindowFrames = 0

  init() {
    const colors = [
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#00FFFF',
      '#FF00FF',
      '#FF6600',
      '#FFFFFF',
      '#8800FF',
      '#FFD700'
    ]
    // Grow by appending real elements, not by setting `length`.
    //
    // `this.balls.length = BALL_COUNT` extends the array with HOLES, so
    // `this.balls[i]` below is `undefined` for every i past the initializer's
    // single element and `.x =` on it is a TypeError -- in plain JavaScript
    // this loop never ran. It only worked because the old compiler lowered a
    // length write to `std::vector::resize`, which value-initializes structs;
    // a compiler that implements the Array exotic object's own rule reads a
    // hole and refuses. Pushing an element per index is the same intent said
    // in a way both agree on.
    while (this.balls.length < BALL_COUNT) {
      this.balls.push({ x: 0, y: 0, dx: 0, dy: 0, color: '#000000' })
    }
    const maxX = fieldWidth() - BALL_D
    const maxY = fieldHeight() - BALL_D
    for (let i = 0; i < BALL_COUNT; i++) {
      const seed = i * 97 + 23
      const speedX = ((i * 37 + 11) % 7) + 1
      const speedY = ((i * 53 + 17) % 7) + 1
      this.balls[i].x = seededPosition(i * 79 + 17, maxX)
      this.balls[i].y = seededPosition(i * 97 + 31, maxY)
      this.balls[i].dx = speedX * (seed % 2 === 0 ? 1 : -1)
      this.balls[i].dy = speedY * (seed % 3 === 0 ? 1 : -1)
      this.balls[i].color = colors[i % 10]
    }
  }

  tick(timestampMs: number) {
    if (this.fpsWindowStartMs === 0) {
      this.fpsWindowStartMs = timestampMs
    }
    this.fpsWindowFrames++

    const elapsedMs = timestampMs - this.fpsWindowStartMs
    if (elapsedMs >= 500) {
      const fps = Math.round((this.fpsWindowFrames * 1000) / elapsedMs)
      this.fpsText = `FPS: ${fps}`
      this.fpsWindowStartMs = timestampMs
      this.fpsWindowFrames = 0
    }

    const maxX = fieldWidth() - BALL_D
    const maxY = fieldHeight() - BALL_D
    for (let i = 0; i < this.balls.length; i++) {
      if (this.balls[i].x + this.balls[i].dx < 0 || this.balls[i].x + this.balls[i].dx > maxX)
        this.balls[i].dx = -this.balls[i].dx
      if (this.balls[i].y + this.balls[i].dy < 0 || this.balls[i].y + this.balls[i].dy > maxY)
        this.balls[i].dy = -this.balls[i].dy
      this.balls[i].x += this.balls[i].dx
      this.balls[i].y += this.balls[i].dy
      if (this.balls[i].x < 0) this.balls[i].x = 0
      if (this.balls[i].x > maxX) this.balls[i].x = maxX
      if (this.balls[i].y < 0) this.balls[i].y = 0
      if (this.balls[i].y > maxY) this.balls[i].y = maxY
    }
  }
}

export const balls = new BallStore()
