import { FLAG_H, FLAG_W } from '../constants'
import { game } from '../stores/GameStore'

export function Goal() {
  return (
    <img
      src="assets/goal-flag.png"
      style={{
        position: 'absolute',
        left: game.goalX - 5,
        top: game.goalY,
        width: FLAG_W,
        height: FLAG_H
      }}
    />
  )
}
