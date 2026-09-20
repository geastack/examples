import { Store, audioContext } from '@geastack/core'
import { BOARD_COLS, BOARD_ROWS, BOARD_X, BOARD_Y, CELL_HEIGHT, CELL_WIDTH, STACK_MAX } from '../constants'

const GRAVITY_INTERVAL_MS = 420
const MAX_GRAVITY_DELTA_MS = 1000

let gravityElapsedMs = 0
let lastGravityTickMs = 0

export class TetrisStore extends Store {
  stack = [{ x: 0, y: 0, left: 0, top: 0, color: '#0EA5E9', piece: 0 }]
  cells = [{ id: 0, left: 0, top: 0, color: '#0F172A', piece: -1, filled: 0 }]
  px = 4
  py = 0
  rot = 0
  ax0 = 0
  ay0 = 0
  ax1 = 0
  ay1 = 0
  ax2 = 0
  ay2 = 0
  ax3 = 0
  ay3 = 0
  block0Left = 0
  block0Top = 0
  block1Left = 0
  block1Top = 0
  block2Left = 0
  block2Top = 0
  block3Left = 0
  block3Top = 0
  piece = 0
  nextPiece = 0
  bag0 = 0
  bag1 = 1
  bag2 = 2
  bag3 = 3
  bag4 = 4
  bag5 = 5
  bag6 = 6
  bagIndex = 7
  color = '#0EA5E9'
  score = 0
  frame = 0
  gameOver = 0
  musicIndex = 0
  musicNextAt = 0
  musicEnabled = 1

  sound(frequency: number, durationMs: number) {
    const oscillator = audioContext.createOscillator()
    oscillator.type = 'square'
    oscillator.frequency.value = frequency
    oscillator.connect(audioContext.destination)
    const now = audioContext.currentTime
    oscillator.start(now)
    oscillator.stop(now + durationMs * 0.001)
  }

  musicSound(frequency: number, durationMs: number, startTime: number) {
    const oscillator = audioContext.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    oscillator.connect(audioContext.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + durationMs * 0.001)
  }

  init() {
    this.stack.length = STACK_MAX
    this.stack.length = 0
    if (this.cells.length != STACK_MAX) {
      this.cells.length = 0
      for (let y = 0; y < BOARD_ROWS; y++) {
        for (let x = 0; x < BOARD_COLS; x++) {
          this.cells.push({
            id: y * BOARD_COLS + x,
            left: BOARD_X + x * CELL_WIDTH,
            top: BOARD_Y + y * CELL_HEIGHT,
            color: '#0F172A',
            piece: -1,
            filled: 0
          })
        }
      }
    } else {
      for (let i = 0; i < this.cells.length; i++) {
        const cell = this.cells[i]
        cell.color = '#0F172A'
        cell.piece = -1
        cell.filled = 0
      }
    }
    this.score = 0
    this.frame = 0
    gravityElapsedMs = 0
    lastGravityTickMs = 0
    this.rot = 0
    this.bagIndex = 7
    this.nextPiece = this.drawPiece()
    this.gameOver = 0
    this.musicIndex = 0
    this.musicNextAt = 0
    this.spawn()
  }

  restart() {
    this.init()
    this.sound(392, 70)
  }

  toggleMusic() {
    if (this.musicEnabled) {
      this.musicEnabled = 0
    } else {
      this.musicEnabled = 1
      this.musicIndex = 0
      this.musicNextAt = 0
      this.sound(523, 45)
    }
  }

  bagAt(index: number): number {
    if (index == 0) return this.bag0
    if (index == 1) return this.bag1
    if (index == 2) return this.bag2
    if (index == 3) return this.bag3
    if (index == 4) return this.bag4
    if (index == 5) return this.bag5
    return this.bag6
  }

  setBagAt(index: number, piece: number) {
    if (index == 0) this.bag0 = piece
    else if (index == 1) this.bag1 = piece
    else if (index == 2) this.bag2 = piece
    else if (index == 3) this.bag3 = piece
    else if (index == 4) this.bag4 = piece
    else if (index == 5) this.bag5 = piece
    else this.bag6 = piece
  }

  wrapIndex(value: number, max: number): number {
    let next = value
    while (next > max) next = next - (max + 1)
    while (next < 0) next = next + (max + 1)
    return next
  }

  shuffleBag() {
    this.bag0 = 0
    this.bag1 = 1
    this.bag2 = 2
    this.bag3 = 3
    this.bag4 = 4
    this.bag5 = 5
    this.bag6 = 6
    for (let i = 6; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const piece = this.bagAt(i)
      this.setBagAt(i, this.bagAt(j))
      this.setBagAt(j, piece)
    }
    this.bagIndex = 0
  }

  drawPiece(): number {
    if (this.bagIndex < 0 || this.bagIndex > 6) this.shuffleBag()
    const piece = this.bagAt(this.bagIndex)
    this.bagIndex = this.bagIndex + 1
    return piece
  }

  updateShape() {
    const shapes = [
      [-1, 0, 0, 0, 1, 0, 2, 0],
      [0, -1, 0, 0, 0, 1, 0, 2],
      [-1, 0, 0, 0, 1, 0, 2, 0],
      [0, -1, 0, 0, 0, 1, 0, 2],
      [0, 0, 1, 0, 0, 1, 1, 1],
      [0, 0, 1, 0, 0, 1, 1, 1],
      [0, 0, 1, 0, 0, 1, 1, 1],
      [0, 0, 1, 0, 0, 1, 1, 1],
      [0, 0, 1, 0, -1, 0, 0, 1],
      [0, 0, 0, -1, 0, 1, 1, 0],
      [0, 0, 1, 0, -1, 0, 0, -1],
      [0, 0, 0, -1, 0, 1, -1, 0],
      [0, 0, 1, 0, 0, 1, -1, 1],
      [0, 0, 0, -1, 1, 0, 1, 1],
      [0, 0, 1, 0, 0, 1, -1, 1],
      [0, 0, 0, -1, 1, 0, 1, 1],
      [0, 0, -1, 0, 0, 1, 1, 1],
      [0, 0, 0, 1, 1, 0, 1, -1],
      [0, 0, -1, 0, 0, 1, 1, 1],
      [0, 0, 0, 1, 1, 0, 1, -1],
      [0, 0, -1, 0, 1, 0, -1, 1],
      [0, 0, 0, -1, 0, 1, 1, 1],
      [0, 0, -1, 0, 1, 0, 1, -1],
      [0, 0, 0, -1, 0, 1, -1, -1],
      [0, 0, -1, 0, 1, 0, 1, 1],
      [0, 0, 0, -1, 0, 1, 1, -1],
      [0, 0, -1, 0, 1, 0, -1, -1],
      [0, 0, 0, -1, 0, 1, -1, 1]
    ]
    let shape = this.piece * 4 + this.rot
    if (shape < 0 || shape > 27) shape = 0
    this.ax0 = shapes[shape][0]
    this.ay0 = shapes[shape][1]
    this.ax1 = shapes[shape][2]
    this.ay1 = shapes[shape][3]
    this.ax2 = shapes[shape][4]
    this.ay2 = shapes[shape][5]
    this.ax3 = shapes[shape][6]
    this.ay3 = shapes[shape][7]
    this.syncActiveBlocks()
  }

  syncActiveBlocks() {
    this.block0Left = BOARD_X + (this.px + this.ax0) * CELL_WIDTH
    this.block0Top = BOARD_Y + (this.py + this.ay0) * CELL_HEIGHT
    this.block1Left = BOARD_X + (this.px + this.ax1) * CELL_WIDTH
    this.block1Top = BOARD_Y + (this.py + this.ay1) * CELL_HEIGHT
    this.block2Left = BOARD_X + (this.px + this.ax2) * CELL_WIDTH
    this.block2Top = BOARD_Y + (this.py + this.ay2) * CELL_HEIGHT
    this.block3Left = BOARD_X + (this.px + this.ax3) * CELL_WIDTH
    this.block3Top = BOARD_Y + (this.py + this.ay3) * CELL_HEIGHT
  }

  spawn() {
    this.px = 4
    this.py = 1
    this.rot = 0
    this.piece = this.nextPiece
    this.nextPiece = this.drawPiece()
    this.color = this.colorForPiece(this.piece)
    this.updateShape()
    if (!this.canMove(0, 0)) {
      this.gameOver = 1
      this.sound(110, 220)
    }
  }

  colorForPiece(piece: number): string {
    if (piece == 0) return '#22D3EE'
    if (piece == 1) return '#FACC15'
    if (piece == 2) return '#A855F7'
    if (piece == 3) return '#22C55E'
    if (piece == 4) return '#EF4444'
    if (piece == 5) return '#3B82F6'
    return '#F97316'
  }

  canMove(dx: number, dy: number): number {
    const x0 = this.px + this.ax0 + dx
    const y0 = this.py + this.ay0 + dy
    const x1 = this.px + this.ax1 + dx
    const y1 = this.py + this.ay1 + dy
    const x2 = this.px + this.ax2 + dx
    const y2 = this.py + this.ay2 + dy
    const x3 = this.px + this.ax3 + dx
    const y3 = this.py + this.ay3 + dy
    if (x0 < 0 || x0 > 9 || x1 < 0 || x1 > 9 || x2 < 0 || x2 > 9 || x3 < 0 || x3 > 9) return 0
    if (y0 < 0 || y1 < 0 || y2 < 0 || y3 < 0 || y0 > 17 || y1 > 17 || y2 > 17 || y3 > 17) return 0
    for (let i = 0; i < this.stack.length; i++) {
      if (
        (this.stack[i].x == x0 && this.stack[i].y == y0) ||
        (this.stack[i].x == x1 && this.stack[i].y == y1) ||
        (this.stack[i].x == x2 && this.stack[i].y == y2) ||
        (this.stack[i].x == x3 && this.stack[i].y == y3)
      )
        return 0
    }
    return 1
  }

  lockOne(x: number, y: number) {
    if (this.stack.length >= STACK_MAX) {
      this.gameOver = 1
      this.sound(110, 220)
      return
    }
    this.stack.push({
      x,
      y,
      left: BOARD_X + x * CELL_WIDTH,
      top: BOARD_Y + y * CELL_HEIGHT,
      color: this.color,
      piece: this.piece
    })
    const index = y * BOARD_COLS + x
    const cell = this.cells[index]
    cell.color = this.color
    cell.piece = this.piece
    cell.filled = 1
  }

  syncCells() {
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i]
      cell.color = '#0F172A'
      cell.piece = -1
      cell.filled = 0
    }
    for (let i = 0; i < this.stack.length; i++) {
      const block = this.stack[i]
      const index = block.y * BOARD_COLS + block.x
      const cell = this.cells[index]
      cell.color = block.color
      cell.piece = block.piece
      cell.filled = 1
    }
  }

  clearRows() {
    let cleared = 0
    for (let y = 17; y >= 0; y--) {
      let mask = 0
      for (let i = 0; i < this.stack.length; i++) {
        if (this.stack[i].y == y) {
          mask = mask | (1 << this.stack[i].x)
        }
      }

      if (mask == 1023) {
        let write = 0
        for (let read = 0; read < this.stack.length; read++) {
          if (this.stack[read].y != y) {
            this.stack[write].x = this.stack[read].x
            this.stack[write].y = this.stack[read].y
            this.stack[write].left = this.stack[read].left
            this.stack[write].top = this.stack[read].top
            this.stack[write].color = this.stack[read].color
            write = write + 1
          }
        }

        this.stack.length = write
        for (let i = 0; i < this.stack.length; i++) {
          if (this.stack[i].y < y) {
            this.stack[i].y = this.stack[i].y + 1
            this.stack[i].top = BOARD_Y + this.stack[i].y * CELL_HEIGHT
          }
        }

        cleared = cleared + 1
        y = y + 1
      }
    }

    if (cleared > 0) {
      this.syncCells()
      if (cleared == 1) this.score = this.score + 100
      else if (cleared == 2) this.score = this.score + 300
      else if (cleared == 3) this.score = this.score + 500
      else this.score = this.score + 800
      if (cleared == 1) this.sound(660, 80)
      else if (cleared == 2) this.sound(760, 90)
      else if (cleared == 3) this.sound(860, 100)
      else this.sound(980, 130)
    }
    return cleared
  }

  lockPiece() {
    if (this.gameOver) return
    if (this.stack.length > STACK_MAX - 4) {
      this.gameOver = 1
      this.sound(110, 220)
      return
    }
    this.lockOne(this.px + this.ax0, this.py + this.ay0)
    this.lockOne(this.px + this.ax1, this.py + this.ay1)
    this.lockOne(this.px + this.ax2, this.py + this.ay2)
    this.lockOne(this.px + this.ax3, this.py + this.ay3)
    if (this.gameOver) return
    this.score = this.score + 4
    const cleared = this.clearRows()
    if (cleared == 0) this.sound(210, 35)
    this.spawn()
  }

  move(dx: number) {
    if (this.gameOver) return
    if (this.canMove(dx, 0)) {
      this.px = this.px + dx
      this.syncActiveBlocks()
      this.sound(280, 24)
    }
  }

  rotate() {
    if (this.gameOver) return
    const old = this.rot
    this.rot = (this.rot + 1) % 4
    this.updateShape()
    if (!this.canMove(0, 0)) {
      this.rot = old
      this.updateShape()
    } else {
      this.sound(440, 34)
    }
  }

  stepDown() {
    if (this.gameOver) return
    if (this.canMove(0, 1)) {
      this.py = this.py + 1
      this.syncActiveBlocks()
    } else this.lockPiece()
  }

  drop() {
    if (this.gameOver) return
    for (let i = 0; i < 18; i++) {
      if (this.canMove(0, 1)) this.py = this.py + 1
    }
    this.frame = 0
    gravityElapsedMs = 0
    this.sound(180, 45)
    this.lockPiece()
  }

  playMusic(_timestampMs: number) {
    if (!this.musicEnabled) return
    // The rAF callback timestamp is frozen on the gea runtime, so schedule notes
    // off the audio clock (audioContext.currentTime, a real steady clock) instead.
    // Notes are scheduled ahead of when they're due (not fired exactly on time)
    // so a render-thread hitch (line clear, board redraw) delays only how far
    // ahead we schedule, never the note's actual start — that keeps playback
    // gapless instead of leaving a silence gap each time the game stutters.
    const nowMs = audioContext.currentTime * 1000
    if (this.musicNextAt <= 0 || nowMs - this.musicNextAt > 2000) this.musicNextAt = nowMs

    const notes = [
      659, 494, 523, 587, 523, 494, 440, 440, 523, 659, 587, 523, 494, 523, 587, 659, 523, 440, 440, 587, 698, 880, 784,
      698, 659, 523, 659, 587, 523, 494, 523, 587, 659, 523, 440, 440, 659, 494, 523, 587, 523, 494, 440, 440, 523, 659,
      587, 523, 494, 523, 587, 659, 523, 440, 440, 587, 698, 880, 784, 698, 659, 523, 659, 587, 523, 494, 523, 587, 659,
      523, 440, 440, 659, 523, 587, 494, 523, 440, 415, 659, 523, 587, 494, 523, 659, 880, 880, 831, 659, 494, 523, 587,
      523, 494, 440, 440, 523, 659, 587, 523, 494, 523, 587, 659, 523, 440, 440, 587, 698, 880, 784, 698, 659, 523, 659,
      587, 523, 494, 523, 587, 659, 523, 440, 440
    ]
    const beats = [
      2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 2, 2, 4, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 1, 2, 2, 2, 6, 2, 1,
      1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 2, 2, 4, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 1, 2, 2, 2, 6, 4, 4, 4, 4,
      4, 4, 8, 4, 4, 4, 4, 4, 4, 4, 4, 8, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 2, 2, 4, 3, 1, 2, 1, 1, 3, 1,
      2, 1, 1, 2, 1, 1, 2, 2, 2, 6
    ]
    const stepMs = 190
    const scheduleAheadMs = 150

    while (this.musicNextAt < nowMs + scheduleAheadMs) {
      if (this.musicIndex < 0 || this.musicIndex > 123) this.musicIndex = 0
      const note = notes[this.musicIndex]
      const beatCount = beats[this.musicIndex]
      const durationMs = stepMs * beatCount
      if (note > 0) this.musicSound(note, durationMs, this.musicNextAt * 0.001)

      this.musicNextAt = this.musicNextAt + stepMs * beatCount
      this.musicIndex = this.musicIndex + 1
      if (this.musicIndex > 123) {
        this.musicIndex = 0
        this.musicNextAt = this.musicNextAt + stepMs * 4
      }
    }
  }

  tick(timestampMs: number) {
    if (this.gameOver) return
    this.playMusic(timestampMs)

    if (lastGravityTickMs <= 0 || timestampMs < lastGravityTickMs) {
      lastGravityTickMs = timestampMs
      return
    }

    let elapsed = timestampMs - lastGravityTickMs
    lastGravityTickMs = timestampMs
    if (elapsed > MAX_GRAVITY_DELTA_MS) elapsed = MAX_GRAVITY_DELTA_MS
    gravityElapsedMs = gravityElapsedMs + elapsed

    while (gravityElapsedMs >= GRAVITY_INTERVAL_MS && !this.gameOver) {
      gravityElapsedMs = gravityElapsedMs - GRAVITY_INTERVAL_MS
      this.stepDown()
    }
  }
}

export const tetris = new TetrisStore()
export const game = tetris
