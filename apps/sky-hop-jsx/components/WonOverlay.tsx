import { COLOR_HUD_GOLD, COLOR_HUD_TEXT, COLOR_OVERLAY_BG, COLOR_OVERLAY_BORDER, DISPLAY_W, GAME_VIEW_H } from '../constants'
import { game } from '../stores/GameStore'

export function WonOverlay() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: DISPLAY_W, height: GAME_VIEW_H, display: game.won === 1 ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }}>
      {game.won === 1 && (
        <div style={{ width: '316px', height: '116px', backgroundColor: COLOR_OVERLAY_BG, borderWidth: '2px', borderColor: COLOR_OVERLAY_BORDER, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 30, color: COLOR_HUD_TEXT, marginBottom: '14px' }}>Course Clear</span>
          <span style={{ fontSize: 16, color: COLOR_HUD_GOLD }}>{'Coins ' + game.score + '/8'}</span>
        </div>
      )}
    </div>
  )
}
