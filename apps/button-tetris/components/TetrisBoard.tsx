import { BLOCK_SIZE, BOARD_HEIGHT, BOARD_WIDTH, BOARD_X, BOARD_Y, PLAYFIELD_BORDER_WIDTH } from '../constants'
import { tetris } from '../stores/TetrisStore'

export function TetrisBoard() {
  return (
    <div class="tetris-board-root">
      <div
        class="tetris-board-playfield"
        style={{
          left: BOARD_X - PLAYFIELD_BORDER_WIDTH,
          top: BOARD_Y - PLAYFIELD_BORDER_WIDTH,
          width: BOARD_WIDTH + PLAYFIELD_BORDER_WIDTH * 2,
          height: BOARD_HEIGHT + PLAYFIELD_BORDER_WIDTH * 2,
          borderWidth: PLAYFIELD_BORDER_WIDTH
        }}
      />
      <TetrisStack />
      <TetrisActiveColor />
      <TetrisActiveMonochrome />
    </div>
  )
}

function TetrisActiveColor() {
  return (
    <div class="tetris-active-color-layer">
      <div class="tetris-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block0Left, top: tetris.block0Top, width: BLOCK_SIZE, height: BLOCK_SIZE, backgroundColor: tetris.color }} />
      <div class="tetris-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block1Left, top: tetris.block1Top, width: BLOCK_SIZE, height: BLOCK_SIZE, backgroundColor: tetris.color }} />
      <div class="tetris-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block2Left, top: tetris.block2Top, width: BLOCK_SIZE, height: BLOCK_SIZE, backgroundColor: tetris.color }} />
      <div class="tetris-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block3Left, top: tetris.block3Top, width: BLOCK_SIZE, height: BLOCK_SIZE, backgroundColor: tetris.color }} />
    </div>
  )
}

function TetrisActiveMonochrome() {
  return (
    <div class="tetris-active-monochrome-layer">
      <div class="tetris-block tetris-active-monochrome-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block0Left, top: tetris.block0Top, width: BLOCK_SIZE, height: BLOCK_SIZE }} />
      <div class="tetris-block tetris-active-monochrome-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block1Left, top: tetris.block1Top, width: BLOCK_SIZE, height: BLOCK_SIZE }} />
      <div class="tetris-block tetris-active-monochrome-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block2Left, top: tetris.block2Top, width: BLOCK_SIZE, height: BLOCK_SIZE }} />
      <div class="tetris-block tetris-active-monochrome-block" style={{ left: tetris.gameOver === 1 ? -BLOCK_SIZE : tetris.block3Left, top: tetris.block3Top, width: BLOCK_SIZE, height: BLOCK_SIZE }} />
    </div>
  )
}

function TetrisStack() {
  return (
    <div class="tetris-stack-layer">
      <TetrisStackColor />
      <TetrisStackMonochrome />
    </div>
  )
}

function TetrisStackColor() {
  return (
    <div class="tetris-stack-color-layer">
      {tetris.cells.map(cell => (
        <div
          key={cell.id}
          class="tetris-stack-block"
          style={{
            left: cell.left,
            top: cell.top,
            width: cell.filled === 0 ? 0 : BLOCK_SIZE,
            height: cell.filled === 0 ? 0 : BLOCK_SIZE,
            backgroundColor: cell.color
          }}
        />
      ))}
    </div>
  )
}

function TetrisStackMonochrome() {
  return (
    <div class="tetris-stack-monochrome-layer">
      {tetris.cells.map(cell => (
        <div
          key={cell.id}
          class="tetris-stack-block tetris-stack-monochrome-block"
          style={{
            left: cell.left,
            top: cell.top,
            width: cell.filled === 0 ? 0 : BLOCK_SIZE,
            height: cell.filled === 0 ? 0 : BLOCK_SIZE
          }}
        />
      ))}
    </div>
  )
}
