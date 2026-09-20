import { GameAssets } from './assets'
import { InputState, getControlButtons } from './input'
import { DISPLAY_HEIGHT, DISPLAY_WIDTH, GAME_VIEW_HEIGHT, beginFrame, color, drawImage, drawImageTiledX, drawText, endFrame, fillCircle, fillRect, fillTriangle, setAlpha, strokeCircle, strokeRect } from './runtime'

const TILE = 36
const PLAYER_W = 29
const PLAYER_H = 34
const GRAVITY = 0.00142
const MOVE_ACCEL = 0.00162
const GROUND_FRICTION = 0.92
const AIR_FRICTION = 0.945
// GROUND/AIR_FRICTION are per-frame velocity multipliers tuned at the 60fps
// target (Display.setFrameRate(60)). Friction is applied as
// `vx *= friction ** (deltaMs / FRICTION_REFERENCE_MS)` so the decay-per-second
// is constant at any frame rate. Applying the bare multiplier once per frame
// made movement frame-rate-dependent: heavy/over-damped on 120Hz displays (iOS
// ProMotion) and jittery whenever frame timing was uneven, because accel and
// displacement scale with deltaMs while a flat 24% friction cut did not.
const FRICTION_REFERENCE_MS = 1000 / 60
const MAX_SPEED = 0.34
const JUMP_VELOCITY = -0.69
const COYOTE_MS = 120
const JUMP_BUFFER_MS = 160
const TERRAIN_GRASS = 1
const TERRAIN_DIRT = 2
const ARROW_LEFT = 1
const ARROW_RIGHT = 2
const ARROW_UP = 3

const RAW_LEVEL = [
  '                                                            ',
  '                                                            ',
  '                       o       o          o                 ',
  '                 ####     ###        ###                    ',
  '                                                            ',
  '        o                         o         ###             ',
  '     #######         ###     ########             o         ',
  '                                      e       #######       ',
  '             ###             o                         G    ',
  '   o                   #######       ###      #######       ',
  ' ####        e                                           ####',
  '      B                      B                     B         ',
  '################   #############   ##########################',
  '################   #############   ##########################'
]

class Coin {
  x = 0
  y = 0
  collected = false
}

class Enemy {
  x = 0
  y = 0
  vx = 0
  alive = true
}

class Goal {
  x = 0
  y = 0
}

class TerrainRun {
  kind = 0
  x = 0
  y = 0
  w = 0
}

class TilePoint {
  x = 0
  y = 0
}

export class GameState {
  assets = new GameAssets()
  input = new InputState()
  level: string[] = ['']
  levelWidth = 0
  levelHeight = 0
  solid: number[] = [0]
  terrainRuns: TerrainRun[] = [new TerrainRun()]
  crateTiles: TilePoint[] = [new TilePoint()]
  playerX = 74
  playerY = 342
  playerVx = 0
  playerVy = 0
  playerFacing = 1
  onGround = false
  jumpWasDown = false
  coins: Coin[] = [new Coin()]
  enemies: Enemy[] = [new Enemy()]
  goal = new Goal()
  score = 0
  lives = 3
  fpsText = 'FPS --'
  won = false
  cameraX = 0
  walkFrame = 0
  hurtCooldownMs = 0
  coyoteMs = 0
  jumpBufferMs = 0
  deltaMs = 0

  constructor() {
    this.restart()
  }

  restart() {
    this.level = normalizeLevel()
    this.playerX = 74
    this.playerY = 342
    this.playerVx = 0
    this.playerVy = 0
    this.playerFacing = 1
    this.onGround = false
    this.jumpWasDown = false
    this.coins = []
    this.enemies = []
    this.goal = createGoal((this.level[0].length - 3) * TILE, 8 * TILE)
    this.score = 0
    this.lives = 3
    this.won = false
    this.cameraX = 0
    this.walkFrame = 0
    this.hurtCooldownMs = 0
    this.coyoteMs = 0
    this.jumpBufferMs = 0
    this.scanLevel()
  }

  resetPlayer() {
    this.playerX = 74
    this.playerY = 342
    this.playerVx = 0
    this.playerVy = 0
    this.onGround = false
    this.coyoteMs = 0
    this.jumpBufferMs = 0
    this.hurtCooldownMs = 900
  }

  loseLife() {
    this.lives -= 1
    if (this.lives <= 0) this.restart()
    else this.resetPlayer()
  }

  scanLevel() {
    this.levelWidth = this.level.length > 0 ? this.level[0].length : 0
    this.levelHeight = this.level.length
    this.solid = []
    this.terrainRuns = []
    this.crateTiles = []

    for (let row = 0; row < this.level.length; row++) {
      let runKind = 0
      let runStart = 0
      for (let col = 0; col < this.levelWidth; col++) {
        const tile = this.level[row][col]
        const solid = isSolidTile(tile)
        this.solid.push(solid ? 1 : 0)

        if (tile === 'o') {
          this.coins.push(createCoin(col * TILE + TILE / 2, row * TILE + TILE / 2))
        } else if (tile === 'e') {
          this.enemies.push(createEnemy(col * TILE + 4, row * TILE + 5, col % 2 === 0 ? 0.06 : -0.06))
        } else if (tile === 'G') {
          this.goal = createGoal(col * TILE + 10, row * TILE - 28)
        }

        if (tile === 'B') {
          if (runKind) {
            this.terrainRuns.push(createTerrainRun(runKind, runStart * TILE, row * TILE, (col - runStart) * TILE))
            runKind = 0
          }
          this.crateTiles.push(createTilePoint(col * TILE, row * TILE))
          continue
        }

        const terrainKind = solid ? (row === 0 || this.level[row - 1][col] === ' ' ? TERRAIN_GRASS : TERRAIN_DIRT) : 0
        if (terrainKind === 0) {
          if (runKind) {
            this.terrainRuns.push(createTerrainRun(runKind, runStart * TILE, row * TILE, (col - runStart) * TILE))
            runKind = 0
          }
        } else if (terrainKind !== runKind) {
          if (runKind) this.terrainRuns.push(createTerrainRun(runKind, runStart * TILE, row * TILE, (col - runStart) * TILE))
          runKind = terrainKind
          runStart = col
        }
      }
      if (runKind) {
        this.terrainRuns.push(createTerrainRun(runKind, runStart * TILE, row * TILE, (this.levelWidth - runStart) * TILE))
      }
    }
  }

  solidAtCell(col: number, row: number) {
    if (row < 0) return false
    if (row >= this.levelHeight) return false
    if (col < 0 || col >= this.levelWidth) return true
    return this.solid[row * this.levelWidth + col] !== 0
  }

  isSolidAt(x: number, y: number) {
    return this.solidAtCell(Math.floor(x / TILE), Math.floor(y / TILE))
  }

  rectHitsWorld(x: number, y: number, w: number, h: number) {
    return this.isSolidAt(x, y) ||
      this.isSolidAt(x + w - 1, y) ||
      this.isSolidAt(x, y + h - 1) ||
      this.isSolidAt(x + w - 1, y + h - 1)
  }

  movePlayerX(amount: number) {
    this.playerX += amount
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
    this.playerY += amount
    this.onGround = false
    if (!this.rectHitsWorld(this.playerX, this.playerY, PLAYER_W, PLAYER_H)) return

    if (amount > 0) {
      const row = Math.floor((this.playerY + PLAYER_H) / TILE)
      this.playerY = row * TILE - PLAYER_H - 0.01
      this.onGround = true
    } else if (amount < 0) {
      const row = Math.floor(this.playerY / TILE)
      this.playerY = (row + 1) * TILE + 0.01
    }
    this.playerVy = 0
  }

  updateEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const nextX = enemy.x + enemy.vx * this.deltaMs
      const footY = enemy.y + 28
      const probeX = enemy.vx > 0 ? nextX + 28 : nextX
      const wallX = enemy.vx > 0 ? nextX + 30 : nextX - 2
      if (this.isSolidAt(wallX, enemy.y + 14) || !this.isSolidAt(probeX, footY + 4)) {
        enemy.vx = -enemy.vx
      } else {
        enemy.x = nextX
      }
    }
  }

  collectCoins() {
    for (const coin of this.coins) {
      if (coin.collected) continue
      if (intersects(this.playerX, this.playerY, PLAYER_W, PLAYER_H, coin.x - 10, coin.y - 10, 20, 20)) {
        coin.collected = true
        this.score += 1
      }
    }
  }

  touchEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      if (!intersects(this.playerX, this.playerY, PLAYER_W, PLAYER_H, enemy.x + 3, enemy.y + 4, 26, 25)) continue

      if (this.playerVy > 0 && this.playerY + PLAYER_H < enemy.y + 24) {
        enemy.alive = false
        this.playerVy = JUMP_VELOCITY * 0.72
        this.score += 2
      } else if (this.hurtCooldownMs <= 0) {
        this.loseLife()
      }
    }
  }

  updateCamera() {
    const worldW = this.levelWidth * TILE
    const target = this.playerX - DISPLAY_WIDTH * 0.42
    this.cameraX = Math.max(0, Math.min(worldW - DISPLAY_WIDTH, target))
  }

  checkGoal() {
    if (intersects(this.playerX, this.playerY, PLAYER_W, PLAYER_H, this.goal.x - 10, this.goal.y, 28, 92)) {
      this.won = true
    }
  }

  tick() {
    const input = this.input
    const deltaMs = this.deltaMs
    if (input.restart) {
      this.restart()
      input.restart = false
      return
    }

    if (this.hurtCooldownMs > 0) this.hurtCooldownMs -= deltaMs
    if (this.won) {
      this.updateCamera()
      return
    }

    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    if (direction !== 0) {
      this.playerVx += direction * MOVE_ACCEL * deltaMs
      this.playerFacing = direction
    }

    const friction = this.onGround ? GROUND_FRICTION : AIR_FRICTION
    this.playerVx *= Math.pow(friction, deltaMs / FRICTION_REFERENCE_MS)
    this.playerVx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, this.playerVx))

    if (this.onGround) this.coyoteMs = COYOTE_MS
    else this.coyoteMs = Math.max(0, this.coyoteMs - deltaMs)

    if (input.jump && !this.jumpWasDown) this.jumpBufferMs = JUMP_BUFFER_MS
    else if (this.jumpBufferMs > 0) this.jumpBufferMs = Math.max(0, this.jumpBufferMs - deltaMs)
    this.jumpWasDown = input.jump

    if (this.jumpBufferMs > 0 && this.coyoteMs > 0) {
      this.playerVy = JUMP_VELOCITY
      this.onGround = false
      this.coyoteMs = 0
      this.jumpBufferMs = 0
    }

    this.playerVy += GRAVITY * deltaMs
    if (this.playerVy > 0.72) this.playerVy = 0.72

    this.movePlayerX(this.playerVx * deltaMs)
    this.movePlayerY(this.playerVy * deltaMs)

    // Keep onGround stable while resting. Gravity micro-sinks the player a
    // fraction of a pixel each frame, and movePlayerY only flags onGround on the
    // frames its penetrate-and-snap actually fires, so onGround flickered
    // true/false every frame. That flipped friction between GROUND_FRICTION and
    // AIR_FRICTION every frame, sawtoothing playerVx into visibly jittery
    // (uneven 2/3px) motion. A short downward ground probe holds onGround steady
    // while standing; it is skipped while rising (playerVy < 0) so a jump still
    // gets air friction immediately and keeps its horizontal momentum.
    if (!this.onGround && this.playerVy >= 0 && this.rectHitsWorld(this.playerX, this.playerY + PLAYER_H, PLAYER_W, 2)) {
      this.onGround = true
    }

    const voidY = this.levelHeight * TILE + 6
    if (this.playerY > voidY) this.loseLife()

    this.walkFrame += Math.abs(this.playerVx) * deltaMs
    this.updateEnemies()
    this.collectCoins()
    this.touchEnemies()
    this.checkGoal()
    this.updateCamera()
  }

  viewportX(worldX: number) {
    return Math.round(worldX - this.cameraX)
  }

  drawLevel() {
    for (let i = 0; i < this.terrainRuns.length; i++) {
      const run = this.terrainRuns[i]
      const x = this.viewportX(run.x)
      if (x + run.w < 0 || x > DISPLAY_WIDTH) continue
      drawTerrainRun(this.assets, run.kind, x, run.y, run.w)
    }

    for (let i = 0; i < this.crateTiles.length; i++) {
      const tile = this.crateTiles[i]
      const x = this.viewportX(tile.x)
      if (x + TILE < 0 || x > DISPLAY_WIDTH) continue
      drawCrateTile(this.assets, x, tile.y)
    }
  }

  drawCoins() {
    const gold = color(248, 196, 77)
    const rim = color(133, 92, 31)
    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i]
      if (coin.collected) continue
      const x = this.viewportX(coin.x)
      if (x < -16 || x > DISPLAY_WIDTH + 16) continue
      const pulse = Math.floor(this.walkFrame / 28) % 2
      fillCircle(x, coin.y, pulse ? 8 : 7, gold)
      strokeCircle(x, coin.y, pulse ? 8 : 7, rim)
    }
  }

  drawEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i]
      if (!enemy.alive) continue
      const x = this.viewportX(enemy.x)
      if (x < -40 || x > DISPLAY_WIDTH + 40) continue
      drawImage(this.assets.drone, x, Math.round(enemy.y))
    }
  }

  drawGoal() {
    const x = this.viewportX(this.goal.x)
    const pole = color(245, 245, 245)
    const flag = color(248, 196, 77)
    const shadow = color(133, 92, 31)
    fillRect(x, this.goal.y, 5, 94, pole)
    fillTriangle(x + 5, this.goal.y + 6, x + 56, this.goal.y + 24, x + 5, this.goal.y + 44, flag)
    strokeRect(x + 5, this.goal.y + 11, 34, 23, shadow)
  }

  drawPlayer() {
    const blinking = this.hurtCooldownMs > 0 && Math.floor(this.hurtCooldownMs / 90) % 2 === 0
    if (blinking) return
    const id = Math.abs(this.playerVx) > 0.04 && Math.floor(this.walkFrame / 36) % 2 === 0 ? this.assets.heroWalk : this.assets.heroIdle
    drawImage(id, this.viewportX(this.playerX - 4), Math.round(this.playerY - 2))
  }

  drawHud() {
    const shade = color(22, 38, 57)
    const white = color(255, 255, 255)
    const gold = color(248, 196, 77)
    fillRect(0, 0, DISPLAY_WIDTH, 36, shade)
    drawText('Sky Hop', 12, 9, white, 1)
    drawText('Coins ' + this.score + '/' + this.coins.length, 116, 9, gold, 1)
    drawText('Lives ' + this.lives, 272, 9, white, 1)
    drawText(this.fpsText, DISPLAY_WIDTH - 64, 9, white, 1)
    if (this.won) {
      const panelW = 316
      const panelX = Math.floor((DISPLAY_WIDTH - panelW) / 2)
      fillRect(panelX, 168, panelW, 116, color(22, 38, 57))
      strokeRect(panelX, 168, panelW, 116, gold)
      drawText('Course Clear', panelX + 41, 190, white, 2)
      drawText('Coins ' + this.score + '/' + this.coins.length, panelX + 85, 236, gold, 1)
    }
  }

  drawControls() {
    drawControls(this.input)
  }

  render() {
    beginFrame()
    drawBackground()
    this.drawCoins()
    this.drawGoal()
    this.drawLevel()
    this.drawEnemies()
    this.drawPlayer()
    this.drawHud()
    this.drawControls()
    endFrame()
  }
}

function createCoin(x: number, y: number) {
  const coin = new Coin()
  coin.x = x
  coin.y = y
  return coin
}

function createEnemy(x: number, y: number, vx: number) {
  const enemy = new Enemy()
  enemy.x = x
  enemy.y = y
  enemy.vx = vx
  return enemy
}

function createGoal(x: number, y: number) {
  const goal = new Goal()
  goal.x = x
  goal.y = y
  return goal
}

function createTerrainRun(kind: number, x: number, y: number, w: number) {
  const run = new TerrainRun()
  run.kind = kind
  run.x = x
  run.y = y
  run.w = w
  return run
}

function createTilePoint(x: number, y: number) {
  const point = new TilePoint()
  point.x = x
  point.y = y
  return point
}

function normalizeLevel() {
  const width = RAW_LEVEL.reduce((max, row) => Math.max(max, row.length), 0)
  return RAW_LEVEL.map(row => row.padEnd(width, ' '))
}

export function createGame(): GameState {
  return new GameState()
}

function isSolidTile(tile: string) {
  return tile === '#' || tile === 'B'
}

function intersects(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function drawBackground() {
  const sky = color(47, 150, 209)
  const farHill = color(98, 202, 128)
  const nearHill = color(65, 171, 108)
  const water = color(42, 153, 210)
  const controlsBg = color(18, 31, 47)

  fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT, sky)
  fillTriangle(-58, 188, 128, 24, 336, 188, nearHill)
  fillTriangle(156, 188, 330, 46, DISPLAY_WIDTH + 82, 188, farHill)
  fillRect(0, 182, DISPLAY_WIDTH, Math.max(0, GAME_VIEW_HEIGHT - 182), water)
  if (GAME_VIEW_HEIGHT < DISPLAY_HEIGHT) {
    fillRect(0, GAME_VIEW_HEIGHT, DISPLAY_WIDTH, DISPLAY_HEIGHT - GAME_VIEW_HEIGHT, controlsBg)
    fillRect(0, GAME_VIEW_HEIGHT, DISPLAY_WIDTH, 2, color(226, 247, 255))
  }
}

function drawTerrainRun(assets: GameAssets, kind: number, x: number, y: number, w: number) {
  if (kind === TERRAIN_GRASS) {
    drawImageTiledX(assets.grassTop, x, y, w)
  } else {
    drawImageTiledX(assets.dirt, x, y, w)
  }
}

function drawCrateTile(assets: GameAssets, x: number, y: number) {
  drawImage(assets.crate, x, y)
}

function drawArrowButton(x: number, y: number, w: number, h: number, direction: number, active: boolean) {
  const bg = active ? color(248, 196, 77) : color(22, 38, 57)
  const border = active ? color(255, 255, 255) : color(226, 247, 255)
  const icon = active ? color(22, 38, 57) : color(255, 255, 255)
  setAlpha(218)
  fillRect(x, y, w, h, bg)
  setAlpha(255)
  strokeRect(x, y, w, h, border)

  const cx = x + Math.floor(w / 2)
  const cy = y + Math.floor(h / 2)
  if (direction === ARROW_LEFT) {
    fillTriangle(cx - 17, cy, cx + 12, cy - 18, cx + 12, cy + 18, icon)
  } else if (direction === ARROW_RIGHT) {
    fillTriangle(cx + 17, cy, cx - 12, cy - 18, cx - 12, cy + 18, icon)
  } else {
    fillTriangle(cx, cy - 20, cx - 22, cy + 14, cx + 22, cy + 14, icon)
  }
}

function drawControls(input: InputState) {
  const controls = getControlButtons()
  const restart = controls.find(control => control.id === 'restart')
  for (const control of controls) {
    if (control.id === 'left') drawArrowButton(control.x, control.y, control.w, control.h, ARROW_LEFT, input.left)
    if (control.id === 'right') drawArrowButton(control.x, control.y, control.w, control.h, ARROW_RIGHT, input.right)
    if (control.id === 'jump') drawArrowButton(control.x, control.y, control.w, control.h, ARROW_UP, input.jump)
  }
  if (restart) {
    const bg = input.restart ? color(248, 196, 77) : color(22, 38, 57)
    const fg = input.restart ? color(22, 38, 57) : color(255, 255, 255)
    setAlpha(218)
    fillRect(restart.x, restart.y, restart.w, restart.h, bg)
    setAlpha(255)
    strokeRect(restart.x, restart.y, restart.w, restart.h, color(226, 247, 255))
    drawText('RESET', restart.x + 12, restart.y + 8, fg, 1)
  }
}

export function tickGame(game: GameState, input: InputState, deltaMs: number) {
  game.input = input
  game.deltaMs = deltaMs
  game.tick()
}

export function renderGame(game: GameState, assets: GameAssets, input: InputState) {
  game.assets = assets
  game.input = input
  game.render()
}
