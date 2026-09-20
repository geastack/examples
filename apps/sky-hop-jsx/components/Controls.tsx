import {
  COLOR_BUTTON,
  COLOR_BUTTON_ACTIVE,
  COLOR_BUTTON_BORDER,
  COLOR_BUTTON_TEXT,
  COLOR_BUTTON_TEXT_ACTIVE,
  COLOR_HUD_BG,
  DISPLAY_H,
  DISPLAY_W,
  GAME_VIEW_H,
  TALL_CONTROLS_LAYOUT
} from '../constants'
import { game } from '../stores/GameStore'

const BUTTON_H = 66
const BUTTON_Y = TALL_CONTROLS_LAYOUT ? GAME_VIEW_H + 12 : DISPLAY_H - BUTTON_H - 12
const MOVE_W = 66
const JUMP_W = 112
const GAP = 8
const MARGIN = 10
const RESET_W = 76
const RESET_H = 30

export function Controls() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: DISPLAY_W, height: DISPLAY_H }}>
      <div style={{ position: 'absolute', left: 0, top: GAME_VIEW_H, width: DISPLAY_W, height: DISPLAY_H - GAME_VIEW_H, backgroundColor: COLOR_HUD_BG, display: TALL_CONTROLS_LAYOUT ? 'block' : 'none' }} />
      <div style={{ position: 'absolute', left: 0, top: GAME_VIEW_H, width: DISPLAY_W, height: 2, backgroundColor: COLOR_BUTTON_BORDER, display: TALL_CONTROLS_LAYOUT ? 'block' : 'none' }} />

      <button
        onTouchStart={() => game.buttonLeftDown()}
        onTouchEnd={() => game.buttonLeftUp()}
        style={{
          position: 'absolute',
          left: MARGIN,
          top: BUTTON_Y,
          width: MOVE_W,
          height: BUTTON_H,
          backgroundColor: game.pressLeft ? COLOR_BUTTON_ACTIVE : COLOR_BUTTON,
          borderWidth: 2,
          borderColor: COLOR_BUTTON_BORDER,
          opacity: 0.85,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span
          style={{ fontSize: 36, color: game.pressLeft ? COLOR_BUTTON_TEXT_ACTIVE : COLOR_BUTTON_TEXT }}
        >
          L
        </span>
      </button>

      <button
        onTouchStart={() => game.buttonRightDown()}
        onTouchEnd={() => game.buttonRightUp()}
        style={{
          position: 'absolute',
          left: MARGIN + MOVE_W + GAP,
          top: BUTTON_Y,
          width: MOVE_W,
          height: BUTTON_H,
          backgroundColor: game.pressRight ? COLOR_BUTTON_ACTIVE : COLOR_BUTTON,
          borderWidth: 2,
          borderColor: COLOR_BUTTON_BORDER,
          opacity: 0.85,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span
          style={{ fontSize: 36, color: game.pressRight ? COLOR_BUTTON_TEXT_ACTIVE : COLOR_BUTTON_TEXT }}
        >
          R
        </span>
      </button>

      <button
        onTouchStart={() => game.buttonJumpDown()}
        onTouchEnd={() => game.buttonJumpUp()}
        style={{
          position: 'absolute',
          left: DISPLAY_W - MARGIN - JUMP_W,
          top: BUTTON_Y,
          width: JUMP_W,
          height: BUTTON_H,
          backgroundColor: game.pressJump ? COLOR_BUTTON_ACTIVE : COLOR_BUTTON,
          borderWidth: 2,
          borderColor: COLOR_BUTTON_BORDER,
          opacity: 0.85,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span
          style={{ fontSize: 36, color: game.pressJump ? COLOR_BUTTON_TEXT_ACTIVE : COLOR_BUTTON_TEXT }}
        >
          JUMP
        </span>
      </button>

      <button
        onClick={() => game.buttonRestart()}
        style={{
          position: 'absolute',
          left: DISPLAY_W - MARGIN - RESET_W,
          top: 44,
          width: RESET_W,
          height: RESET_H,
          backgroundColor: COLOR_BUTTON,
          borderWidth: 1,
          borderColor: COLOR_BUTTON_BORDER,
          opacity: 0.85,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ fontSize: 18, color: COLOR_BUTTON_TEXT }}>
          RESET
        </span>
      </button>
    </div>
  )
}
