import { game } from '../stores/GameStore'

export function StatusText() {
  return (
    <span class='tic-status'>
      {game.status}
    </span>
  )
}
