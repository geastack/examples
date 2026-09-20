import { DISPLAY_W, GAME_VIEW_H, HUD_H } from '../constants'
import { game } from '../stores/GameStore'
import { Coins } from './Coins'
import { Enemies } from './Enemies'
import { Goal } from './Goal'
import { LevelTiles } from './LevelTiles'
import { Player } from './Player'

export function World() {
  return (
    <div style={{ position: 'absolute', left: 0, top: HUD_H, width: DISPLAY_W, height: GAME_VIEW_H - HUD_H, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -game.cameraX, top: -HUD_H, width: 2196, height: GAME_VIEW_H }}>
        <LevelTiles />
        <Goal />
        <Coins />
        <Enemies />
        <Player />
      </div>
    </div>
  )
}
