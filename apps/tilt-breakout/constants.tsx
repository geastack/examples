export const BASE_W = 410
export const BASE_H = 502

export const BRICK_COUNT = 24
export const BRICK_COLS = 6

export const MISS_PAUSE_MS = 700
export const WIN_PAUSE_MS = 1100

export const W = Math.max(1, Math.floor(window.innerWidth))
export const H = Math.max(1, Math.floor(window.innerHeight))
export const SX = W / BASE_W
export const SY = H / BASE_H
export const S = SX

const scaleX = (value: number) => Math.round(value * SX)
const scaleY = (value: number) => Math.round(value * SY)
const scaleSize = (value: number) => Math.max(1, Math.round(value * S))

export const BRICK_X = scaleX(20)
export const BRICK_Y = scaleY(78)
export const BRICK_STEP_X = scaleX(62)
export const BRICK_STEP_Y = scaleY(28)
export const BRICK_W = scaleSize(54)
export const BRICK_H = scaleSize(18)
export const PADDLE_W = scaleSize(92)
export const PADDLE_H = scaleSize(14)
export const PADDLE_MARGIN = scaleX(14)
export const PADDLE_Y = scaleY(430)
export const PADDLE_START_X = scaleX(159)
export const PADDLE_HIT_PAD = scaleSize(8)
export const PADDLE_BOUNCE_DIVISOR = scaleSize(12)
export const PADDLE_TILT_SCALE = SX / 10
export const PADDLE_TILT_DEADZONE = 1
export const BALL_R = scaleSize(8)
export const BALL_START_X = scaleX(205)
export const BALL_START_Y = scaleY(355)
export const BALL_DX = Math.max(1, 3 * S)
export const BALL_DY = -Math.max(1, 4 * S)
export const TOP_WALL_Y = scaleY(54)
