import { Store } from '@geastack/core'
import {
  AIR_FRICTION, COYOTE_MS, DISPLAY_W, ENEMY_H, ENEMY_W, GRAVITY, GROUND_FRICTION, HURT_COOLDOWN_MS,
  JUMP_BUFFER_MS, JUMP_SIDE_BOOST, JUMP_VELOCITY, MAX_FALL, MAX_SPEED, MOVE_ACCEL, PLAYER_H, PLAYER_W, STOMP_BOUNCE,
  TILE
} from '../constants'

const LEVEL_W = 61
const LEVEL_H = 14
const LEVEL_PIXEL_W = 2196
const LEVEL_PIXEL_H = 504
const VOID_Y = 510
const TILE_COUNT = 179
const COIN_COUNT = 8
const ENEMY_COUNT = 2
const SOLID_COUNT = 854
const PLAYER_START_X = 74
const PLAYER_START_Y = 342
const GOAL_X = 1990
const GOAL_Y = 260

export class GameStore extends Store {
  playerX = 74.0
  playerY = 342.0
  playerRenderLeft = 70
  playerRenderTop = 340
  playerRenderFrame = 0
  playerVx = 0.0
  playerVy = 0.0
  playerFacing = 1
  onGround = 0
  prevJumpDown = 0
  walkFrame = 0.0
  hurtCooldownMs = 0.0
  coyoteMs = 0.0
  jumpBufferMs = 0.0
  cameraX = 0.0
  score = 0
  lives = 3
  won = 0
  walkCycle = 0
  blink = 0
  goalX = 1990
  goalY = 260

  pressLeft = 0
  pressRight = 0
  pressJump = 0

  lastTimestampMs = 0.0

  solid: Array<{ v: number }> = []
  grassTiles: Array<{ x: number; y: number }> = []
  dirtTiles: Array<{ x: number; y: number }> = []
  crateTiles: Array<{ x: number; y: number }> = []
  coins: Array<{ x: number; y: number; collected: number }> = []
  enemies: Array<{ x: number; y: number; vx: number; alive: number; dead: number }> = []

  init() {
    this.populateLevel()
    this.resetState()
  }

  populateLevel() {
    const SOLID = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
      0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
      0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
      0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ]
    for (let i = 0; i < SOLID_COUNT; i++) {
      this.solid.push({ v: SOLID[i] })
    }

    const TILES = [
      1, 612, 108, 1, 648, 108, 1, 684, 108, 1, 720, 108,
      1, 936, 108, 1, 972, 108, 1, 1008, 108, 1, 1332, 108,
      1, 1368, 108, 1, 1404, 108, 1, 1584, 180, 1, 1620, 180,
      1, 1656, 180, 1, 180, 216, 1, 216, 216, 1, 252, 216,
      0, 288, 216, 1, 324, 216, 1, 360, 216, 1, 396, 216,
      1, 756, 216, 1, 792, 216, 1, 828, 216, 1, 1044, 216,
      1, 1080, 216, 1, 1116, 216, 1, 1152, 216, 1, 1188, 216,
      0, 1224, 216, 1, 1260, 216, 1, 1296, 216, 1, 1656, 252,
      1, 1692, 252, 1, 1728, 252, 1, 1764, 252, 0, 1800, 252,
      1, 1836, 252, 1, 1872, 252, 1, 468, 288, 1, 504, 288,
      1, 540, 288, 1, 828, 324, 1, 864, 324, 1, 900, 324,
      1, 936, 324, 1, 972, 324, 1, 1008, 324, 0, 1044, 324,
      1, 1332, 324, 1, 1368, 324, 1, 1404, 324, 1, 1656, 324,
      1, 1692, 324, 1, 1728, 324, 1, 1764, 324, 1, 1800, 324,
      1, 1836, 324, 1, 1872, 324, 1, 36, 360, 1, 72, 360,
      0, 108, 360, 1, 144, 360, 1, 2052, 360, 1, 2088, 360,
      1, 2124, 360, 1, 2160, 360, 2, 216, 396, 2, 1044, 396,
      2, 1836, 396, 1, 0, 432, 1, 36, 432, 1, 72, 432,
      1, 108, 432, 1, 144, 432, 1, 180, 432, 0, 216, 432,
      1, 252, 432, 1, 288, 432, 1, 324, 432, 1, 360, 432,
      1, 396, 432, 1, 432, 432, 1, 468, 432, 1, 504, 432,
      1, 540, 432, 1, 684, 432, 1, 720, 432, 1, 756, 432,
      1, 792, 432, 1, 828, 432, 1, 864, 432, 1, 900, 432,
      1, 936, 432, 1, 972, 432, 1, 1008, 432, 0, 1044, 432,
      1, 1080, 432, 1, 1116, 432, 1, 1260, 432, 1, 1296, 432,
      1, 1332, 432, 1, 1368, 432, 1, 1404, 432, 1, 1440, 432,
      1, 1476, 432, 1, 1512, 432, 1, 1548, 432, 1, 1584, 432,
      1, 1620, 432, 1, 1656, 432, 1, 1692, 432, 1, 1728, 432,
      1, 1764, 432, 1, 1800, 432, 0, 1836, 432, 1, 1872, 432,
      1, 1908, 432, 1, 1944, 432, 1, 1980, 432, 1, 2016, 432,
      1, 2052, 432, 1, 2088, 432, 1, 2124, 432, 1, 2160, 432,
      0, 0, 468, 0, 36, 468, 0, 72, 468, 0, 108, 468,
      0, 144, 468, 0, 180, 468, 0, 216, 468, 0, 252, 468,
      0, 288, 468, 0, 324, 468, 0, 360, 468, 0, 396, 468,
      0, 432, 468, 0, 468, 468, 0, 504, 468, 0, 540, 468,
      0, 684, 468, 0, 720, 468, 0, 756, 468, 0, 792, 468,
      0, 828, 468, 0, 864, 468, 0, 900, 468, 0, 936, 468,
      0, 972, 468, 0, 1008, 468, 0, 1044, 468, 0, 1080, 468,
      0, 1116, 468, 0, 1260, 468, 0, 1296, 468, 0, 1332, 468,
      0, 1368, 468, 0, 1404, 468, 0, 1440, 468, 0, 1476, 468,
      0, 1512, 468, 0, 1548, 468, 0, 1584, 468, 0, 1620, 468,
      0, 1656, 468, 0, 1692, 468, 0, 1728, 468, 0, 1764, 468,
      0, 1800, 468, 0, 1836, 468, 0, 1872, 468, 0, 1908, 468,
      0, 1944, 468, 0, 1980, 468, 0, 2016, 468, 0, 2052, 468,
      0, 2088, 468, 0, 2124, 468, 0, 2160, 468
    ]
    for (let i = 0; i < TILE_COUNT; i++) {
      const k = TILES[i * 3]
      const x = TILES[i * 3 + 1]
      const y = TILES[i * 3 + 2]
      if (k === 0) this.dirtTiles.push({ x, y })
      else if (k === 1) this.grassTiles.push({ x, y })
      else this.crateTiles.push({ x, y })
    }

    const COINS = [846, 90, 1134, 90, 1530, 90, 306, 198, 1242, 198, 1818, 234, 1062, 306, 126, 342]
    for (let i = 0; i < COIN_COUNT; i++) {
      this.coins.push({ x: COINS[i * 2], y: COINS[i * 2 + 1], collected: 0 })
    }

    const ENEMIES = [1372, 257, 6, 472, 365, -6]
    for (let i = 0; i < ENEMY_COUNT; i++) {
      this.enemies.push({ x: ENEMIES[i * 3], y: ENEMIES[i * 3 + 1], vx: ENEMIES[i * 3 + 2] / 100, alive: 1, dead: 0 })
    }
  }

  resetState() {
    this.playerX = PLAYER_START_X
    this.playerY = PLAYER_START_Y
    this.playerVx = 0
    this.playerVy = 0
    this.playerFacing = 1
    this.onGround = 0
    this.prevJumpDown = 0
    this.walkFrame = 0
    this.walkCycle = 0
    this.blink = 0
    this.hurtCooldownMs = 0
    this.coyoteMs = 0
    this.jumpBufferMs = 0
    this.cameraX = 0
    this.score = 0
    this.lives = 3
    this.won = 0
    this.updatePlayerRenderState()
  }

  restart() {
    for (let i = 0; i < this.coins.length; i++) {
      this.coins[i].collected = 0
    }
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].alive = 1
      this.enemies[i].dead = 0
    }
    this.resetState()
  }

  updatePlayerRenderState() {
    this.playerRenderLeft = Math.round(this.playerX - 4)
    this.playerRenderTop = Math.round(this.playerY - 2)
    this.playerRenderFrame = this.playerVx >= 0.04 || this.playerVx <= -0.04 ? 1 - this.walkCycle : 0
  }

  isSolidCell(col: number, row: number): number {
    if (row < 0) return 0
    if (row >= LEVEL_H) return 0
    if (col < 0) return 1
    if (col >= LEVEL_W) return 1
    return this.solid[row * LEVEL_W + col].v
  }

  isSolidPoint(x: number, y: number): number {
    const col = Math.floor(x / TILE)
    const row = Math.floor(y / TILE)
    return this.isSolidCell(col, row)
  }

  rectHitsWorld(x: number, y: number, w: number, h: number): number {
    if (this.isSolidPoint(x, y)) return 1
    if (this.isSolidPoint(x + w, y)) return 1
    if (this.isSolidPoint(x, y + h)) return 1
    if (this.isSolidPoint(x + w, y + h)) return 1
    return 0
  }

  movePlayerX(amount: number) {
    this.playerX = this.playerX + amount
    if (!this.rectHitsWorld(this.playerX, this.playerY, PLAYER_W, PLAYER_H)) return

    if (amount > 0) {
      const col = Math.floor((this.playerX + PLAYER_W) / TILE)
      this.playerX = col * TILE - PLAYER_W - 0.01
    } else if (amount < 0) {
      const col = Math.floor(this.playerX / TILE)
      this.playerX = (col + 1) * TILE + 0.01
    }
    this.playerVx = 0
  }

  movePlayerY(amount: number) {
    this.playerY = this.playerY + amount
    this.onGround = 0
    if (!this.rectHitsWorld(this.playerX, this.playerY, PLAYER_W, PLAYER_H)) return

    if (amount > 0) {
      const row = Math.floor((this.playerY + PLAYER_H) / TILE)
      this.playerY = row * TILE - PLAYER_H - 0.01
      this.onGround = 1
    } else if (amount < 0) {
      const row = Math.floor(this.playerY / TILE)
      this.playerY = (row + 1) * TILE + 0.01
    }
    this.playerVy = 0
  }

  resetPlayerAfterHit() {
    this.playerX = PLAYER_START_X
    this.playerY = PLAYER_START_Y
    this.playerVx = 0
    this.playerVy = 0
    this.onGround = 0
    this.coyoteMs = 0
    this.jumpBufferMs = 0
    this.hurtCooldownMs = HURT_COOLDOWN_MS
    this.updatePlayerRenderState()
  }

  loseLife() {
    this.lives = this.lives - 1
    if (this.lives <= 0) this.restart()
    else this.resetPlayerAfterHit()
  }

  updateEnemies(deltaMs: number) {
    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].alive) continue
      const nextX = this.enemies[i].x + this.enemies[i].vx * deltaMs
      const footY = this.enemies[i].y + 28
      const ahead = this.enemies[i].vx > 0 ? nextX + 28 : nextX
      const wall = this.enemies[i].vx > 0 ? nextX + 30 : nextX - 2
      if (this.isSolidPoint(wall, this.enemies[i].y + 14) || !this.isSolidPoint(ahead, footY + 4)) {
        this.enemies[i].vx = -this.enemies[i].vx
      } else {
        this.enemies[i].x = nextX
      }
    }
  }

  collectCoins() {
    for (let i = 0; i < this.coins.length; i++) {
      if (this.coins[i].collected) continue
      const cx = this.coins[i].x - 10
      const cy = this.coins[i].y - 10
      if (this.playerX < cx + 20 && this.playerX + PLAYER_W > cx && this.playerY < cy + 20 && this.playerY + PLAYER_H > cy) {
        this.coins[i].collected = 1
        this.score = this.score + 1
      }
    }
  }

  touchEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].alive) continue
      const ex = this.enemies[i].x + 3
      const ey = this.enemies[i].y + 4
      if (this.playerX >= ex + ENEMY_W) continue
      if (this.playerX + PLAYER_W <= ex) continue
      if (this.playerY >= ey + ENEMY_H) continue
      if (this.playerY + PLAYER_H <= ey) continue

      if (this.playerVy > 0 && this.playerY + PLAYER_H < this.enemies[i].y + 24) {
        this.enemies[i].alive = 0
        this.enemies[i].dead = 1
        this.playerVy = STOMP_BOUNCE
        this.score = this.score + 2
      } else if (this.hurtCooldownMs <= 0) {
        this.loseLife()
      }
    }
  }

  checkGoal() {
    const gx = this.goalX - 10
    if (this.playerX < gx + 28 && this.playerX + PLAYER_W > gx && this.playerY < this.goalY + 92 && this.playerY + PLAYER_H > this.goalY) {
      this.won = 1
    }
  }

  updateCamera() {
    const target = this.playerX - DISPLAY_W * 0.42
    const maxX = LEVEL_PIXEL_W - DISPLAY_W
    let next = target
    if (next < 0) next = 0
    if (next > maxX) next = maxX
    this.cameraX = next
  }

  buttonLeftDown() { this.pressLeft = 1 }
  buttonLeftUp() { this.pressLeft = 0 }
  buttonRightDown() { this.pressRight = 1 }
  buttonRightUp() { this.pressRight = 0 }
  buttonJumpDown() { this.pressJump = 1 }
  buttonJumpUp() { this.pressJump = 0 }
  buttonRestart() { this.restart() }

  tick(timestampMs: number) {
    let deltaMs = this.lastTimestampMs === 0 ? 0 : timestampMs - this.lastTimestampMs
    this.lastTimestampMs = timestampMs
    if (deltaMs > 42) deltaMs = 42
    if (deltaMs < 0) deltaMs = 0

    if (this.hurtCooldownMs > 0) this.hurtCooldownMs = this.hurtCooldownMs - deltaMs
    this.blink = this.hurtCooldownMs > 0 && Math.floor(this.hurtCooldownMs / 90) % 2 === 0 ? 1 : 0

    if (this.won) {
      this.updateCamera()
      return
    }

    const direction = this.pressRight - this.pressLeft
    if (direction !== 0) {
      this.playerVx = this.playerVx + direction * MOVE_ACCEL * deltaMs
      this.playerFacing = direction
    }

    const friction = this.onGround ? GROUND_FRICTION : AIR_FRICTION
    this.playerVx = this.playerVx * friction
    if (this.playerVx > MAX_SPEED) this.playerVx = MAX_SPEED
    if (this.playerVx < -MAX_SPEED) this.playerVx = -MAX_SPEED

    if (this.onGround) this.coyoteMs = COYOTE_MS
    else if (this.coyoteMs > 0) this.coyoteMs = this.coyoteMs - deltaMs
    if (this.coyoteMs < 0) this.coyoteMs = 0

    if (this.pressJump && !this.prevJumpDown) this.jumpBufferMs = JUMP_BUFFER_MS
    else if (this.jumpBufferMs > 0) this.jumpBufferMs = this.jumpBufferMs - deltaMs
    if (this.jumpBufferMs < 0) this.jumpBufferMs = 0
    this.prevJumpDown = this.pressJump

    if (this.jumpBufferMs > 0 && this.coyoteMs > 0) {
      this.playerVy = JUMP_VELOCITY
      if (direction > 0 && this.playerVx < JUMP_SIDE_BOOST) this.playerVx = JUMP_SIDE_BOOST
      if (direction < 0 && this.playerVx > -JUMP_SIDE_BOOST) this.playerVx = -JUMP_SIDE_BOOST
      this.onGround = 0
      this.coyoteMs = 0
      this.jumpBufferMs = 0
    }

    this.playerVy = this.playerVy + GRAVITY * deltaMs
    if (this.playerVy > MAX_FALL) this.playerVy = MAX_FALL

    this.movePlayerX(this.playerVx * deltaMs)
    this.movePlayerY(this.playerVy * deltaMs)

    if (this.playerY > VOID_Y) this.loseLife()

    const speed = this.playerVx >= 0 ? this.playerVx : -this.playerVx
    this.walkFrame = this.walkFrame + speed * deltaMs
    this.walkCycle = Math.floor(this.walkFrame / 36) % 2

    this.updateEnemies(deltaMs)
    this.collectCoins()
    this.touchEnemies()
    this.checkGoal()
    this.updateCamera()
    this.updatePlayerRenderState()
  }
}

export const game = new GameStore()
