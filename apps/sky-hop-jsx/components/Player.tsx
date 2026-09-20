import { PLAYER_SPRITE } from '../constants'
import { game } from '../stores/GameStore'

export function Player() {
  return (
    <div style={{ position: 'absolute', left: game.playerRenderLeft, top: game.playerRenderTop, width: PLAYER_SPRITE, height: PLAYER_SPRITE }}>
      <img
        src="assets/hero-idle-38.png"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: PLAYER_SPRITE,
          height: PLAYER_SPRITE,
          display: game.blink === 1 || game.playerRenderFrame === 1 ? 'none' : 'block'
        }}
      />
      <img
        src="assets/hero-walk-38.png"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: PLAYER_SPRITE,
          height: PLAYER_SPRITE,
          display: game.blink === 1 || game.playerRenderFrame !== 1 ? 'none' : 'block'
        }}
      />
    </div>
  )
}
