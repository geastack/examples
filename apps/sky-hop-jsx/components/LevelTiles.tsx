import { TILE } from '../constants'
import { game } from '../stores/GameStore'

export function LevelTiles() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 2196, height: 504 }}>
      {game.dirtTiles.map(tile => (
        <img src="assets/dirt-36.png" style={{ position: 'absolute', left: tile.x, top: tile.y, width: TILE, height: TILE }} />
      ))}
      {game.grassTiles.map(tile => (
        <img src="assets/grass-top-36.png" style={{ position: 'absolute', left: tile.x, top: tile.y, width: TILE, height: TILE }} />
      ))}
      {game.crateTiles.map(tile => (
        <img src="assets/crate-36.png" style={{ position: 'absolute', left: tile.x, top: tile.y, width: TILE, height: TILE }} />
      ))}
    </div>
  )
}
