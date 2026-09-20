import { COLOR_WATER, DISPLAY_W, GAME_VIEW_H, HILL_BG_H, HORIZON_Y, WATER_H } from '../constants'

export function Background() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: DISPLAY_W, height: GAME_VIEW_H, overflow: 'hidden' }}>
      <img src="assets/hill-background.png" style={{ position: 'absolute', left: 0, top: 0, width: DISPLAY_W, height: HILL_BG_H }} />
      <div style={{ position: 'absolute', left: 0, top: HORIZON_Y, width: DISPLAY_W, height: WATER_H, backgroundColor: COLOR_WATER }} />
    </div>
  )
}
