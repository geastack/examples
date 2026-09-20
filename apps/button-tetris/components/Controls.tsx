import { tetris } from '../stores/TetrisStore'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOARD_X,
  BOARD_Y,
  BUTTON_WIDTH,
  DROP_HEIGHT,
  DROP_TOP,
  LEFT_COL_LEFT,
  RIGHT_COL_LEFT
} from '../constants'

export function Controls() {
  return (
    <div class="tetris-controls-root">
      <div
        class="tetris-control-column"
        style={{ left: LEFT_COL_LEFT, top: BOARD_Y, width: BUTTON_WIDTH, height: BOARD_HEIGHT }}
      >
        <LeftButton />
        <RotateButton />
      </div>
      <div
        class="tetris-control-column"
        style={{ left: RIGHT_COL_LEFT, top: BOARD_Y, width: BUTTON_WIDTH, height: BOARD_HEIGHT }}
      >
        <RightButton />
        <MusicButton />
      </div>
      <DropButton />
    </div>
  )
}

function LeftButton() {
  return (
    <div
      onClick={() => tetris.move(-1)}
      class="tetris-control-button"
      style={{ width: BUTTON_WIDTH }}
    >
      <span class="tetris-button-label">Left</span>
    </div>
  )
}

function RotateButton() {
  return (
    <div
      onClick={() => tetris.rotate()}
      class="tetris-control-button"
      style={{ width: BUTTON_WIDTH }}
    >
      <span class="tetris-button-label">Rot</span>
    </div>
  )
}

function RightButton() {
  return (
    <div
      onClick={() => tetris.move(1)}
      class="tetris-control-button"
      style={{ width: BUTTON_WIDTH }}
    >
      <span class="tetris-button-label">Right</span>
    </div>
  )
}

function MusicButton() {
  return (
    <div
      onClick={() => tetris.toggleMusic()}
      class="tetris-control-button"
      style={{ width: BUTTON_WIDTH }}
    >
      <span class="tetris-button-label">{tetris.musicEnabled ? 'Music On' : 'Music Off'}</span>
    </div>
  )
}

function DropButton() {
  return (
    <div
      onClick={() => tetris.drop()}
      class="tetris-drop-button"
      style={{ left: BOARD_X, top: DROP_TOP, width: BOARD_WIDTH, height: DROP_HEIGHT }}
    >
      <span class="tetris-button-label">Drop</span>
    </div>
  )
}
