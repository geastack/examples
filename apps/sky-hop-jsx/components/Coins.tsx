import { COIN_SIZE, COIN_RADIUS, COLOR_COIN, COLOR_COIN_RIM } from '../constants'
import { game } from '../stores/GameStore'

export function Coins() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 2196, height: 504 }}>
      {game.coins.map(coin => (
        <div
          style={{
            position: 'absolute',
            left: coin.x - COIN_RADIUS,
            top: coin.y - COIN_RADIUS,
            width: COIN_SIZE,
            height: COIN_SIZE,
            backgroundColor: COLOR_COIN,
            borderRadius: COIN_RADIUS,
            borderWidth: 1,
            borderColor: COLOR_COIN_RIM,
            display: coin.collected === 1 ? 'none' : 'block'
          }}
        />
      ))}
    </div>
  )
}
