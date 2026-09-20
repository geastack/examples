import { game } from '../stores/GameStore'
import { COLOR_HUD_BG, COLOR_HUD_GOLD, COLOR_HUD_TEXT, DISPLAY_W, HUD_H } from '../constants'

const COIN_TOTAL = 8

export function Hud() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: DISPLAY_W, height: HUD_H, overflow: 'hidden', backgroundColor: COLOR_HUD_BG }}>
      <span style={{ position: 'absolute', left: 10, top: 4, width: 128, height: 28, fontSize: 16, color: COLOR_HUD_TEXT }}>Sky Hop</span>
      <span style={{ position: 'absolute', left: 140, top: 10, width: 124, height: 18, fontSize: 12, color: COLOR_HUD_GOLD, textAlign: 'center' }}>
        {'Coins ' + game.score + '/' + COIN_TOTAL}
      </span>
      <span style={{ position: 'absolute', left: DISPLAY_W - 92, top: 10, width: 82, height: 18, fontSize: 12, color: COLOR_HUD_TEXT, textAlign: 'right' }}>
        {'Lives ' + game.lives}
      </span>
    </div>
  )
}
